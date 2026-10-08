import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, sources } from "@/db/schema";
import {
  createContentActivity,
  getContentActivity,
  updateContentActivity,
} from "@/server/admin/content-service";
import {
  createContentSegment,
  createContentSource,
  updateContentSource,
} from "@/server/admin/content-sources-service";
import { ContentError } from "@/server/admin/content-errors";
import { getApprovedActivities } from "@/server/library/service";
import { loadListeningQuestions } from "@/server/learning/listening-questions";
import { getCorrectOptionId, getTimestampReference } from "@/lib/listening-questions";

// Dữ liệu test dùng id cố định; dọn bằng reviewState=retired (không xoá vật lý).
const ACT = "L98";
const SRC = "src-test-nc2";
const SEG = "seg-test-nc2";

const questions = [
  {
    id: "q1",
    prompt: "Pick B",
    options: [
      { id: "A", text: "a" },
      { id: "B", text: "b" },
    ],
    correct_option_id: "B",
    timestamp_reference: 7,
  },
];

async function ignore409(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    if (!(e instanceof ContentError && e.status === 409)) throw e;
  }
}

async function expectContentError(fn: () => Promise<unknown>, status: number) {
  try {
    await fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ContentError);
    expect((e as ContentError).status).toBe(status);
    return e as ContentError;
  }
  throw new Error(`Expected ContentError ${status}`);
}

describe("Content service (DB): tạo → sửa → duyệt → gỡ", () => {
  afterAll(async () => {
    await db.update(activities).set({ reviewState: "retired" }).where(eq(activities.id, ACT));
    await db.update(sources).set({ reviewState: "retired" }).where(eq(sources.id, SRC));
  });

  it("tạo nguồn + segment (nhập thẳng transcript), nguồn video cần YouTube", async () => {
    await expectContentError(
      () => createContentSource({ id: SRC, title: "t", kind: "video", url: "https://example.com/x" }),
      422
    );
    await ignore409(() =>
      createContentSource({ id: SRC, title: "Test nguồn NC2", kind: "video", url: "https://www.youtube.com/watch?v=uVSiFJ85EtM" })
    );
    await ignore409(() =>
      createContentSegment({ id: SEG, sourceId: SRC, startSeconds: 0, endSeconds: 30, transcriptContent: "0|5|Hello there\n5|9|Second line" })
    );
    await expectContentError(() => createContentSegment({ id: "seg-no-source", sourceId: "src-khong-ton-tai" }), 422);
    await expectContentError(() => createContentSegment({ id: SEG, sourceId: SRC }), 409);
  });

  it("tạo bài nghe mới luôn là draft, questions mặc định []", async () => {
    await ignore409(() => createContentActivity({ id: ACT, mode: "listening", title: "Bài nghe test NC2", topic: "luyen-ielts" }));
    // Đưa về draft sạch cho lần chạy lại
    await db
      .update(activities)
      .set({ reviewState: "draft", segmentIds: [], questions: [] })
      .where(eq(activities.id, ACT));
    const a = await getContentActivity(ACT);
    expect(a?.reviewState).toBe("draft");
    expect(a?.questions).toEqual([]);
    expect(a?.topic).toBe("luyen-ielts");
  });

  it("từ chối id trùng (409), id sai tiền tố mode (422), mode ngoài enum (422)", async () => {
    await expectContentError(() => createContentActivity({ id: ACT, mode: "listening", title: "x" }), 409);
    await expectContentError(() => createContentActivity({ id: "R98", mode: "listening", title: "x" }), 422);
    await expectContentError(() => createContentActivity({ id: "L97", mode: "dancing", title: "x" }), 422);
  });

  it("questions sai schema bị từ chối kèm tên field; segment không tồn tại bị từ chối", async () => {
    const err = await expectContentError(
      () => updateContentActivity(ACT, { questions: [{ id: "q1", options: [] }] }),
      422
    );
    const msgs = err.details.map((d) => d.message).join("\n");
    expect(msgs).toContain("questions[0].prompt");
    expect(msgs).toContain("questions[0].correct_option_id");
    await expectContentError(() => updateContentActivity(ACT, { segmentIds: ["seg-khong-ton-tai"] }), 422);
  });

  it("không thể approve khi chưa đủ nội dung; đủ thì approve và hiện trong thư viện", async () => {
    const err = await expectContentError(() => updateContentActivity(ACT, { reviewState: "approved" }), 422);
    expect(err.details.map((d) => d.field)).toEqual(expect.arrayContaining(["segmentIds", "questions"]));

    const updated = await updateContentActivity(ACT, { segmentIds: [SEG], questions, reviewState: "approved" });
    expect(updated.reviewState).toBe("approved");

    const approved = await getApprovedActivities();
    expect(approved.map((x) => x.id)).toContain(ACT);
  });

  it("bài đã approved không thể bị sửa thành thiếu nội dung", async () => {
    await expectContentError(() => updateContentActivity(ACT, { questions: [] }), 422);
  });

  it("gỡ bằng retired: biến mất khỏi thư viện nhưng dữ liệu vẫn còn", async () => {
    await updateContentActivity(ACT, { reviewState: "retired" });
    const approved = await getApprovedActivities();
    expect(approved.map((x) => x.id)).not.toContain(ACT);
    expect(await getContentActivity(ACT)).not.toBeNull();
    const src = await updateContentSource(SRC, { reviewState: "retired" });
    expect(src.reviewState).toBe("retired");
  });
});

describe("Câu hỏi nghe: DB ưu tiên hơn file; chấm đọc đúng field yaml", () => {
  it("loadListeningQuestions: mảng DB thắng file; [] = không có câu; null → yaml", () => {
    expect(loadListeningQuestions({ questions })).toHaveLength(1);
    expect(loadListeningQuestions({ questions: [], questionsFile: "texts/l1-questions.yaml" })).toHaveLength(0);
    expect(loadListeningQuestions({ questions: null, questionsFile: "texts/l1-questions.yaml" }).length).toBeGreaterThan(0);
  });

  it("câu hỏi từ yaml có correct_option_id/timestamp_reference và đọc được đáp án", () => {
    const list = loadListeningQuestions({ questions: null, questionsFile: "texts/l1-questions.yaml" });
    expect(list.every((q) => getCorrectOptionId(q) !== "")).toBe(true);
    expect(getCorrectOptionId({ correct_option_id: "b" })).toBe("B");
    expect(getCorrectOptionId({ correct_option: "c" })).toBe("C"); // tên cũ vẫn chấp nhận
    expect(getTimestampReference({ timestamp_reference: 12 })).toBe(12);
    expect(getTimestampReference({ timestamp_seconds: 5 })).toBe(5);
  });
});
