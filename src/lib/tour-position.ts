/**
 * Tính vị trí tooltip của hướng dẫn nhanh (guided tour) — hàm thuần để dễ test.
 * Toạ độ theo viewport (dùng với position: fixed).
 */

export interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TourSize {
  width: number;
  height: number;
}

export type TourPlacement = "top" | "bottom" | "left" | "right";

export interface TooltipPosition {
  top: number;
  left: number;
  /** Hướng thực tế sau khi tự đổi cho vừa màn hình; "center" khi không có target. */
  placement: TourPlacement | "center";
}

interface Options {
  /** Hình chữ nhật của phần tử cần chỉ vào; null → đặt giữa màn hình. */
  target: TourRect | null;
  tooltip: TourSize;
  viewport: TourSize;
  placement?: TourPlacement;
  /** Khoảng cách giữa target và tooltip. */
  gap?: number;
  /** Lề tối thiểu tới mép màn hình. */
  margin?: number;
}

const OPPOSITE: Record<TourPlacement, TourPlacement> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

function clamp(value: number, min: number, max: number): number {
  // Nếu tooltip lớn hơn vùng cho phép thì ưu tiên giữ mép trái/trên
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function place(
  placement: TourPlacement,
  target: TourRect,
  tooltip: TourSize,
  gap: number,
): { top: number; left: number } {
  switch (placement) {
    case "top":
      return {
        top: target.top - tooltip.height - gap,
        left: target.left + target.width / 2 - tooltip.width / 2,
      };
    case "bottom":
      return {
        top: target.top + target.height + gap,
        left: target.left + target.width / 2 - tooltip.width / 2,
      };
    case "left":
      return {
        top: target.top + target.height / 2 - tooltip.height / 2,
        left: target.left - tooltip.width - gap,
      };
    case "right":
      return {
        top: target.top + target.height / 2 - tooltip.height / 2,
        left: target.left + target.width + gap,
      };
  }
}

function fits(
  pos: { top: number; left: number },
  tooltip: TourSize,
  viewport: TourSize,
  margin: number,
): boolean {
  return (
    pos.top >= margin &&
    pos.left >= margin &&
    pos.top + tooltip.height <= viewport.height - margin &&
    pos.left + tooltip.width <= viewport.width - margin
  );
}

export function computeTooltipPosition({
  target,
  tooltip,
  viewport,
  placement = "bottom",
  gap = 12,
  margin = 12,
}: Options): TooltipPosition {
  const clampToViewport = (pos: { top: number; left: number }) => ({
    top: clamp(pos.top, margin, viewport.height - tooltip.height - margin),
    left: clamp(pos.left, margin, viewport.width - tooltip.width - margin),
  });

  if (!target) {
    return {
      ...clampToViewport({
        top: (viewport.height - tooltip.height) / 2,
        left: (viewport.width - tooltip.width) / 2,
      }),
      placement: "center",
    };
  }

  // Thứ tự thử: hướng mong muốn → đối diện → hai hướng còn lại
  const order: TourPlacement[] = [
    placement,
    OPPOSITE[placement],
    ...(["bottom", "top", "right", "left"] as TourPlacement[]).filter(
      (p) => p !== placement && p !== OPPOSITE[placement],
    ),
  ];

  for (const candidate of order) {
    const pos = place(candidate, target, tooltip, gap);
    // Với top/bottom cho phép lệch ngang (sẽ kẹp lại); với left/right cho phép lệch dọc
    const vertical = candidate === "top" || candidate === "bottom";
    const probe = vertical
      ? { top: pos.top, left: clamp(pos.left, margin, viewport.width - tooltip.width - margin) }
      : { top: clamp(pos.top, margin, viewport.height - tooltip.height - margin), left: pos.left };
    if (fits(probe, tooltip, viewport, margin)) {
      return { ...probe, placement: candidate };
    }
  }

  // Không hướng nào vừa (màn hình rất nhỏ): dùng hướng mong muốn rồi kẹp vào viewport
  return {
    ...clampToViewport(place(placement, target, tooltip, gap)),
    placement,
  };
}
