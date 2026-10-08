import { describe, it, expect } from "vitest";
import { activityModeEnum, difficultyEnum, reviewStateEnum, answerRevealEnum } from "@/db/schema";
import {
  ACTIVITY_MODES,
  ANSWER_REVEALS,
  DIFFICULTIES,
  REVIEW_STATES,
} from "@/lib/content-constants";
import { isYouTubeUrl, validateTranscript } from "@/lib/content-fields";
import {
  validateSegmentFields,
  validateSourceFields,
} from "@/lib/content-source-validation";
import {
  checkApprovalReadiness,
  checkIdMatchesMode,
  validateActivityFields,
} from "@/lib/content-validation";
import {
  parseAndValidateQuestionsJson,
  validateListeningQuestions,
} from "@/lib/listening-questions";

const goodQuestion = {
  id: "q1",
  prompt: "What is it?",
  options: [
    { id: "A", text: "One" },
    { id: "B", text: "Two" },
  ],
  correct_option_id: "B",
};

describe("content-constants đồng bộ với schema.ts", () => {
  it("enum trong lib khớp enum Postgres", () => {
    expect([...ACTIVITY_MODES]).toEqual([...activityModeEnum.enumValues]);
    expect([...REVIEW_STATES]).toEqual([...reviewStateEnum.enumValues]);
    expect([...DIFFICULTIES]).toEqual([...difficultyEnum.enumValues]);
    expect([...ANSWER_REVEALS]).toEqual([...answerRevealEnum.enumValues]);
  });
});

describe("validateActivityFields", () => {
  it("chấp nhận id theo pattern W5/R5/L5/S5 và IELTS", () => {
    for (const [id, mode] of [
      ["W5", "writing"],
      ["R5", "reading"],
      ["L5", "listening"],
      ["S5", "speaking"],
      ["IL2", "ielts-listening"],
    ]) {
      const r = validateActivityFields({ id, mode, title: "t" }, "create");
      expect(r.ok, `${id}: ${JSON.stringify(r.errors)}`).toBe(true);
    }
  });

  it("từ chối id sai pattern, mode/reviewState ngoài enum", () => {
    const r = validateActivityFields(
      { id: "X9", mode: "dancing", title: "t", reviewState: "deleted" },
      "create"
    );
    expect(r.ok).toBe(false);
    const fields = r.errors.map((e) => e.field);
    expect(fields).toContain("id");
    expect(fields).toContain("mode");
    expect(fields).toContain("reviewState");
  });

  it("id phải khớp tiền tố mode", () => {
    expect(checkIdMatchesMode("W5", "writing")).toBeNull();
    expect(checkIdMatchesMode("W5", "listening")?.field).toBe("id");
    expect(checkIdMatchesMode("IL5", "ielts-listening")).toBeNull();
  });

  it("bài mới chỉ được là draft; id không đổi khi PATCH", () => {
    expect(validateActivityFields({ id: "W5", mode: "writing", title: "t", reviewState: "approved" }, "create").ok).toBe(false);
    expect(validateActivityFields({ id: "W6" }, "patch").errors[0].field).toBe("id");
  });

  it("topic phải là slug hợp lệ, không dùng uncategorized", () => {
    expect(validateActivityFields({ topic: "Siêu âm" }, "patch").ok).toBe(false);
    expect(validateActivityFields({ topic: "uncategorized" }, "patch").ok).toBe(false);
    expect(validateActivityFields({ topic: "sieu-am-tim" }, "patch").value.topic).toBe("sieu-am-tim");
    expect(validateActivityFields({ topic: null }, "patch").value.topic).toBeNull();
  });

  it("PATCH một phần chỉ trả field có mặt", () => {
    const r = validateActivityFields({ title: "Mới" }, "patch");
    expect(r.ok).toBe(true);
    expect(Object.keys(r.value)).toEqual(["title"]);
  });

  it("segmentIds phải là seg-xxx và không trùng", () => {
    expect(validateActivityFields({ segmentIds: ["seg-a", "seg-a"] }, "patch").ok).toBe(false);
    expect(validateActivityFields({ segmentIds: ["bad id"] }, "patch").ok).toBe(false);
    expect(validateActivityFields({ segmentIds: ["seg-a", "seg-b"] }, "patch").ok).toBe(true);
  });
});

