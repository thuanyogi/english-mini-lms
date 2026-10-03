"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GuidedTour } from "./guided-tour";
import { TOUR_STEPS } from "./tour-steps";

/** Bước hiện tại, giữ qua các lần chuyển trang trong cùng tab. */
export const TOUR_STEP_KEY = "lms:tour:step";
/** Cờ dự phòng khi API lưu preferences lỗi. */
export const TOUR_DONE_KEY = "lms:tour:completed";

function readSavedStep(): number | null {
  try {
    const raw = sessionStorage.getItem(TOUR_STEP_KEY);
    if (raw === null) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isInteger(n) && n >= 0 && n < TOUR_STEPS.length ? n : null;
  } catch {
    return null;
  }
}

/**
 * Điều phối hướng dẫn nhanh: tự bắt đầu ở /today lần đầu (hoặc khi có ?tour=1),
 * chuyển trang theo từng bước, lưu trạng thái hoàn tất vào preferences.
 */
export function TourHost({ tourCompleted }: { tourCompleted: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceStart = searchParams.get("tour") === "1";

  const [stepIndex, setStepIndex] = useState<number | null>(null);
  /** Trang mà chính hướng dẫn vừa điều hướng tới (để phân biệt với người dùng tự đi chỗ khác). */
  const pendingRouteRef = useRef<string | null>(null);
  /** Đã hoàn tất/bỏ qua trong phiên này (prop tourCompleted từ server không tự đổi khi chuyển trang). */
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    doneRef.current = true;
    try {
      sessionStorage.removeItem(TOUR_STEP_KEY);
      localStorage.setItem(TOUR_DONE_KEY, "1");
    } catch {
      // bỏ qua nếu trình duyệt chặn storage
    }
    pendingRouteRef.current = null;
    setStepIndex(null);
    fetch("/api/v1/settings/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tourCompleted: true }),
    }).catch(() => {
      // Đã có cờ localStorage làm dự phòng
    });
  }, []);

  const goToStep = useCallback(
    (next: number) => {
      if (next >= TOUR_STEPS.length) {
        finish();
        return;
      }
      if (next < 0) return;
      try {
        sessionStorage.setItem(TOUR_STEP_KEY, String(next));
      } catch {
        // bỏ qua
      }
      const route = TOUR_STEPS[next].route;
      pendingRouteRef.current = route;
      setStepIndex(next);
      if (route !== pathname) router.push(route);
    },
    [finish, pathname, router],
  );

  // Khởi động / khôi phục hướng dẫn (setState chỉ gọi trong callback của timer)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (forceStart) {
        doneRef.current = false;
        try {
          sessionStorage.setItem(TOUR_STEP_KEY, "0");
        } catch {
          // bỏ qua
        }
        pendingRouteRef.current = "/today";
        setStepIndex((prev) => prev ?? 0);
        // Gỡ ?tour=1 khỏi URL để tải lại trang không chạy lại hướng dẫn
        router.replace("/today");
        return;
      }

      const saved = readSavedStep();
      if (saved !== null) {
        if (TOUR_STEPS[saved].route === pathname) {
          setStepIndex((prev) => prev ?? saved);
        } else if (pendingRouteRef.current === null) {
          // Tải lại trang giữa chừng nhưng đang ở trang khác → bỏ trạng thái dở dang
          try {
            sessionStorage.removeItem(TOUR_STEP_KEY);
          } catch {
            // bỏ qua
          }
        }
        return;
      }

      if (pathname === "/today" && !tourCompleted && !doneRef.current) {
        let doneLocally = false;
        try {
          doneLocally = localStorage.getItem(TOUR_DONE_KEY) === "1";
        } catch {
          // bỏ qua
        }
        if (!doneLocally) {
          try {
            sessionStorage.setItem(TOUR_STEP_KEY, "0");
          } catch {
            // bỏ qua
          }
          pendingRouteRef.current = "/today";
          setStepIndex((prev) => prev ?? 0);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [forceStart, pathname, tourCompleted, router]);

  // Người dùng tự rời khỏi trang của bước hiện tại (nút Back, v.v.) → kết thúc hướng dẫn
  useEffect(() => {
    if (stepIndex === null) return;
    const route = TOUR_STEPS[stepIndex].route;
    if (pathname === route) {
      pendingRouteRef.current = null;
      return;
    }
    const timer = setTimeout(() => {
      if (pendingRouteRef.current !== route) finish();
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname, stepIndex, finish]);

  if (stepIndex === null) return null;
  const step = TOUR_STEPS[stepIndex];
  // Chờ điều hướng xong rồi mới hiển thị bước
  if (pathname !== step.route) return null;

  return (
    <GuidedTour
      key={step.id}
      step={step}
      index={stepIndex}
      total={TOUR_STEPS.length}
      onNext={() => goToStep(stepIndex + 1)}
      onBack={() => goToStep(stepIndex - 1)}
      onSkip={finish}
      onTargetMissing={() => goToStep(stepIndex + 1)}
    />
  );
}
