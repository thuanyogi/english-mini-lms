/**
 * YouGlish helpers — logic thuần (không phụ thuộc DOM) để dễ test.
 */

/** Script widget chính thức của YouGlish (đã kiểm chứng: v4.3, expose global `YG`). */
export const YOUGLISH_SCRIPT_URL = "https://youglish.com/public/emb/widget.js";

/** Giới hạn độ dài truy vấn: YouGlish chỉ hữu ích với từ/cụm ngắn. */
export const YOUGLISH_MAX_QUERY_LENGTH = 80;

/**
 * Chuẩn hoá từ/cụm từ cần tra:
 * - gộp khoảng trắng, bỏ dấu câu thừa ở hai đầu
 * - cắt tối đa YOUGLISH_MAX_QUERY_LENGTH ký tự (cắt ở ranh giới từ nếu có thể)
 */
export function normalizeYouGlishQuery(raw: string | null | undefined): string {
  if (!raw) return "";

  const collapsed = raw.replace(/\s+/g, " ").trim();
  // Bỏ dấu câu ở hai đầu nhưng giữ dấu gạch nối/nháy bên trong từ (ví dụ "well-being", "don't")
  const stripped = collapsed
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/[^\p{L}\p{N}]+$/u, "");

  if (stripped.length <= YOUGLISH_MAX_QUERY_LENGTH) return stripped;

  const cut = stripped.slice(0, YOUGLISH_MAX_QUERY_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim();
}

/** Link mở YouGlish ở tab mới — luôn dùng được kể cả khi widget lỗi. */
export function buildYouGlishFallbackUrl(query: string | null | undefined): string {
  const q = normalizeYouGlishQuery(query);
  if (!q) return "https://youglish.com/";
  return `https://youglish.com/pronounce/${encodeURIComponent(q)}/english`;
}
