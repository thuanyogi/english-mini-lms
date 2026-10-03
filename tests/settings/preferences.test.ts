import { describe, it, expect } from "vitest";
import {
  mergePreferences,
  preferencesPatchSchema,
} from "@/server/settings/preferences";

const NOW = new Date("2026-10-03T00:00:00.000Z");

describe("mergePreferences", () => {
  it("điền mặc định khi preferences rỗng", () => {
    const out = mergePreferences(null, {}, NOW);
    expect(out.remindEnabled).toBe(false);
    expect(out.remindTime).toBe("20:00");
    expect(out.tourCompleted).toBeUndefined();
    expect(out.updatedAt).toBe(NOW.toISOString());
  });

  it("chỉ đổi khoá được gửi, giữ nguyên khoá còn lại", () => {
    const out = mergePreferences(
      { remindEnabled: true, remindTime: "07:30", tourCompleted: true, custom: 1 },
      { remindTime: "21:15" },
      NOW,
    );
    expect(out.remindEnabled).toBe(true);
    expect(out.remindTime).toBe("21:15");
    expect(out.tourCompleted).toBe(true);
    expect(out.custom).toBe(1);
  });

  it("đặt tourCompleted=true không đụng tới cài đặt nhắc học", () => {
    const out = mergePreferences(
      { remindEnabled: true, remindTime: "06:00" },
      { tourCompleted: true },
      NOW,
    );
    expect(out.tourCompleted).toBe(true);
    expect(out.remindEnabled).toBe(true);
    expect(out.remindTime).toBe("06:00");
  });

  it("tourCompleted=false xoá hẳn khoá để hiện lại hướng dẫn", () => {
    const out = mergePreferences({ tourCompleted: true }, { tourCompleted: false }, NOW);
    expect("tourCompleted" in out).toBe(false);
  });

  it("không làm thay đổi object đầu vào", () => {
    const existing = { tourCompleted: true };
    mergePreferences(existing, { tourCompleted: false }, NOW);
    expect(existing).toEqual({ tourCompleted: true });
  });
});

describe("preferencesPatchSchema", () => {
  it("chấp nhận patch hợp lệ", () => {
    expect(
      preferencesPatchSchema.safeParse({ remindEnabled: true, remindTime: "08:05" }).success,
    ).toBe(true);
    expect(preferencesPatchSchema.safeParse({ tourCompleted: true }).success).toBe(true);
  });

  it("từ chối giờ sai định dạng hoặc kiểu sai", () => {
    expect(preferencesPatchSchema.safeParse({ remindTime: "25:00" }).success).toBe(false);
    expect(preferencesPatchSchema.safeParse({ remindTime: "8:5" }).success).toBe(false);
    expect(preferencesPatchSchema.safeParse({ tourCompleted: "yes" }).success).toBe(false);
  });
});
