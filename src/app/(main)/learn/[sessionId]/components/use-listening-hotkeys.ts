"use client";

import { useEffect, type RefObject } from "react";
import type { YouTubePlayerHandle } from "../youtube-player";

/** Số giây tua mỗi lần bấm ← / →. */
export const HOTKEY_SEEK_SECONDS = 5;

/**
 * Không bắt phím tắt khi người học đang gõ chữ / chọn trong form,
 * hoặc khi bấm tổ hợp có Ctrl/Alt/Meta (để không đè phím tắt của trình duyệt).
 */
export function shouldIgnoreHotkey(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return true;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * Phím tắt cho phiên nghe trên desktop: Space = phát/dừng, ← / → = tua ∓5 giây.
 *
 * Lưu ý: khi con trỏ đang nằm TRONG khung YouTube (iframe) thì trình duyệt gửi
 * phím cho iframe chứ không cho trang này — bấm ra ngoài video rồi dùng phím tắt.
 */
export function useListeningHotkeys(
  playerRef: RefObject<YouTubePlayerHandle | null>,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreHotkey(event)) return;
      const player = playerRef.current;
      if (!player) return;

      // Space trên nút/liên kết đang focus phải giữ nguyên hành vi mặc định (kích hoạt nút)
      const target = event.target as HTMLElement | null;
      const isInteractive =
        target?.tagName === "BUTTON" || target?.tagName === "A";

      if (event.code === "Space" && !isInteractive) {
        event.preventDefault();
        player.togglePlay();
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        player.seekBy(-HOTKEY_SEEK_SECONDS);
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        player.seekBy(HOTKEY_SEEK_SECONDS);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playerRef, enabled]);
}
