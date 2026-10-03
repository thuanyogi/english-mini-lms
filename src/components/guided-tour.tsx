"use client";

import { useEffect, useRef, useState } from "react";
import {
  computeTooltipPosition,
  type TourRect,
  type TourSize,
} from "@/lib/tour-position";
import type { TourStep } from "./tour-steps";

/** Tìm phần tử đích tối đa 12 × 250ms (3 giây) — trang có thể còn đang tải dữ liệu. */
const MAX_FIND_ATTEMPTS = 12;
const FIND_INTERVAL_MS = 250;
const SPOTLIGHT_PADDING = 6;
const TOOLTIP_MAX_WIDTH = 340;
const VIEWPORT_MARGIN = 12;
const DESKTOP_MIN_WIDTH = 1024;

/**
 * Cùng một data-tour có thể xuất hiện 2 lần (thanh dưới mobile + sidebar desktop),
 * chỉ một trong hai đang hiển thị → chọn phần tử có kích thước > 0.
 */
function findVisibleTarget(name: string): HTMLElement | null {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`),
  );
  for (const node of nodes) {
    const r = node.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return node;
  }
  return null;
}

interface GuidedTourProps {
  step: TourStep;
  index: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  /** Không tìm thấy phần tử đích sau khi thử lại → bỏ qua bước này. */
  onTargetMissing: () => void;
}

/**
 * Lớp phủ + tooltip của một bước hướng dẫn. Component cha nên đặt `key={step.id}`
 * để state được reset sạch giữa các bước.
 */
export function GuidedTour({
  step,
  index,
  total,
  onNext,
  onBack,
  onSkip,
  onTargetMissing,
}: GuidedTourProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<TourRect | null>(null);
  const [ready, setReady] = useState(!step.target);
  const [viewport, setViewport] = useState<TourSize>({ width: 0, height: 0 });
  const [tooltipSize, setTooltipSize] = useState<TourSize>({
    width: TOOLTIP_MAX_WIDTH,
    height: 200,
  });

  const tooltipRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const onMissingRef = useRef(onTargetMissing);

  useEffect(() => {
    onMissingRef.current = onTargetMissing;
  }, [onTargetMissing]);

  // 1) Tìm phần tử đích (có thử lại), cuộn vào giữa màn hình
  useEffect(() => {
    const name = step.target;
    if (!name) return;

    let attempts = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const find = () => {
      if (cancelled) return;
      const el = findVisibleTarget(name);
      if (el) {
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        el.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: reduce ? "auto" : "smooth",
        });
        setTarget(el);
        setReady(true);
        return;
      }
      attempts += 1;
      if (attempts >= MAX_FIND_ATTEMPTS) {
        onMissingRef.current();
        return;
      }
      timer = setTimeout(find, FIND_INTERVAL_MS);
    };

    timer = setTimeout(find, 0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [step.target]);

  // 2) Theo dõi vị trí phần tử đích + kích thước viewport
  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      if (target) {
        const r = target.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("resize", schedule);
    // capture = true để bắt cả cuộn của container con
    window.addEventListener("scroll", schedule, true);
    // Bắt trường hợp bố cục dịch chuyển khi dữ liệu tải xong (không có sự kiện cuộn)
    const interval = setInterval(schedule, 500);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearInterval(interval);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [target]);

  // 3) Đo kích thước thật của tooltip để định vị chính xác
  useEffect(() => {
    const node = tooltipRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      setTooltipSize({ width: node.offsetWidth, height: node.offsetHeight });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ready]);

  // 4) Đưa focus vào nút "Tiếp" cho người dùng bàn phím / trình đọc màn hình
  useEffect(() => {
    if (ready) nextRef.current?.focus();
  }, [ready]);

  // 5) Phím tắt: Esc = bỏ qua, ← / → = lui / tiếp
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onSkip();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      } else if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        onBack();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, onBack, onNext, onSkip]);

  if (!ready) return null;

  const isDesktop = viewport.width >= DESKTOP_MIN_WIDTH;
  const placement = isDesktop
    ? step.placement
    : (step.placementMobile ?? step.placement);

  const hasTarget = Boolean(step.target);
  const positioned = viewport.width > 0 && (!hasTarget || rect !== null);
  const tooltipWidth = Math.min(
    TOOLTIP_MAX_WIDTH,
    Math.max(viewport.width - VIEWPORT_MARGIN * 2, 0) || TOOLTIP_MAX_WIDTH,
  );

  const position = computeTooltipPosition({
    target: hasTarget ? rect : null,
    tooltip: { width: tooltipWidth, height: tooltipSize.height },
    viewport,
    placement,
    margin: VIEWPORT_MARGIN,
  });

  const isLast = index === total - 1;

  return (
    <>
      {/* Bắt click ra ngoài = bỏ qua hướng dẫn, đồng thời chặn thao tác với trang bên dưới */}
      <div
        className="fixed inset-0 z-[9998]"
        aria-hidden="true"
        onClick={onSkip}
      />

      {/* Spotlight: ô sáng quanh phần tử đích, phần còn lại được làm tối bằng box-shadow */}
      {hasTarget && rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[9999] rounded-xl ring-2 ring-blue-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] transition-all duration-200 motion-reduce:transition-none"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[9999] bg-slate-900/60"
        />
      )}

      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`tour-title-${step.id}`}
        aria-describedby={`tour-body-${step.id}`}
        className="fixed z-[10000] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl transition-[top,left,opacity] duration-200 motion-reduce:transition-none"
        style={{
          top: position.top,
          left: position.left,
          width: tooltipWidth,
          opacity: positioned ? 1 : 0,
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
          Bước {index + 1}/{total}
        </p>
        <h2
          id={`tour-title-${step.id}`}
          className="mt-1 text-base font-bold text-slate-900"
        >
          {step.title}
        </h2>
        <p
          id={`tour-body-${step.id}`}
          className="mt-1.5 text-sm leading-relaxed text-slate-600"
        >
          {step.body}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="min-h-[44px] px-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
          >
            Bỏ qua
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={onBack}
                className="min-h-[44px] rounded-lg border border-slate-200 px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Lui
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={onNext}
              className="min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {isLast ? "Hoàn tất" : "Tiếp"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
