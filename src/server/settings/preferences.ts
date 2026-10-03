import { z } from "zod";

/**
 * Các khoá cài đặt người học được phép PATCH qua /api/v1/settings/preferences.
 * Chỉ khoá nào được gửi lên mới bị thay đổi (các khoá khác giữ nguyên).
 */
export const preferencesPatchSchema = z.object({
  remindEnabled: z.boolean().optional(),
  remindTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ nhắc phải có dạng HH:mm")
    .optional(),
  /** true = đã xem/bỏ qua hướng dẫn; false = xoá cờ để xem lại hướng dẫn. */
  tourCompleted: z.boolean().optional(),
});

export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;

const DEFAULT_REMIND_TIME = "20:00";

/**
 * Gộp patch vào preferences hiện có (hàm thuần, dễ test).
 * - Luôn đảm bảo có remindEnabled/remindTime (mặc định false / 20:00) như trước đây.
 * - tourCompleted: true → ghi cờ; false → xoá khoá (để lần sau hiện lại hướng dẫn).
 * - Giữ nguyên mọi khoá lạ trong preferences hiện có.
 */
export function mergePreferences(
  existing: Record<string, unknown> | null | undefined,
  patch: PreferencesPatch,
  now: Date = new Date(),
): Record<string, unknown> {
  const base = { ...(existing ?? {}) };

  const merged: Record<string, unknown> = {
    ...base,
    remindEnabled:
      patch.remindEnabled !== undefined
        ? patch.remindEnabled
        : typeof base.remindEnabled === "boolean"
          ? base.remindEnabled
          : false,
    remindTime:
      patch.remindTime !== undefined
        ? patch.remindTime
        : typeof base.remindTime === "string" && base.remindTime
          ? base.remindTime
          : DEFAULT_REMIND_TIME,
    updatedAt: now.toISOString(),
  };

  if (patch.tourCompleted === true) {
    merged.tourCompleted = true;
  } else if (patch.tourCompleted === false) {
    delete merged.tourCompleted;
  }

  return merged;
}
