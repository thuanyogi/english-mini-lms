/**
 * Chủ đề (topic) của Thư viện bài học.
 * File thuần (không import DB) — dùng được ở cả server và client.
 * DB chỉ lưu key slug; tên + icon hiển thị nằm ở đây.
 */

/** Key dành riêng cho nhóm "Chưa phân loại" (bài có topic = NULL). */
export const UNCATEGORIZED_TOPIC = "uncategorized";

export interface TopicMeta {
  key: string;
  icon: string;
  name: string;
}

/** Danh sách chủ đề đã chốt — thứ tự này cũng là thứ tự hiển thị. */
export const KNOWN_TOPICS: readonly TopicMeta[] = [
  { key: "giao-tiep-hoi-nghi", icon: "🎤", name: "Hội nghị & email học thuật" },
  { key: "doc-sach-y-khoa", icon: "📚", name: "Đọc–dịch & kỹ thuật y khoa" },
  { key: "giao-tiep-lam-sang", icon: "🩺", name: "Giao tiếp lâm sàng" },
  { key: "luyen-ielts", icon: "📝", name: "Luyện IELTS" },
];

const TOPIC_KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Slug hợp lệ: chữ thường/số, nối bằng dấu gạch ngang. */
export function isValidTopicKey(key: string): boolean {
  return TOPIC_KEY_PATTERN.test(key);
}

/**
 * Trả về icon + tên hiển thị cho một topic key.
 * - null / "uncategorized" → "Chưa phân loại"
 * - key lạ (chưa có trong KNOWN_TOPICS) → dựng tên từ slug
 */
export function getTopicMeta(key: string | null | undefined): TopicMeta {
  if (!key || key === UNCATEGORIZED_TOPIC) {
    return { key: UNCATEGORIZED_TOPIC, icon: "🗂️", name: "Chưa phân loại" };
  }
  const known = KNOWN_TOPICS.find((t) => t.key === key);
  if (known) return known;

  const words = key.split("-").filter(Boolean).join(" ");
  const name = words.charAt(0).toUpperCase() + words.slice(1);
  return { key, icon: "📁", name: name || key };
}

/** Vị trí sắp xếp: chủ đề đã chốt theo thứ tự, chủ đề lạ ABC, chưa phân loại cuối. */
export function compareTopicKeys(a: string | null, b: string | null): number {
  const rank = (k: string | null): number => {
    if (k === null || k === UNCATEGORIZED_TOPIC) return Number.MAX_SAFE_INTEGER;
    const i = KNOWN_TOPICS.findIndex((t) => t.key === k);
    return i === -1 ? 1000 : i;
  };
  const diff = rank(a) - rank(b);
  if (diff !== 0) return diff;
  return (a ?? "").localeCompare(b ?? "");
}

/** Tạo slug topic từ tên gõ tay: bỏ dấu tiếng Việt, chữ thường, nối bằng dấu gạch ngang. */
export function slugifyTopic(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
