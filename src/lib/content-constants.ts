/**
 * Hằng số + kiểu dùng chung cho quản lý nội dung (server API và form admin).
 * File thuần — KHÔNG import DB. Có test đối chiếu với enum trong schema.ts.
 */

export const ACTIVITY_MODES = [
  "writing",
  "reading",
  "speaking",
  "listening",
  "ielts-writing",
  "ielts-reading",
  "ielts-speaking",
  "ielts-listening",
] as const;
export type ActivityMode = (typeof ACTIVITY_MODES)[number];

export const REVIEW_STATES = ["draft", "reviewing", "approved", "rejected", "retired"] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

export const DIFFICULTIES = ["trial", "beginner", "intermediate", "advanced"] as const;
export const ANSWER_REVEALS = ["none", "after_submit", "on_request"] as const;
export const OUTPUTS = ["text", "audio"] as const;
export const PURPOSES = ["baseline", "practice", "assessment"] as const;
export const SOURCE_KINDS = ["book", "video", "audio", "article", "self-authored"] as const;
export const LOCATOR_TYPES = ["page", "seconds"] as const;

/** Tiền tố id theo mode: W5, R5, S5, L5; IELTS dùng IW/IR/IS/IL. */
export const ID_PREFIX_BY_MODE: Record<ActivityMode, string> = {
  writing: "W",
  reading: "R",
  speaking: "S",
  listening: "L",
  "ielts-writing": "IW",
  "ielts-reading": "IR",
  "ielts-speaking": "IS",
  "ielts-listening": "IL",
};

export const ACTIVITY_ID_PATTERN = /^(IW|IR|IS|IL|W|R|S|L)[1-9]\d{0,3}$/;
export const SOURCE_ID_PATTERN = /^src-[a-z0-9]+(-[a-z0-9]+)*$/;
export const SEGMENT_ID_PATTERN = /^seg-[a-z0-9]+(-[a-z0-9]+)*$/;

export interface FieldError {
  field: string;
  message: string;
}

export interface Validated<T> {
  ok: boolean;
  errors: FieldError[];
  value: T;
}

/** Mode "ielts-listening" → skill "listening". */
export function modeSkill(mode: string): "writing" | "reading" | "speaking" | "listening" | null {
  const skill = mode.replace(/^ielts-/, "");
  return skill === "writing" || skill === "reading" || skill === "speaking" || skill === "listening"
    ? skill
    : null;
}

export function isOneOf<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === "string" && (list as readonly string[]).includes(v);
}
