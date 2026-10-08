import {
  LOCATOR_TYPES,
  REVIEW_STATES,
  SEGMENT_ID_PATTERN,
  SOURCE_ID_PATTERN,
  SOURCE_KINDS,
  type FieldError,
  type ReviewState,
  type Validated,
} from "./content-constants";
import { isYouTubeUrl, readEnum, readInt, readText, validateTranscript } from "./content-fields";

export interface SourceFields {
  id: string;
  title: string;
  kind: (typeof SOURCE_KINDS)[number];
  permission: string | null;
  locatorType: (typeof LOCATOR_TYPES)[number] | null;
  url: string | null;
  reviewState: ReviewState;
  notes: string | null;
}

export interface SegmentFields {
  id: string;
  sourceId: string;
  page: number | null;
  startSeconds: number | null;
  endSeconds: number | null;
  textContent: string | null;
  transcriptContent: string | null;
  verifiedTranscript: boolean;
  language: string | null;
}

function asInput(raw: unknown): Record<string, unknown> | null {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

const BODY_ERROR = { ok: false, errors: [{ field: "body", message: "phải là JSON object" }] };

/** `current`: giá trị hiện có (khi PATCH) để kiểm tra chéo kind ↔ url. */
export function validateSourceFields(
  raw: unknown,
  kind: "create" | "patch",
  current?: Pick<SourceFields, "kind" | "url">
): Validated<Partial<SourceFields>> {
  const input = asInput(raw);
  if (!input) return { ...BODY_ERROR, value: {} };
  const errors: FieldError[] = [];
  const value: Partial<SourceFields> = {};
  const create = kind === "create";

  if (create) {
    if (typeof input.id !== "string" || !SOURCE_ID_PATTERN.test(input.id)) {
      errors.push({ field: "id", message: "bắt buộc, dạng src-ten-nguon (chữ thường/số, nối bằng -)" });
    } else value.id = input.id;
  } else if ("id" in input) {
    errors.push({ field: "id", message: "id không được đổi sau khi tạo" });
  }

  const title = readText(input, "title", errors, { max: 300, required: create });
  if (typeof title === "string") value.title = title.trim();
  const srcKind = readEnum(input, "kind", SOURCE_KINDS, errors, { required: create });
  if (srcKind) value.kind = srcKind;
  const permission = readText(input, "permission", errors, { max: 60 });
  if (permission !== undefined) value.permission = permission;
  const locator = readEnum(input, "locatorType", LOCATOR_TYPES, errors, { nullable: true });
  if (locator !== undefined) value.locatorType = locator;
  const notes = readText(input, "notes", errors, { max: 5000 });
  if (notes !== undefined) value.notes = notes;
  const state = readEnum(input, "reviewState", REVIEW_STATES, errors);
  if (state) {
    if (create && state !== "draft") errors.push({ field: "reviewState", message: 'nguồn mới luôn là "draft"' });
    else value.reviewState = state;
  }

  const url = readText(input, "url", errors, { max: 500 });
  if (url !== undefined) value.url = url === null ? null : url.trim();

  // Kiểm tra chéo: video → url phải là YouTube (màn nghe nhúng YouTube player)
  const finalKind = value.kind ?? current?.kind;
  const finalUrl = value.url !== undefined ? value.url : current?.url;
  if (finalUrl) {
    if (finalKind === "video" && !isYouTubeUrl(finalUrl)) {
      errors.push({ field: "url", message: "nguồn video cần link YouTube hợp lệ (watch?v=…, youtu.be/…, embed/…; id 11 ký tự)" });
    } else if (finalKind !== "video" && !/^https?:\/\/\S+$/.test(finalUrl)) {
      errors.push({ field: "url", message: "phải là link http(s)" });
    }
  }
  return { ok: errors.length === 0, errors, value };
}

/** `current`: giá trị hiện có (khi PATCH) để kiểm tra chéo start < end. */
export function validateSegmentFields(
  raw: unknown,
  kind: "create" | "patch",
  current?: Pick<SegmentFields, "startSeconds" | "endSeconds">
): Validated<Partial<SegmentFields>> {
  const input = asInput(raw);
  if (!input) return { ...BODY_ERROR, value: {} };
  const errors: FieldError[] = [];
  const value: Partial<SegmentFields> = {};
  const create = kind === "create";

  if (create) {
    if (typeof input.id !== "string" || !SEGMENT_ID_PATTERN.test(input.id)) {
      errors.push({ field: "id", message: "bắt buộc, dạng seg-ten-doan (chữ thường/số, nối bằng -)" });
    } else value.id = input.id;
    if (typeof input.sourceId !== "string" || !SOURCE_ID_PATTERN.test(input.sourceId)) {
      errors.push({ field: "sourceId", message: "bắt buộc, dạng src-xxx (nguồn phải tồn tại)" });
    } else value.sourceId = input.sourceId;
  } else if ("id" in input || "sourceId" in input) {
    errors.push({ field: "id", message: "id và sourceId không được đổi sau khi tạo" });
  }

  const page = readInt(input, "page", errors, { min: 1, max: 100000 });
  if (page !== undefined) value.page = page;
  const start = readInt(input, "startSeconds", errors, { min: 0, max: 86400 });
  if (start !== undefined) value.startSeconds = start;
  const end = readInt(input, "endSeconds", errors, { min: 0, max: 86400 });
  if (end !== undefined) value.endSeconds = end;
  const text = readText(input, "textContent", errors, { max: 100000 });
  if (text !== undefined) value.textContent = text;
  const lang = readText(input, "language", errors, { max: 10 });
  if (lang !== undefined) value.language = lang;
  const transcript = readText(input, "transcriptContent", errors, { max: 100000 });
  if (transcript !== undefined) {
    value.transcriptContent = transcript;
    if (transcript) errors.push(...validateTranscript(transcript));
  }
  if ("verifiedTranscript" in input && input.verifiedTranscript !== undefined) {
    if (typeof input.verifiedTranscript === "boolean") value.verifiedTranscript = input.verifiedTranscript;
    else errors.push({ field: "verifiedTranscript", message: "phải là true/false" });
  }

  const s = value.startSeconds !== undefined ? value.startSeconds : current?.startSeconds;
  const e = value.endSeconds !== undefined ? value.endSeconds : current?.endSeconds;
  if (s != null && e != null && e <= s) {
    errors.push({ field: "endSeconds", message: "phải lớn hơn startSeconds" });
  }
  return { ok: errors.length === 0, errors, value };
}
