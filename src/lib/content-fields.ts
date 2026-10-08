import { isOneOf, type FieldError } from "./content-constants";

type Input = Record<string, unknown>;

/** `undefined` = field không có trong request (giữ nguyên); `null` = xoá giá trị. */
export function readText(
  input: Input,
  key: string,
  errors: FieldError[],
  opts: { max: number; required?: boolean }
): string | null | undefined {
  if (!(key in input) || input[key] === undefined) {
    if (opts.required) errors.push({ field: key, message: "bắt buộc" });
    return undefined;
  }
  const v = input[key];
  if (v === null || (typeof v === "string" && v.trim() === "")) {
    if (opts.required) errors.push({ field: key, message: "không được để trống" });
    return null;
  }
  if (typeof v !== "string") {
    errors.push({ field: key, message: "phải là chuỗi" });
    return undefined;
  }
  if (v.length > opts.max) {
    errors.push({ field: key, message: `quá dài (tối đa ${opts.max} ký tự)` });
    return undefined;
  }
  return v;
}

export function readInt(
  input: Input,
  key: string,
  errors: FieldError[],
  opts: { min: number; max: number }
): number | null | undefined {
  if (!(key in input) || input[key] === undefined) return undefined;
  const v = input[key];
  if (v === null || v === "") return null;
  if (typeof v !== "number" || !Number.isInteger(v) || v < opts.min || v > opts.max) {
    errors.push({ field: key, message: `phải là số nguyên từ ${opts.min} đến ${opts.max}` });
    return undefined;
  }
  return v;
}

export function readEnum<T extends string>(
  input: Input,
  key: string,
  list: readonly T[],
  errors: FieldError[],
  opts: { required?: boolean; nullable?: boolean } = {}
): T | null | undefined {
  if (!(key in input) || input[key] === undefined) {
    if (opts.required) errors.push({ field: key, message: "bắt buộc" });
    return undefined;
  }
  const v = input[key];
  if (v === null && opts.nullable) return null;
  if (!isOneOf(list, v)) {
    errors.push({ field: key, message: `phải thuộc: ${list.join(", ")}` });
    return undefined;
  }
  return v;
}

/** Parse transcript `start|end|text` mỗi dòng (cùng format màn nghe đọc); lỗi nêu số dòng. */
export function validateTranscript(text: string): FieldError[] {
  const errors: FieldError[] = [];
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const parts = line.split("|");
    const start = Number(parts[0]);
    const end = Number(parts[1]);
    const at = `dòng ${i + 1}`;
    if (parts.length < 3 || !parts.slice(2).join("|").trim()) {
      errors.push({ field: "transcriptContent", message: `${at}: cần dạng "giây_bắt_đầu|giây_kết_thúc|nội dung"` });
    } else if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < 0) {
      errors.push({ field: "transcriptContent", message: `${at}: giây bắt đầu/kết thúc phải là số nguyên ≥ 0` });
    } else if (end <= start) {
      errors.push({ field: "transcriptContent", message: `${at}: giây kết thúc phải lớn hơn giây bắt đầu` });
    }
  });
  return errors;
}

/** Cùng regexp với youtube-player.tsx: video id phải đúng 11 ký tự. */
export function isYouTubeUrl(url: string): boolean {
  const m = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return !!m && /^[\w-]{11}$/.test(m[2]) && /(^|\/\/)(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(url);
}
