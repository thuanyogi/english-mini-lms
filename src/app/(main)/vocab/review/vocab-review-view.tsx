"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DueVocabItem {
  id: string;
  phrase: string;
  ipa: string | null;
  contextMeaning: string | null;
  originalSentence: string | null;
  sourceRef: string | null;
  myAttempt: string | null;
  masteryLevel: number;
  dueAt: string;
  challengePrompt: string;
}

interface ReviewResult {
  evaluation: {
    resultStatus: "correct" | "needs_improvement" | "incorrect";
    aiAssessment: string;
    naturalnessScore?: number;
    improvedVersion?: string;
  };
  masteryLevel: number;
  intervalDays: number;
  nextDueAt: string;
}

export default function VocabReviewView() {
  const [items, setItems] = useState<DueVocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responseMode, setResponseMode] = useState<"text" | "voice">("text");
  const [userText, setUserText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [completedList, setCompletedList] = useState<
    Array<{
      phrase: string;
      status: "correct" | "needs_improvement" | "incorrect";
      intervalDays: number;
    }>
  >([]);

  useEffect(() => {
    async function loadDueItems() {
      try {
        const res = await fetch("/api/v1/vocabulary/review?limit=5");
        if (res.ok) {
          const json = await res.json();
          setItems(json.items || []);
        }
      } catch (err) {
        console.error("Lỗi tải từ vựng đến hạn:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDueItems();
  }, []);

  const currentItem = items[currentIndex];

  const handleSubmitReview = async () => {
    if (!currentItem || !userText.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/vocabulary/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vocab_id: currentItem.id,
          scenario: currentItem.challengePrompt,
          user_response: userText.trim(),
          modality: responseMode === "voice" ? "audio" : "text",
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setReviewResult(json);
        setCompletedList((prev) => [
          ...prev,
          {
            phrase: currentItem.phrase,
            status: json.evaluation.resultStatus,
            intervalDays: json.intervalDays,
          },
        ]);
      } else {
        const err = await res.json();
        alert(err.error || "Có lỗi khi gửi bài ôn");
      }
    } catch (err) {
      console.error("Lỗi gửi bài ôn:", err);
      alert("Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextWord = () => {
    setReviewResult(null);
    setUserText("");
    setCurrentIndex((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin text-3xl mb-3">⏳</div>
        <p className="text-sm text-slate-500 font-medium">Đang kiểm tra từ vựng đến hạn ôn tập...</p>
      </div>
    );
  }

  // Nếu không có từ nào đến hạn
  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto">
            ✨
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Tuyệt vời! Bạn không còn từ nào đến hạn ôn hôm nay
            </h2>
            <p className="text-xs text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
              Các từ vựng trong Sổ từ đã được xếp lịch Spaced Repetition (1 → 3 → 7 → 14 ngày). Hãy quay lại vào ngày mai hoặc thêm từ mới từ bài đọc y khoa.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/today"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition shadow-sm"
            >
              Về trang Hôm nay
            </Link>
            <Link
              href="/vocab"
              className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-xs transition"
            >
              Mở Sổ từ vựng
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Đã hoàn thành tất cả từ trong phiên ôn
  if (currentIndex >= items.length) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto">
            🎉
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Hoàn thành phiên ôn từ hôm nay!
          </h2>
          <p className="text-xs text-slate-600">
            Bạn đã ôn tập {items.length} từ theo phương pháp Spaced Repetition.
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-left space-y-2 max-w-sm mx-auto">
            <div className="text-xs font-semibold text-slate-700 mb-2">Kết quả:</div>
            {completedList.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800">{item.phrase}</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                    item.status === "correct"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {item.status === "correct"
                    ? `Đạt • Ôn lại sau ${item.intervalDays} ngày`
                    : "Cần cải thiện • Hẹn ngày mai"}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <Link
              href="/today"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition shadow-sm"
            >
              Về trang Hôm nay →
            </Link>
            <Link
              href="/vocab"
              className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-xs transition"
            >
              Xem Sổ từ vựng
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Header thanh tiến trình */}
      <div className="flex items-center justify-between">
        <Link
          href="/today"
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition"
        >
          ← Quay lại Hôm nay
        </Link>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
          Từ {currentIndex + 1} / {items.length}
        </span>
      </div>

      {/* Thẻ từ vựng & thử thách micro-challenge */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="border-b pb-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Thử thách Micro-challenge
            </span>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
              Cấp độ nhớ: {currentItem.masteryLevel}/5
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-black text-slate-900">
              {currentItem.phrase}
            </h2>
            {currentItem.ipa && (
              <span className="text-xs text-slate-500 font-mono">
                {currentItem.ipa}
              </span>
            )}
          </div>
          {currentItem.contextMeaning && (
            <p className="text-xs text-indigo-700 font-medium">
              Nghĩa ngữ cảnh: {currentItem.contextMeaning}
            </p>
          )}
        </div>

        {/* Ngữ cảnh gốc */}
        {currentItem.originalSentence && (
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-700 block mb-1">
              Câu gốc đã lưu:
            </span>
            <p className="italic font-serif text-slate-700">
              &quot;{currentItem.originalSentence}&quot;
            </p>
          </div>
        )}

        {/* Đề bài thử thách */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 space-y-1">
          <div className="font-bold flex items-center gap-1 text-blue-800">
            <span>🎯</span> Yêu cầu thử thách:
          </div>
          <p className="leading-relaxed">
            Dùng cụm từ <strong className="underline">{currentItem.phrase}</strong> trong 1 câu tiếng Anh về bối cảnh công việc thực tế (khám bệnh, trao đổi ca bệnh, hoặc hội nghị chuyên môn).
          </p>
        </div>

        {/* Form nhập câu trả lời: Text hoặc Voice */}
        {!reviewResult ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Câu trả lời của bạn:
              </span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setResponseMode("text")}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    responseMode === "text"
                      ? "bg-white text-slate-800 shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Gõ chữ ✍️
                </button>
                <button
                  type="button"
                  onClick={() => setResponseMode("voice")}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    responseMode === "voice"
                      ? "bg-white text-slate-800 shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Giọng nói 🎙️
                </button>
              </div>
            </div>

            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder={`Ví dụ: The patient presented with ${currentItem.phrase} following acute trauma...`}
              rows={3}
              className="w-full text-xs sm:text-sm p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
            />

            {responseMode === "voice" && (
              <p className="text-[11px] text-slate-500 italic">
                💡 Mẹo: Bạn có thể dùng tính năng đọc chính tả (Dictation / Mic) tích hợp sẵn trên bàn phím điện thoại để nói trực tiếp vào ô văn bản trên.
              </p>
            )}

            <button
              onClick={handleSubmitReview}
              disabled={submitting || !userText.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-sm hover:shadow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="animate-spin">⏳</span> Gemini đang nhận xét cách dùng từ...
                </>
              ) : (
                <>
                  <span>🚀</span> Gửi câu trả lời để chấm
                </>
              )}
            </button>
          </div>
        ) : (
          /* Kết quả nhận xét từ Gemini */
          <div className="space-y-4 pt-2">
            <div
              className={`rounded-xl p-4 border text-xs sm:text-sm space-y-2 ${
                reviewResult.evaluation.resultStatus === "correct"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : "bg-amber-50 border-amber-200 text-amber-950"
              }`}
            >
              <div className="flex items-center justify-between font-bold text-xs uppercase tracking-wider">
                <span>
                  {reviewResult.evaluation.resultStatus === "correct"
                    ? "✅ Dùng từ chính xác!"
                    : "⚠️ Cần hoàn thiện thêm"}
                </span>
                <span className="text-[11px] font-normal normal-case">
                  Lần ôn tới: sau <strong>{reviewResult.intervalDays} ngày</strong>
                </span>
              </div>

              <div className="border-t border-black/10 pt-2 space-y-1">
                <span className="font-semibold block text-xs">Nhận xét của AI:</span>
                <p className="text-xs leading-relaxed">
                  {reviewResult.evaluation.aiAssessment}
                </p>
              </div>

              {reviewResult.evaluation.improvedVersion && (
                <div className="bg-white/80 p-2.5 rounded-lg border border-black/10 text-xs">
                  <span className="font-semibold text-slate-700 block mb-0.5">
                    Gợi ý diễn đạt tự nhiên hơn:
                  </span>
                  <p className="italic text-slate-800">
                    &quot;{reviewResult.evaluation.improvedVersion}&quot;
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleNextWord}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2"
            >
              <span>{currentIndex + 1 < items.length ? "Từ tiếp theo →" : "Xem tổng kết phiên ôn 🏁"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
