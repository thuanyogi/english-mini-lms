import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { activities, sourceSegments, sources } from "@/db/schema";
import { modeSkill, type FieldError, type ReviewState } from "@/lib/content-constants";
import {
  checkApprovalReadiness,
  checkIdMatchesMode,
  validateActivityFields,
  type ActivityFields,
  type SegmentInfo,
} from "@/lib/content-validation";
import { loadListeningQuestions } from "@/server/learning/listening-questions";
import { ContentError } from "./content-errors";

export type AdminContentActivity = typeof activities.$inferSelect;

/** Danh sách đầy đủ field; state = "all" hoặc một reviewState. */
export async function listContentActivities(state: string | null): Promise<AdminContentActivity[]> {
  const q = db.select().from(activities);
  const rows =
    state && state !== "all"
      ? await q.where(eq(activities.reviewState, state as ReviewState)).orderBy(desc(activities.updatedAt))
      : await q.orderBy(desc(activities.updatedAt));
  return rows;
}

export async function getContentActivity(id: string): Promise<AdminContentActivity | null> {
  const [row] = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
  return row ?? null;
}

/** Lấy segment (kèm url nguồn) theo thứ tự segmentIds; id không tồn tại sẽ vắng mặt. */
async function loadSegments(ids: string[]): Promise<SegmentInfo[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: sourceSegments.id,
      textContent: sourceSegments.textContent,
      transcriptContent: sourceSegments.transcriptContent,
      sourceUrl: sources.url,
    })
    .from(sourceSegments)
    .leftJoin(sources, eq(sourceSegments.sourceId, sources.id))
    .where(inArray(sourceSegments.id, ids));
  return ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is SegmentInfo => !!r);
}

function fail(errors: FieldError[]): never {
  throw new ContentError(422, "Dữ liệu không hợp lệ", errors);
}

export async function createContentActivity(raw: unknown): Promise<AdminContentActivity> {
  const v = validateActivityFields(raw, "create");
  if (!v.ok) fail(v.errors);
  const f = v.value as Partial<ActivityFields> & Pick<ActivityFields, "id" | "mode" | "title">;

  const idError = checkIdMatchesMode(f.id, f.mode);
  if (idError) fail([idError]);
  if (await getContentActivity(f.id)) {
    throw new ContentError(409, `Bài "${f.id}" đã tồn tại`, [{ field: "id", message: "đã tồn tại" }]);
  }
  const segmentIds = f.segmentIds ?? [];
  if ((await loadSegments(segmentIds)).length !== segmentIds.length) {
    fail([{ field: "segmentIds", message: "có segment không tồn tại" }]);
  }
  const skill = modeSkill(f.mode);
  if (f.questions?.length && skill !== "listening") {
    fail([{ field: "questions", message: "chỉ bài nghe mới có câu hỏi" }]);
  }

  const [row] = await db
    .insert(activities)
    .values({
      ...f,
      reviewState: "draft",
      segmentIds,
      // [] để bài nghe mới không rơi về câu hỏi mặc định của L1
      questions: skill === "listening" ? (f.questions ?? []) : (f.questions ?? null),
      output: f.output ?? (skill === "speaking" ? "audio" : "text"),
      difficulty: f.difficulty ?? "trial",
      answerReveal: f.answerReveal ?? "none",
    })
    .returning();
  return row;
}

export async function updateContentActivity(id: string, raw: unknown): Promise<AdminContentActivity> {
  const current = await getContentActivity(id);
  if (!current) throw new ContentError(404, `Không tìm thấy bài "${id}"`);

  const v = validateActivityFields(raw, "patch");
  if (!v.ok) fail(v.errors);
  const patch = v.value;
  const errors: FieldError[] = [];

  if (patch.mode) {
    const e = checkIdMatchesMode(id, patch.mode);
    if (e) errors.push(e);
  }
  const mode = patch.mode ?? current.mode;
  const segmentIds = patch.segmentIds ?? current.segmentIds ?? [];
  const questions = patch.questions ?? (Array.isArray(current.questions) ? current.questions : null);
  if (patch.questions?.length && modeSkill(mode) !== "listening") {
    errors.push({ field: "questions", message: "chỉ bài nghe mới có câu hỏi" });
  }
  const segments = await loadSegments(segmentIds);
  if (patch.segmentIds && segments.length !== segmentIds.length) {
    errors.push({ field: "segmentIds", message: "có segment không tồn tại" });
  }

  // Bài approved (hoặc sắp approved) phải luôn đủ nội dung — sửa không được làm hỏng bài đang học
  const finalState = patch.reviewState ?? current.reviewState;
  if (finalState === "approved" && errors.length === 0) {
    const finalActivity = { ...current, ...patch, questions, segmentIds };
    errors.push(
      ...checkApprovalReadiness(
        {
          mode,
          promptText: finalActivity.promptText ?? null,
          output: (finalActivity.output as ActivityFields["output"]) ?? null,
          segmentIds,
          questions: modeSkill(mode) === "listening" ? loadListeningQuestions(finalActivity) : [],
        },
        segments
      )
    );
  }
  if (errors.length) fail(errors);

  const [row] = await db
    .update(activities)
    .set({ ...patch, segmentIds })
    .where(eq(activities.id, id))
    .returning();
  return row;
}
