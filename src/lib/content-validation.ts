import {
  ACTIVITY_ID_PATTERN,
  ACTIVITY_MODES,
  ANSWER_REVEALS,
  DIFFICULTIES,
  ID_PREFIX_BY_MODE,
  OUTPUTS,
  PURPOSES,
  REVIEW_STATES,
  SEGMENT_ID_PATTERN,
  modeSkill,
  type ActivityMode,
  type FieldError,
  type ReviewState,
  type Validated,
} from "./content-constants";
import { isYouTubeUrl, readEnum, readInt, readText, validateTranscript } from "./content-fields";
import { validateListeningQuestions, type ListeningQuestion } from "./listening-questions";
import { UNCATEGORIZED_TOPIC, isValidTopicKey } from "./topics";

export interface ActivityFields {
  id: string;
  mode: ActivityMode;
  title: string;
  slot: string | null;
  objective: string | null;
  durationMinutes: number | null;
  difficulty: (typeof DIFFICULTIES)[number] | null;
  promptText: string | null;
  feedbackGuide: string | null;
  rubricJson: Record<string, unknown> | null;
  answerReveal: (typeof ANSWER_REVEALS)[number] | null;
  purpose: (typeof PURPOSES)[number] | null;
  reviewState: ReviewState;
  segmentIds: string[];
  questions: ListeningQuestion[];
  output: (typeof OUTPUTS)[number] | null;
  topic: string | null;
}

/** Lỗi nếu tiền tố id không khớp mode (W5 ↔ writing, L5 ↔ listening...). */
export function checkIdMatchesMode(id: string, mode: string): FieldError | null {
  const prefix = ID_PREFIX_BY_MODE[mode as ActivityMode];
  if (!prefix) return null;
  const idPrefix = id.match(/^[A-Z]+/)?.[0];
  return idPrefix === prefix
    ? null
    : { field: "id", message: `id "${id}" không khớp mode "${mode}" (cần bắt đầu bằng ${prefix}, vd ${prefix}5)` };
}

export function validateTopic(v: unknown): string | null | FieldError {
  if (v === null || v === "") return null;
  if (typeof v !== "string") return { field: "topic", message: "phải là chuỗi slug" };
  const slug = v.trim();
  if (slug === UNCATEGORIZED_TOPIC || !isValidTopicKey(slug) || slug.length > 60) {
    return { field: "topic", message: 'slug không hợp lệ (chữ thường/số nối bằng "-", không dùng "uncategorized")' };
  }
  return slug;
}

