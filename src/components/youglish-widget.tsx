"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  YOUGLISH_SCRIPT_URL,
  buildYouGlishFallbackUrl,
  normalizeYouGlishQuery,
} from "@/lib/youglish";

/**
 * YouGlish widget — nghe người bản xứ nói một từ/cụm từ trong video thật.
 *
 * Ghi chú kỹ thuật (đã đối chiếu với widget.js v4.3):
 * - Widget KHÔNG render vào phần tử React: constructor `new YG.Widget(id, ...)` thay thế
 *   `outerHTML` của phần tử có id đó. Vì vậy ta tạo phần tử mount bằng DOM thuần bên trong
 *   một host do React sở hữu (host không có child do React quản lý) → React không bị lệch cây DOM.
 * - Dọn dẹp: `widget.pause()` + `widget.close()` rồi xoá sạch host → iframe (kèm video YouTube
 *   bên trong) bị gỡ khỏi DOM nên audio không phát ngầm.
 * - Script chỉ được nạp khi component được mount (tức khi người học mở panel), không nạp sẵn.
 * - Không cần whitelist CSP: app không đặt CSP (xem next.config.ts).
 */

interface YouGlishWidgetInstance {
  pause: () => void;
  close: () => void;
}

interface YouGlishFetchEvent {
  totalResult?: number;
}

interface YouGlishGlobal {
  Widget: new (
    containerId: string,
    options: Record<string, unknown>
  ) => YouGlishWidgetInstance;
}

declare global {
  interface Window {
    YG?: YouGlishGlobal;
  }
}

const SCRIPT_TIMEOUT_MS = 10_000;

let scriptPromise: Promise<void> | null = null;

/** Nạp script YouGlish đúng 1 lần (dùng chung giữa các lần mở panel). */
function loadYouGlishScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouGlish chỉ chạy trên trình duyệt"));
  }
  if (window.YG?.Widget) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = YOUGLISH_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.YG?.Widget) {
        resolve();
      } else {
        script.remove();
        reject(new Error("Script YouGlish đã tải nhưng thiếu YG.Widget"));
      }
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("Không tải được script YouGlish"));
    };
    document.head.appendChild(script);
  }).catch((err) => {
    // Cho phép thử lại ở lần mở panel kế tiếp
    scriptPromise = null;
    throw err;
  });

  return scriptPromise;
}

type WidgetStatus = "loading" | "ready" | "empty" | "error";

interface YouGlishWidgetProps {
  query: string;
}

export function YouGlishWidget({ query }: YouGlishWidgetProps) {
  const cleanQuery = normalizeYouGlishQuery(query);
  const fallbackUrl = buildYouGlishFallbackUrl(cleanQuery);
  const hostRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const [status, setStatus] = useState<WidgetStatus>("loading");

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !cleanQuery) return;

    let cancelled = false;
    let widget: YouGlishWidgetInstance | null = null;

    const failTimer = window.setTimeout(() => {
      if (!cancelled) setStatus((s) => (s === "loading" ? "error" : s));
    }, SCRIPT_TIMEOUT_MS);

    loadYouGlishScript()
      .then(() => {
        if (cancelled || !window.YG) return;

        const mount = document.createElement("div");
        mount.id = `yg-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}-${Date.now()}`;
        host.appendChild(mount);

        widget = new window.YG.Widget(mount.id, {
          query: cleanQuery,
          lang: "english",
          zones: "us,uk,aus",
          autoStart: 0, // tắt autoplay
          backgroundColor: "theme_light",
          events: {
            onFetchDone: (e: YouGlishFetchEvent) => {
              if (cancelled) return;
              window.clearTimeout(failTimer);
              setStatus(e?.totalResult === 0 ? "empty" : "ready");
            },
            onError: () => {
              if (cancelled) return;
              window.clearTimeout(failTimer);
              setStatus("error");
            },
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        window.clearTimeout(failTimer);
        setStatus("error");
      });

    return () => {
      cancelled = true;
      window.clearTimeout(failTimer);
      try {
        widget?.pause();
        widget?.close();
      } catch {
        // phần tử mount có thể đã bị gỡ — bỏ qua
      }
      // Gỡ iframe → dừng hẳn audio
      host.innerHTML = "";
    };
  }, [cleanQuery, reactId]);

  if (!cleanQuery) {
    return (
      <p className="text-sm text-slate-500">Chưa có từ/cụm từ để tra phát âm.</p>
    );
  }

  const showWidget = status === "loading" || status === "ready";

  return (
    <div className="space-y-3">
      {status === "loading" && (
        <div
          className="flex items-center gap-2 text-sm text-slate-500"
          role="status"
          aria-live="polite"
        >
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500"
            aria-hidden="true"
          />
          Đang tải video người bản xứ…
        </div>
      )}

      {(status === "error" || status === "empty") && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          role="alert"
        >
          {status === "empty"
            ? `YouGlish chưa có ví dụ cho “${cleanQuery}”.`
            : "Không tải được widget YouGlish (mạng chậm hoặc bị chặn)."}{" "}
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-indigo-700 underline"
          >
            Mở trên youglish.com ↗
          </a>
        </div>
      )}

      {/* Host do React sở hữu; nội dung bên trong do widget quản lý */}
      <div ref={hostRef} hidden={!showWidget} className="w-full overflow-hidden rounded-xl" />

      {status === "ready" && (
        <p className="text-xs text-slate-500">
          Dùng nút ◀ ▶ trong widget để xem thêm ví dụ.{" "}
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-700 underline"
          >
            Mở trên youglish.com ↗
          </a>
        </p>
      )}
    </div>
  );
}

interface YouGlishModalProps {
  query: string;
  onClose: () => void;
}

function YouGlishModal({ query, onClose }: YouGlishModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // Esc để đóng + khoá cuộn nền + trả focus khi đóng
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    // data-youglish-modal: để các popup cha (vd. smart-capture) biết click này nằm trong modal
    // và KHÔNG tự đóng theo "click ra ngoài".
    <div
      data-youglish-modal
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:max-w-[720px] sm:rounded-2xl sm:p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-base font-bold text-slate-900">
              🔊 Người bản xứ nói “{normalizeYouGlishQuery(query)}”
            </h2>
            <p className="text-xs text-slate-500">
              Video thật từ YouTube qua YouGlish · giọng Mỹ / Anh / Úc
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg text-lg text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <YouGlishWidget key={query} query={query} />
      </div>
    </div>
  );
}

interface YouGlishButtonProps {
  query: string;
  label?: string;
  className?: string;
}

/**
 * Nút mở YouGlish trong modal. Widget KHÔNG được nhúng sẵn — chỉ mount khi người học bấm
 * và được huỷ ngay khi đóng modal.
 */
export function YouGlishButton({
  query,
  label = "🔊 Nghe người bản xứ nói",
  className,
}: YouGlishButtonProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const disabled = !normalizeYouGlishQuery(query);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {label}
      </button>
      {open && createPortal(<YouGlishModal query={query} onClose={close} />, document.body)}
    </>
  );
}