describe("validateListeningQuestions — đúng schema màn nghe đọc", () => {
  it("nhận đúng format yaml hiện có", () => {
    const r = validateListeningQuestions([{ ...goodQuestion, explanation: "x", timestamp_reference: 12 }]);
    expect(r.ok).toBe(true);
    expect(r.value[0].correct_option_id).toBe("B");
  });

  it("JSON đúng cú pháp nhưng thiếu prompt → báo đúng tên field", () => {
    const r = parseAndValidateQuestionsJson(JSON.stringify([{ ...goodQuestion, prompt: undefined }]));
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toContain("questions[0].prompt");
  });

  it("gợi ý tên đúng khi dùng question/answer", () => {
    const r = validateListeningQuestions([{ id: "q1", question: "Hi?", answer: "A", options: [] }]);
    const text = r.errors.join("\n");
    expect(text).toContain('questions[0].question');
    expect(text).toContain('"prompt"');
    expect(text).toContain('"correct_option_id"');
  });

  it("correct_option_id phải khớp option; option id không trùng; ≥2 options", () => {
    const bad = validateListeningQuestions([
      { ...goodQuestion, correct_option_id: "Z" },
      { ...goodQuestion, id: "q2", options: [{ id: "A", text: "x" }, { id: "A", text: "y" }] },
      { ...goodQuestion, id: "q3", options: [{ id: "A", text: "x" }] },
    ]);
    const text = bad.errors.join("\n");
    expect(text).toContain("questions[0].correct_option_id");
    expect(text).toContain("questions[1].options[1].id");
    expect(text).toContain("questions[2].options");
  });

  it("báo lỗi option thiếu text, id câu trùng, timestamp sai", () => {
    const r = validateListeningQuestions([
      { ...goodQuestion, options: [{ id: "A", text: "" }, { id: "B", text: "ok" }], timestamp_reference: -3 },
      { ...goodQuestion },
      { ...goodQuestion },
    ]);
    const text = r.errors.join("\n");
    expect(text).toContain("questions[0].options[0].text");
    expect(text).toContain("questions[0].timestamp_reference");
    expect(text).toContain("questions[2].id");
  });

  it("JSON sai cú pháp và không phải mảng đều bị báo", () => {
    expect(parseAndValidateQuestionsJson("[{").ok).toBe(false);
    expect(parseAndValidateQuestionsJson('{"a":1}').errors[0]).toContain("mảng");
    expect(parseAndValidateQuestionsJson("").ok).toBe(true);
  });
});

describe("transcript & YouTube", () => {
  it("transcript hợp lệ và lỗi nêu số dòng", () => {
    expect(validateTranscript("0|5|Hello\n5|9|World | pipe")).toEqual([]);
    const errs = validateTranscript("0|5|Hello\nabc|9|x\n9|3|y");
    expect(errs[0].message).toContain("dòng 2");
    expect(errs[1].message).toContain("dòng 3");
  });

  it("nhận link YouTube như màn nghe, từ chối link khác", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=uVSiFJ85EtM")).toBe(true);
    expect(isYouTubeUrl("https://youtu.be/uVSiFJ85EtM")).toBe(true);
    expect(isYouTubeUrl("https://www.youtube.com/embed/uVSiFJ85EtM")).toBe(true);
    expect(isYouTubeUrl("https://vimeo.com/12345678901")).toBe(false);
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=short")).toBe(false);
  });
});

describe("source & segment validation", () => {
  it("source id src-xxx; video bắt buộc URL YouTube", () => {
    expect(validateSourceFields({ id: "src-ok-1", title: "t", kind: "video", url: "https://youtu.be/uVSiFJ85EtM" }, "create").ok).toBe(true);
    expect(validateSourceFields({ id: "bad", title: "t", kind: "video" }, "create").errors[0].field).toBe("id");
    expect(validateSourceFields({ id: "src-x", title: "t", kind: "video", url: "https://example.com/a" }, "create").errors[0].field).toBe("url");
    expect(validateSourceFields({ id: "src-x", title: "t", kind: "movie" }, "create").errors[0].field).toBe("kind");
  });

  it("PATCH url kiểm tra chéo theo kind hiện có", () => {
    const r = validateSourceFields({ url: "https://example.com" }, "patch", { kind: "video", url: null });
    expect(r.ok).toBe(false);
  });

  it("segment: id seg-xxx, end > start, transcript đúng dòng", () => {
    expect(validateSegmentFields({ id: "seg-a", sourceId: "src-a", startSeconds: 5, endSeconds: 5 }, "create").ok).toBe(false);
    expect(validateSegmentFields({ id: "seg-a", sourceId: "src-a", transcriptContent: "oops" }, "create").ok).toBe(false);
    expect(validateSegmentFields({ id: "seg-a", sourceId: "src-a", startSeconds: 1, endSeconds: 9, transcriptContent: "1|9|ok" }, "create").ok).toBe(true);
  });
});

describe("checkApprovalReadiness", () => {
  const seg = { id: "seg-a", textContent: "text", transcriptContent: "0|5|hi", sourceUrl: "https://youtu.be/uVSiFJ85EtM" };
  const base = { promptText: null, output: null, segmentIds: ["seg-a"], questions: [] as unknown[] };

  it("reading cần textContent ở segment đầu", () => {
    expect(checkApprovalReadiness({ ...base, mode: "reading" }, [seg])).toEqual([]);
    expect(checkApprovalReadiness({ ...base, mode: "reading" }, [{ ...seg, textContent: "" }])).toHaveLength(1);
  });

  it("listening cần transcript + url YouTube + ≥1 câu hỏi", () => {
    expect(checkApprovalReadiness({ ...base, mode: "listening", questions: [goodQuestion] }, [seg])).toEqual([]);
    const errs = checkApprovalReadiness({ ...base, mode: "listening" }, [{ ...seg, sourceUrl: null }]);
    expect(errs.map((e) => e.field)).toEqual(expect.arrayContaining(["segmentIds", "questions"]));
  });

  it("writing cần promptText; speaking cần thêm output=audio", () => {
    expect(checkApprovalReadiness({ ...base, mode: "writing", segmentIds: [] }, [])).toHaveLength(1);
    expect(checkApprovalReadiness({ ...base, mode: "writing", promptText: "Viết", segmentIds: [] }, [])).toEqual([]);
    expect(checkApprovalReadiness({ ...base, mode: "speaking", promptText: "Nói", output: "text", segmentIds: [] }, [])[0].field).toBe("output");
  });
});
