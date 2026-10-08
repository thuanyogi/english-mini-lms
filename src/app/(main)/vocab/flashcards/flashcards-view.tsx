"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface FlashcardItem {
  id: string;
  phrase: string;
  ipa: string | null;
  contextMeaning: string | null;
  originalSentence: string | null;
  sourceType: string | null;
  sourceRef: string | null;
  masteryLevel: number;
  dueAt: string | Date;
}

interface ReviewAction {
  vocab_id: string;
  result: "know" | "dont_know";
}

interface HistoryItem {
  item: FlashcardItem;
  result: "know" | "dont_know";
}

export function FlashcardsView() {
  const router = useRouter();

  // Chế độ: "due" (từ đến hạn) hoặc "all" (tất cả / ôn tự do)
  const [filterMode, setFilterMode] = useState<"due" | "all">("due");
  const [items, setItems] = useState<FlashcardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chỉ số thẻ hiện tại
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Batch kết quả quẹt
  const [batch, setBatch] = useState<ReviewAction[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Gesture dragging state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [flyDirection, setFlyDirection] = useState<"left" | "right" | null>(null);

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);

  const [reloadKey, setReloadKey] = useState(0);

  const handleFilterModeChange = (mode: "due" | "all") => {
    if (mode !== filterMode) {
      setLoading(true);
      setError(null);
      setFilterMode(mode);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((c) => c + 1);
  };

  useEffect(() => {
    let active = true;

    const url =
      filterMode === "all"
        ? "/api/v1/vocabulary/review?mode=quick&all=true&limit=30"
        : "/api/v1/vocabulary/review?mode=quick&limit=20";

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải danh sách từ vựng");
        return res.json();
      })
      .then((data) => {
        if (active) {
          setItems(data.items || []);
          setCurrentIndex(0);
          setIsFlipped(false);
          setBatch([]);
          setHistory([]);
          setIsFinished(false);
          setIsSubmitted(false);
          setFlyDirection(null);
          setDragOffset({ x: 0, y: 0 });
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Lỗi tải flashcards:", err);
          setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [filterMode, reloadKey]);

  // Cảnh báo beforeunload nếu đã quẹt mà chưa gửi kết quả
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (batch.length > 0 && !isSubmitted && !isFinished) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [batch.length, isSubmitted, isFinished]);

  // Phát âm từ vựng (Web Speech API)
  const speakPhrase = useCallback((phrase: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Gửi kết quả batch tới server
  const submitBatchReviews = useCallback(
    async (reviewsToSubmit: ReviewAction[]) => {
      if (reviewsToSubmit.length === 0) {
        setIsFinished(true);
        return;
      }

      setSaving(true);
      try {
        const res = await fetch("/api/v1/vocabulary/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "quick",
            reviews: reviewsToSubmit,
          }),
        });

        if (!res.ok) {
          throw new Error("Không thể lưu kết quả ôn tập");
        }

        setIsSubmitted(true);
        setIsFinished(true);
      } catch (err) {
        console.error("Lỗi nộp kết quả flashcard:", err);
        alert("Lưu kết quả gặp sự cố. Bạn vẫn có thể xem lại tổng kết.");
        setIsFinished(true);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Xử lý khi quyết định thẻ: know (thuộc) hoặc dont_know (chưa thuộc)
  const handleCardDecision = useCallback(
    (decision: "know" | "dont_know") => {
      if (currentIndex >= items.length || isFinished || saving) return;

      const currentItem = items[currentIndex];
      setFlyDirection(decision === "know" ? "right" : "left");

      // Cập nhật batch và history
      const newAction: ReviewAction = {
        vocab_id: currentItem.id,
        result: decision,
      };
      const updatedBatch = [...batch, newAction];
      setBatch(updatedBatch);
      setHistory((prev) => [...prev, { item: currentItem, result: decision }]);

      // Đợi hiệu ứng bay hoàn tất (240ms) rồi chuyển thẻ
      setTimeout(() => {
        setFlyDirection(null);
        setDragOffset({ x: 0, y: 0 });
        setIsFlipped(false);

        const nextIndex = currentIndex + 1;
        if (nextIndex >= items.length) {
          // Hết bộ bài -> Gửi batch ngay
          submitBatchReviews(updatedBatch);
        } else {
          setCurrentIndex(nextIndex);
        }
      }, 240);
    },
    [currentIndex, items, isFinished, saving, batch, submitBatchReviews]
  );

  // Hoàn tác (Undo) thẻ vừa quẹt
  const handleUndo = useCallback(() => {
    if (history.length === 0 || currentIndex === 0 || saving || isFinished) return;

    // Lùi 1 bước
    const nextHistory = [...history];
    nextHistory.pop();
    setHistory(nextHistory);

    const nextBatch = [...batch];
    nextBatch.pop();
    setBatch(nextBatch);

    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setIsFlipped(false);
    setDragOffset({ x: 0, y: 0 });
    setFlyDirection(null);
  }, [history, currentIndex, saving, isFinished, batch]);

  // Kết thúc phiên sớm và gửi batch đã có
  const handleFinishEarly = useCallback(() => {
    if (batch.length === 0) {
      router.push("/vocab");
      return;
    }
    const confirm = window.confirm(
      `Bạn đã ôn ${batch.length} từ. Bạn có muốn lưu kết quả và xem tổng kết không?`
    );
    if (confirm) {
      submitBatchReviews(batch);
    }
  }, [batch, router, submitBatchReviews]);

  // Ôn lại các từ chưa thuộc trong phiên vừa rồi
  const handleReviewIncorrectOnly = useCallback(() => {
    const unmasteredItems = history
      .filter((h) => h.result === "dont_know")
      .map((h) => h.item);

    if (unmasteredItems.length === 0) return;

    setItems(unmasteredItems);
    setCurrentIndex(0);
    setIsFlipped(false);
    setBatch([]);
    setHistory([]);
    setIsFinished(false);
    setIsSubmitted(false);
    setFlyDirection(null);
    setDragOffset({ x: 0, y: 0 });
  }, [history]);

  // Pointer events cho Swipe cử chỉ trên Mobile & Desktop
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (saving || flyDirection) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.hypot(dx, dy) > 8) {
      hasMovedRef.current = true;
    }

    // Khoá scroll dọc khi đang kéo ngang chủ đạo
    if (Math.abs(dx) > Math.abs(dy)) {
      setDragOffset({ x: dx, y: dy * 0.15 });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture lost
    }

    if (!hasMovedRef.current) {
      // Nhấn chạm ngắn -> Lật thẻ
      setIsFlipped((prev) => !prev);
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    // Ngưỡng vuốt ngang (threshold 80px)
    if (dragOffset.x > 80) {
      handleCardDecision("know");
    } else if (dragOffset.x < -80) {
      handleCardDecision("dont_know");
    } else {
      // Đàn hồi về vị trí cũ nếu chưa đủ ngưỡng
      setDragOffset({ x: 0, y: 0 });
    }
    dragStartRef.current = null;
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
    dragStartRef.current = null;
  };

  // Phím tắt bàn phím Desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Không kích hoạt nếu đang trong input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        handleCardDecision("dont_know");
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        handleCardDecision("know");
      } else if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === "z" || e.key === "Z" || e.key === "Backspace") {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCardDecision, handleUndo]);

  // Thống kê phiên học
  const knowCount = history.filter((h) => h.result === "know").length;
  const dontKnowCount = history.filter((h) => h.result === "dont_know").length;
  const currentCard = items[currentIndex];

  // Tính toán độ xoay và độ mờ visual khi kéo
  const dragRotation = dragOffset.x * 0.08;
  const knowBadgeOpacity = Math.min(1, Math.max(0, dragOffset.x / 70));
  const dontKnowBadgeOpacity = Math.min(1, Math.max(0, -dragOffset.x / 70));

  // Viền thẻ đổi màu nhẹ khi quẹt
  let cardBorderColor = "rgba(226, 232, 240, 1)"; // slate-200
  if (dragOffset.x > 30) {
    cardBorderColor = "rgba(16, 185, 129, 0.8)"; // emerald-500
  } else if (dragOffset.x < -30) {
    cardBorderColor = "rgba(244, 63, 94, 0.8)"; // rose-500
  }

  // ==========================================
  // 1. MÀN HÌNH TỔNG KẾT SAU KHI HẾT BỘ BÀI
  // ==========================================
  if (isFinished) {
    const unmasteredList = history.filter((h) => h.result === "dont_know");

    return (
      <div className="mx-auto w-full max-w-md px-4 py-6 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] animate-fadeIn">
        <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Hoàn thành bộ thẻ!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kết quả đã được cập nhật vào thuật toán lặp lại ngắt quãng (Spaced Repetition).
          </p>

          {/* Hộp chỉ số kết quả */}
          <div className="grid grid-cols-2 gap-3 my-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Đã thuộc ✓
              </span>
              <span className="text-3xl font-black text-emerald-600 mt-1">
                {knowCount}
              </span>
              <span className="text-[11px] text-emerald-700 mt-0.5">
                Tăng khoảng cách ôn
              </span>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                Chưa thuộc ✗
              </span>
              <span className="text-3xl font-black text-rose-600 mt-1">
                {dontKnowCount}
              </span>
              <span className="text-[11px] text-rose-700 mt-0.5">
                Ôn lại vào ngày mai
              </span>
            </div>
          </div>

          {/* Danh sách các từ chưa thuộc */}
          {unmasteredList.length > 0 && (
            <div className="text-left mb-6">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>📝</span> Các từ cần củng cố ({unmasteredList.length})
              </h3>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                {unmasteredList.map(({ item }) => (
                  <div key={item.id} className="pt-2 flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{item.phrase}</span>
                        {item.ipa && (
                          <span className="text-xs font-mono text-slate-400 font-normal">
                            {item.ipa}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                        {item.contextMeaning || "Chưa có nghĩa ngữ cảnh"}
                      </p>
                    </div>
                    <button
                      onClick={() => speakPhrase(item.phrase)}
                      className="p-1 text-slate-400 hover:text-blue-600 text-xs transition"
                      title="Nghe phát âm"
                      aria-label="Phát âm"
                    >
                      🔊
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Các nút hành động chuyển hướng */}
          <div className="space-y-2.5">
            {unmasteredList.length > 0 && (
              <button
                onClick={handleReviewIncorrectOnly}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🔁</span> Ôn lại {unmasteredList.length} từ chưa thuộc
              </button>
            )}

            <Link
              href="/vocab/review"
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition shadow-sm flex items-center justify-center gap-2 text-sm"
            >
              <span>💡</span> Luyện sâu qua Micro-challenge (AI chấm)
            </Link>

            <div className="flex gap-2 pt-1">
              <Link
                href="/vocab"
                className="flex-1 py-2.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-center text-xs transition"
              >
                📚 Sổ từ vựng
              </Link>
              <Link
                href="/today"
                className="flex-1 py-2.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-center text-xs transition"
              >
                🏠 Trang chủ hôm nay
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. MÀN HÌNH TẢI / LỖI / TRỐNG BỘ BÀI
  // ==========================================
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 flex flex-col items-center justify-center text-center min-h-[calc(100vh-120px)]">
        <div className="animate-spin text-4xl mb-3">🃏</div>
        <p className="text-sm font-semibold text-slate-600">
          Đang chuẩn bị bộ thẻ từ vựng Spaced Repetition...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12 text-center min-h-[calc(100vh-120px)] flex flex-col justify-center items-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Không thể tải thẻ ôn</h3>
        <p className="text-xs text-slate-500 mb-4">{error}</p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs"
        >
          Thử lại 🔄
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] text-center">
        <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-100">
          <div className="text-5xl mb-3">✨</div>
          <h2 className="text-xl font-black text-slate-900 mb-1">
            Không có từ nào đến hạn!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
            Bạn đã ôn hết các từ đến lịch hôm nay. Bạn có thể chọn chế độ{" "}
            <strong>Ôn tự do</strong> để lướt lại toàn bộ kho từ đã lưu.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handleFilterModeChange("all")}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span>🃏</span> Bắt đầu Ôn tự do (Tất cả từ)
            </button>

            <Link
              href="/vocab"
              className="block w-full py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-2xl transition text-center text-xs"
            >
              Quay lại Sổ từ vựng 📚
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. MÀN HÌNH CHÍNH LƯỚT BỘ THẺ FLASHCARD
  // ==========================================
  const progressPercent = Math.round((currentIndex / items.length) * 100);

  return (
    <div className="mx-auto w-full max-w-md px-3 sm:px-4 py-2 flex flex-col justify-between h-[calc(100dvh-75px)] sm:h-[calc(100vh-80px)] select-none overflow-hidden">
      {/* Top Bar: Điều hướng + Tiến độ + Chế độ */}
      <div className="flex-none space-y-2 mb-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/vocab"
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
              title="Quay lại Sổ từ vựng"
            >
              ←
            </Link>
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <span>🃏</span>
              <span>
                Thẻ {currentIndex + 1} / {items.length}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Toggle Chế độ Đến hạn / Ôn tự do */}
            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                onClick={() => handleFilterModeChange("due")}
                className={`px-2 py-1 rounded-md transition ${
                  filterMode === "due"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Đến hạn
              </button>
              <button
                onClick={() => handleFilterModeChange("all")}
                className={`px-2 py-1 rounded-md transition ${
                  filterMode === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Ôn tự do
              </button>
            </div>

            {/* Nút Kết thúc & Lưu sớm */}
            <button
              onClick={handleFinishEarly}
              className="text-[11px] font-bold text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition"
              title="Kết thúc phiên và lưu kết quả hiện tại"
            >
              Kết thúc
            </button>
          </div>
        </div>

        {/* Thanh tiến độ */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* VÙNG THẺ TƯƠNG TÁC (Chiếm ~70% màn hình) */}
      <div className="flex-1 flex items-center justify-center relative my-1 min-h-[360px] max-h-[70vh]">
        {/* Thẻ phụ phía dưới để tạo hiệu ứng xếp lớp 3D */}
        {currentIndex + 1 < items.length && (
          <div
            className="absolute inset-x-2 sm:inset-x-4 top-4 bottom-0 bg-white rounded-3xl border border-slate-200/80 shadow-md opacity-40 pointer-events-none transform scale-95 translate-y-2 z-0"
            aria-hidden="true"
          />
        )}

        {/* THẺ CHÍNH ĐANG TƯƠNG TÁC */}
        {currentCard && (
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            style={{
              transform: flyDirection
                ? `translateX(${flyDirection === "right" ? "120%" : "-120%"}) rotate(${
                    flyDirection === "right" ? "25deg" : "-25deg"
                  })`
                : `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${dragRotation}deg)`,
              borderColor: cardBorderColor,
              transition: isDragging
                ? "none"
                : "transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), border-color 0.2s ease",
              touchAction: "pan-y",
              cursor: isDragging ? "grabbing" : "grab",
            }}
            className="relative z-10 w-full h-full max-h-[520px] rounded-3xl bg-white shadow-xl border-2 p-5 sm:p-6 flex flex-col justify-between overflow-hidden"
          >
            {/* OVERLAY BADGE KHI QUẸT PHẢI (ĐÃ THUỘC) */}
            <div
              style={{ opacity: knowBadgeOpacity }}
              className="absolute top-5 left-5 pointer-events-none z-30 transition-opacity bg-emerald-600 text-white font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-full border-2 border-white shadow-md tracking-wider transform -rotate-12"
            >
              ✓ ĐÃ THUỘC
            </div>

            {/* OVERLAY BADGE KHI QUẸT TRÁI (CHƯA THUỘC) */}
            <div
              style={{ opacity: dontKnowBadgeOpacity }}
              className="absolute top-5 right-5 pointer-events-none z-30 transition-opacity bg-rose-600 text-white font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-full border-2 border-white shadow-md tracking-wider transform rotate-12"
            >
              ✗ CHƯA THUỘC
            </div>

            {/* 3D FLIP CONTAINER: Chạm để lật mặt trước/mặt sau */}
            <div
              className="w-full h-full relative"
              style={{
                perspective: "1000px",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* ----------------- MẶT TRƯỚC: PHRASE + IPA + NÚT LOA ----------------- */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                  className="flex flex-col justify-between items-center text-center p-1"
                >
                  {/* Header thẻ: Cấp độ thuộc + Nguồn */}
                  <div className="w-full flex items-center justify-between text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      Level {currentCard.masteryLevel}/4
                    </span>
                    {currentCard.sourceRef && (
                      <span className="text-[11px] font-medium truncate max-w-[150px] text-slate-400">
                        {currentCard.sourceRef}
                      </span>
                    )}
                  </div>

                  {/* Trung tâm thẻ: Phrase & IPA & Nút phát âm */}
                  <div className="my-auto py-4 flex flex-col items-center space-y-4">
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug px-2">
                      {currentCard.phrase}
                    </h3>

                    {currentCard.ipa && (
                      <span className="text-sm sm:text-base font-mono font-medium text-slate-500 bg-slate-100/70 px-3 py-1 rounded-lg">
                        {currentCard.ipa}
                      </span>
                    )}

                    {/* Nút loa phát âm chuẩn */}
                    <button
                      type="button"
                      onClick={(e) => speakPhrase(currentCard.phrase, e)}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="mt-2 w-12 h-12 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center text-xl transition transform active:scale-95 shadow-xs cursor-pointer"
                      title="Nghe phát âm chuẩn (US)"
                      aria-label="Phát âm từ"
                    >
                      🔊
                    </button>
                  </div>

                  {/* Gợi ý chạm lật thẻ */}
                  <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1 bg-slate-50/80 px-3 py-1 rounded-full">
                    <span>🔄</span> Chạm thẻ để xem nghĩa & câu gốc
                  </div>
                </div>

                {/* ----------------- MẶT SAU: CONTEXT MEANING + ORIGINAL SENTENCE ----------------- */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                  className="flex flex-col justify-between text-left p-1 overflow-y-auto"
                >
                  <div className="space-y-3.5">
                    {/* Header mặt sau */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-800">
                          {currentCard.phrase}
                        </span>
                        {currentCard.ipa && (
                          <span className="text-[11px] font-mono text-slate-400 ml-1.5">
                            {currentCard.ipa}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => speakPhrase(currentCard.phrase, e)}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="p-1 text-slate-400 hover:text-blue-600 text-sm transition"
                        title="Nghe phát âm"
                      >
                        🔊
                      </button>
                    </div>

                    {/* Nghĩa ngữ cảnh */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        Nghĩa trong ngữ cảnh
                      </span>
                      <p className="text-sm sm:text-base font-bold text-slate-900 mt-1 leading-snug">
                        {currentCard.contextMeaning || "Chưa có định nghĩa ngữ cảnh"}
                      </p>
                    </div>

                    {/* Câu gốc trong bài đọc/nghe */}
                    {currentCard.originalSentence && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Câu gốc:
                        </span>
                        <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                          &ldquo;{currentCard.originalSentence}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Chạm để quay lại mặt trước */}
                  <div className="pt-2 text-center text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1">
                    <span>🔄</span> Chạm để quay lại mặt từ
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ĐIỀU KHIỂN DƯỚI THẺ: Nút ✗ (Chưa thuộc), Hoàn tác, Nút ✓ (Đã thuộc) */}
      <div className="flex-none pt-1 pb-1">
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          {/* Nút ✗ Chưa thuộc (Vuốt trái) */}
          <button
            type="button"
            onClick={() => handleCardDecision("dont_know")}
            disabled={saving || flyDirection !== null}
            className="flex-1 max-w-[130px] h-14 bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 text-rose-700 rounded-2xl flex flex-col items-center justify-center transition transform active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
            title="Chưa thuộc [Phím ← hoặc A]"
          >
            <span className="text-lg font-black leading-none">✗</span>
            <span className="text-[10px] font-bold mt-1">Chưa thuộc (←)</span>
          </button>

          {/* Nút Hoàn tác (Undo) */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0 || saving || flyDirection !== null}
            className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl flex flex-col items-center justify-center transition transform active:scale-90 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Hoàn tác thẻ trước [Phím Z]"
          >
            <span className="text-base leading-none">↩️</span>
            <span className="text-[9px] font-semibold text-slate-500 mt-0.5">Undo</span>
          </button>

          {/* Nút Lật thẻ */}
          <button
            type="button"
            onClick={() => setIsFlipped((prev) => !prev)}
            className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl flex flex-col items-center justify-center transition transform active:scale-90 cursor-pointer"
            title="Lật thẻ [Phím Space]"
          >
            <span className="text-base leading-none">🔄</span>
            <span className="text-[9px] font-semibold text-slate-500 mt-0.5">Lật</span>
          </button>

          {/* Nút ✓ Đã thuộc (Vuốt phải) */}
          <button
            type="button"
            onClick={() => handleCardDecision("know")}
            disabled={saving || flyDirection !== null}
            className="flex-1 max-w-[130px] h-14 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 text-emerald-700 rounded-2xl flex flex-col items-center justify-center transition transform active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
            title="Đã thuộc [Phím → hoặc D]"
          >
            <span className="text-lg font-black leading-none">✓</span>
            <span className="text-[10px] font-bold mt-1">Đã thuộc (→)</span>
          </button>
        </div>

        {/* Hướng dẫn phím tắt mờ trên Desktop */}
        <div className="hidden sm:flex justify-center items-center gap-4 text-[11px] text-slate-400 mt-2">
          <span>[← / A] Chưa thuộc</span>
          <span>•</span>
          <span>[Space] Lật thẻ</span>
          <span>•</span>
          <span>[Z] Hoàn tác</span>
          <span>•</span>
          <span>[→ / D] Đã thuộc</span>
        </div>
      </div>
    </div>
  );
}