/** Validate field activity. create: bắt buộc id/mode/title; patch: chỉ field có mặt. */
export function validateActivityFields(
  raw: unknown,
  kind: "create" | "patch"
): Validated<Partial<ActivityFields>> {
  const errors: FieldError[] = [];
  const value: Partial<ActivityFields> = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: [{ field: "body", message: "phải là JSON object" }], value };
  }
  const input = raw as Record<string, unknown>;
  const create = kind === "create";

  if (create) {
    if (typeof input.id !== "string" || !ACTIVITY_ID_PATTERN.test(input.id)) {
      errors.push({ field: "id", message: "bắt buộc, dạng W5 / R5 / S5 / L5 (IELTS: IW5, IR5, IS5, IL5)" });
    } else value.id = input.id;
  } else if ("id" in input) {
    errors.push({ field: "id", message: "id không được đổi sau khi tạo" });
  }

  const mode = readEnum(input, "mode", ACTIVITY_MODES, errors, { required: create });
  if (mode) value.mode = mode;
  const title = readText(input, "title", errors, { max: 200, required: create });
  if (typeof title === "string") value.title = title.trim();

  for (const key of ["slot", "objective", "promptText", "feedbackGuide"] as const) {
    const max = key === "promptText" || key === "feedbackGuide" ? 20000 : 500;
    const v = readText(input, key, errors, { max });
    if (v !== undefined) value[key] = v;
  }
  const duration = readInt(input, "durationMinutes", errors, { min: 1, max: 240 });
  if (duration !== undefined) value.durationMinutes = duration;

  const difficulty = readEnum(input, "difficulty", DIFFICULTIES, errors, { nullable: true });
  if (difficulty !== undefined) value.difficulty = difficulty;
  const purpose = readEnum(input, "purpose", PURPOSES, errors, { nullable: true });
  if (purpose !== undefined) value.purpose = purpose;
  const reveal = readEnum(input, "answerReveal", ANSWER_REVEALS, errors, { nullable: true });
  if (reveal !== undefined) value.answerReveal = reveal;
  const output = readEnum(input, "output", OUTPUTS, errors, { nullable: true });
  if (output !== undefined) value.output = output;

  const state = readEnum(input, "reviewState", REVIEW_STATES, errors);
  if (state) {
    if (create && state !== "draft") errors.push({ field: "reviewState", message: 'bài mới luôn là "draft"' });
    else value.reviewState = state;
  }

  if ("topic" in input && input.topic !== undefined) {
    const t = validateTopic(input.topic);
    if (typeof t === "object" && t !== null) errors.push(t);
    else value.topic = t;
  }

  if ("rubricJson" in input && input.rubricJson !== undefined) {
    const r = input.rubricJson;
    if (r === null) value.rubricJson = null;
    else if (typeof r === "object" && !Array.isArray(r)) value.rubricJson = r as Record<string, unknown>;
    else errors.push({ field: "rubricJson", message: "phải là object hoặc null" });
  }

  if ("segmentIds" in input && input.segmentIds !== undefined) {
    const ids = input.segmentIds;
    if (!Array.isArray(ids) || ids.length > 20) {
      errors.push({ field: "segmentIds", message: "phải là mảng id segment (tối đa 20)" });
    } else {
      const bad = ids.filter((s) => typeof s !== "string" || !SEGMENT_ID_PATTERN.test(s));
      if (bad.length) errors.push({ field: "segmentIds", message: `id không hợp lệ: ${bad.join(", ")} (dạng seg-xxx)` });
      else if (new Set(ids).size !== ids.length) errors.push({ field: "segmentIds", message: "có id bị trùng" });
      else value.segmentIds = ids as string[];
    }
  }

  if ("questions" in input && input.questions !== undefined) {
    const q = validateListeningQuestions(input.questions);
    if (!q.ok) q.errors.forEach((message) => errors.push({ field: "questions", message }));
    else value.questions = q.value;
  }

  return { ok: errors.length === 0, errors, value };
}

export interface SegmentInfo {
  id: string;
  textContent: string | null;
  transcriptContent: string | null;
  sourceUrl: string | null;
}

/**
 * Cổng "đủ nội dung để học" khi chuyển sang approved (lưu draft vẫn lỏng).
 * Segment ĐẦU TIÊN là segment màn học thực sự dùng.
 */
export function checkApprovalReadiness(
  a: Pick<ActivityFields, "mode" | "promptText" | "output" | "segmentIds"> & {
    questions: readonly unknown[];
  },
  segments: SegmentInfo[]
): FieldError[] {
  const errors: FieldError[] = [];
  const skill = modeSkill(a.mode);
  const first = segments.find((s) => s.id === a.segmentIds[0]);
  const blank = (s: string | null | undefined) => !s || !s.trim();

  if (segments.length !== a.segmentIds.length) {
    errors.push({ field: "segmentIds", message: "có segment không tồn tại" });
  }
  if ((skill === "writing" || skill === "speaking") && blank(a.promptText)) {
    errors.push({ field: "promptText", message: "cần đề bài trước khi duyệt" });
  }
  if (skill === "speaking" && a.output !== "audio") {
    errors.push({ field: "output", message: 'bài speaking cần output = "audio"' });
  }
  if (skill === "reading" && blank(first?.textContent)) {
    errors.push({ field: "segmentIds", message: "bài đọc cần segment đầu tiên có textContent" });
  }
  if (skill === "listening") {
    if (!first || blank(first.transcriptContent)) {
      errors.push({ field: "segmentIds", message: "bài nghe cần segment đầu tiên có transcript" });
    } else {
      validateTranscript(first.transcriptContent as string).forEach((e) => errors.push(e));
    }
    if (!first?.sourceUrl || !isYouTubeUrl(first.sourceUrl)) {
      errors.push({ field: "segmentIds", message: "bài nghe cần nguồn của segment đầu có url YouTube hợp lệ" });
    }
    if (a.questions.length < 1) {
      errors.push({ field: "questions", message: "bài nghe cần ít nhất 1 câu hỏi" });
    }
  }
  return errors;
}
