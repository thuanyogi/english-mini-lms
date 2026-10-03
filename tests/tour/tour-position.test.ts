import { describe, it, expect } from "vitest";
import { computeTooltipPosition } from "@/lib/tour-position";

const viewport = { width: 1000, height: 700 };
const tooltip = { width: 300, height: 150 };

describe("computeTooltipPosition", () => {
  it("không có target → căn giữa màn hình", () => {
    const pos = computeTooltipPosition({ target: null, tooltip, viewport });
    expect(pos.placement).toBe("center");
    expect(pos.left).toBe(350);
    expect(pos.top).toBe(275);
  });

  it("đặt bên dưới target khi đủ chỗ, căn giữa theo chiều ngang", () => {
    const target = { top: 100, left: 400, width: 200, height: 40 };
    const pos = computeTooltipPosition({ target, tooltip, viewport, placement: "bottom" });
    expect(pos.placement).toBe("bottom");
    expect(pos.top).toBe(100 + 40 + 12);
    expect(pos.left).toBe(400 + 100 - 150);
  });

  it("đổi sang phía trên khi bên dưới không đủ chỗ", () => {
    const target = { top: 600, left: 400, width: 200, height: 60 };
    const pos = computeTooltipPosition({ target, tooltip, viewport, placement: "bottom" });
    expect(pos.placement).toBe("top");
    expect(pos.top).toBe(600 - 150 - 12);
  });

  it("kẹp tooltip trong viewport khi target sát mép trái", () => {
    const target = { top: 100, left: 0, width: 40, height: 40 };
    const pos = computeTooltipPosition({ target, tooltip, viewport, placement: "bottom" });
    expect(pos.left).toBeGreaterThanOrEqual(12);
    expect(pos.left + tooltip.width).toBeLessThanOrEqual(viewport.width - 12);
  });

  it("đặt bên phải sidebar rồi tự đổi hướng nếu hết chỗ", () => {
    const sidebarItem = { top: 200, left: 12, width: 216, height: 44 };
    const right = computeTooltipPosition({
      target: sidebarItem,
      tooltip,
      viewport,
      placement: "right",
    });
    expect(right.placement).toBe("right");
    expect(right.left).toBe(12 + 216 + 12);

    const nearRightEdge = { top: 200, left: 900, width: 90, height: 44 };
    const flipped = computeTooltipPosition({
      target: nearRightEdge,
      tooltip,
      viewport,
      placement: "right",
    });
    expect(flipped.placement).toBe("left");
  });

  it("màn hình điện thoại hẹp: luôn nằm gọn trong viewport", () => {
    const phone = { width: 390, height: 780 };
    const narrowTooltip = { width: 366, height: 170 };
    const target = { top: 700, left: 20, width: 70, height: 56 };
    const pos = computeTooltipPosition({
      target,
      tooltip: narrowTooltip,
      viewport: phone,
      placement: "top",
    });
    expect(pos.left).toBeGreaterThanOrEqual(12);
    expect(pos.left + narrowTooltip.width).toBeLessThanOrEqual(phone.width - 12);
    expect(pos.top).toBeGreaterThanOrEqual(12);
    expect(pos.top + narrowTooltip.height).toBeLessThanOrEqual(phone.height - 12);
  });

  it("tooltip lớn hơn viewport vẫn trả về toạ độ hợp lệ (không NaN)", () => {
    const pos = computeTooltipPosition({
      target: { top: 10, left: 10, width: 10, height: 10 },
      tooltip: { width: 500, height: 500 },
      viewport: { width: 300, height: 300 },
    });
    expect(Number.isFinite(pos.top)).toBe(true);
    expect(Number.isFinite(pos.left)).toBe(true);
  });
});
