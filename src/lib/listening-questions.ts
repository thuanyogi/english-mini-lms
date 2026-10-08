/**
 * Schema câu hỏi nghe — khớp format `content/english-lab/texts/l*-questions.yaml`
 * (phần `questions:`), là format mà session.service / assessment.service đọc.
 * File thuần (không import DB/fs) — dùng được ở server và ở editor client.
 */

export interface ListeningQuestionOption {
  id: string;
  text: string;
}

export interface ListeningQuestion {
  id: string;
  prompt: string;
  options: ListeningQuestionOption[];
  correct_option_id: string;
  explanation?: string;
  /** Mốc giây trong audio để nghe lại khi trả lời sai. */
  timestamp_reference?: number;
}

export interface QuestionsValidation {
  ok: boolean;
  /** Mỗi lỗi nêu đường dẫn field, vd `questions[2].options[1].text: ...`. */
  errors: string[];
  value: ListeningQuestion[];
}

const QUESTION_KEYS = [
  "id",
  "prompt",
  "options",
  "correct_option_id",
  "explanation",
  "timestamp_reference",
] as const;
const OPTION_KEYS = ["id", "text"] as const;

/** Tên field hay gõ nhầm → gợi ý tên đúng. */
const FIELD_HINTS: Record<string, string> = {
  question: "prompt",
  answer: "correct_option_id",
  correct_option: "correct_option_id",
  correctOption: "correct_option_id",
  timestamp_seconds: "timestamp_reference",
  choices: "options",
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function checkUnknownKeys(
  obj: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  errors: string[]
): void {
  for (const key of Object.keys(obj)) {
    if (allowed.includes(key)) continue;
    const hint = FIELD_HINTS[key];
    errors.push(
      hint
        ? `${path}.${key}: field không hợp lệ — dùng "${hint}"`
        : `${path}.${key}: field không được hỗ trợ (cho phép: ${allowed.join(", ")})`
    );
  }
}

/** Validate đúng schema câu hỏi mà màn nghe + chấm điểm đọc. */
export function validateListeningQuestions(input: unknown): QuestionsValidation {
  const errors: string[] = [];
  const value: ListeningQuestion[] = [];

  if (!Array.isArray(input)) {
    return {
      ok: false,
      errors: ["questions: phải là một mảng (array) các câu hỏi"],
      value,
    };
  }

  const seenQuestionIds = new Set<string>();

  input.forEach((raw, i) => {
    const path = `questions[${i}]`;
    if (!isRecord(raw)) {
      errors.push(`${path}: phải là object { id, prompt, options, correct_option_id }`);
      return;
    }
    const errorsBefore = errors.length;
    checkUnknownKeys(raw, QUESTION_KEYS, path, errors);

    if (!isNonEmptyString(raw.id)) {
      errors.push(`${path}.id: thiếu hoặc rỗng (vd "q1")`);
    } else if (seenQuestionIds.has(raw.id.trim())) {
      errors.push(`${path}.id: "${raw.id}" bị trùng`);
    } else {
      seenQuestionIds.add(raw.id.trim());
    }

    if (!isNonEmptyString(raw.prompt)) {
      errors.push(`${path}.prompt: thiếu hoặc rỗng (nội dung câu hỏi)`);
    }

    const options: ListeningQuestionOption[] = [];
    if (!Array.isArray(raw.options)) {
      errors.push(`${path}.options: thiếu hoặc không phải mảng [{ id, text }]`);
    } else {
      if (raw.options.length < 2) {
        errors.push(`${path}.options: cần ít nhất 2 lựa chọn`);
      }
      const seenOptionIds = new Set<string>();
      raw.options.forEach((opt, j) => {
        const optPath = `${path}.options[${j}]`;
        if (!isRecord(opt)) {
          errors.push(`${optPath}: phải là object { id, text }`);
          return;
        }
        checkUnknownKeys(opt, OPTION_KEYS, optPath, errors);
        if (!isNonEmptyString(opt.id)) {
          errors.push(`${optPath}.id: thiếu hoặc rỗng (vd "A")`);
        } else if (seenOptionIds.has(opt.id.trim())) {
          errors.push(`${optPath}.id: "${opt.id}" bị trùng trong cùng câu`);
        } else {
          seenOptionIds.add(opt.id.trim());
        }
        if (!isNonEmptyString(opt.text)) {
          errors.push(`${optPath}.text: thiếu hoặc rỗng`);
        }
        if (isNonEmptyString(opt.id) && isNonEmptyString(opt.text)) {
          options.push({ id: opt.id.trim(), text: opt.text.trim() });
        }
      });
    }

    if (!isNonEmptyString(raw.correct_option_id)) {
      errors.push(`${path}.correct_option_id: thiếu hoặc rỗng (id của đáp án đúng, vd "B")`);
    } else if (
      Array.isArray(raw.options) &&
      !options.some((o) => o.id === raw.correct_option_id)
    ) {
      errors.push(
        `${path}.correct_option_id: "${raw.correct_option_id}" không khớp option nào (${options
          .map((o) => o.id)
          .join(", ") || "chưa có option hợp lệ"})`
      );
    }

    if (raw.explanation !== undefined && raw.explanation !== null) {
      if (typeof raw.explanation !== "string") {
        errors.push(`${path}.explanation: phải là chuỗi`);
      }
    }

    if (raw.timestamp_reference !== undefined && raw.timestamp_reference !== null) {
      const t = raw.timestamp_reference;
      if (typeof t !== "number" || !Number.isFinite(t) || t < 0) {
        errors.push(`${path}.timestamp_reference: phải là số giây ≥ 0`);
      }
    }

    if (errors.length === errorsBefore) {
      value.push({
        id: String(raw.id).trim(),
        prompt: String(raw.prompt).trim(),
        options,
        correct_option_id: String(raw.correct_option_id).trim(),
        ...(typeof raw.explanation === "string" && raw.explanation.trim()
          ? { explanation: raw.explanation.trim() }
          : {}),
        ...(typeof raw.timestamp_reference === "number"
          ? { timestamp_reference: raw.timestamp_reference }
          : {}),
      });
    }
  });

  return { ok: errors.length === 0, errors, value: errors.length === 0 ? value : [] };
}

/** Parse text JSON trong editor rồi validate; lỗi cú pháp JSON cũng trả về dạng errors. */
export function parseAndValidateQuestionsJson(text: string): QuestionsValidation {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, errors: [], value: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    return {
      ok: false,
      errors: [`JSON sai cú pháp: ${e instanceof Error ? e.message : String(e)}`],
      value: [],
    };
  }
  return validateListeningQuestions(parsed);
}

// ── Đọc câu hỏi từ nguồn dữ liệu bất kỳ (DB hoặc yaml) khi chấm điểm ──

/** Đáp án đúng; chấp nhận tên cũ `correct_option` để không vỡ dữ liệu cũ. */
export function getCorrectOptionId(q: Record<string, unknown>): string {
  const v = q.correct_option_id ?? q.correct_option;
  return typeof v === "string" ? v.trim().toUpperCase() : "";
}

/** Mốc giây nghe lại; chấp nhận tên cũ `timestamp_seconds`. */
export function getTimestampReference(q: Record<string, unknown>): number | undefined {
  const v = q.timestamp_reference ?? q.timestamp_seconds;
  return typeof v === "number" ? v : undefined;
}
