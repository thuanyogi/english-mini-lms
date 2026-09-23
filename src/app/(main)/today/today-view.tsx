"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ActivityItem {
  id: string;
  title: string;
  mode: string;
  durationMinutes: number | null;
  objective: string | null;
  difficulty: string | null;
}

interface TodayRecommendationData {
  recommendedActivity: ActivityItem | null;
  reason: string;
  ruleCode: string;
  alternateActivities: ActivityItem[];
  dueVocabCount: number;
  leastPracticedSkill: string;
  activeDraftSessionId: string | null;
}

interface TodayViewProps {
  initialTargetMinutes: 30 | 45;
  userEmail?: string;
  displayName?: string;
}

const MODE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  writing: { label: "Viết", color: "bg-blue-100 text-blue-800 border-blue-200", icon: "✍️" },
  reading: { label: "Đọc - Dịch", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: "📖" },
  speaking: { label: "Nói", color: "bg-purple-100 text-purple-800 border-purple-200", icon: "🎙️" },
  listening: { label: "Nghe / Shadowing", color: "bg-amber-100 text-amber-800 border-amber-200", icon: "🎧" },
};

export default function TodayView({
  initialTargetMinutes,
  displayName,
}: TodayViewProps) {
  const router = useRouter();
  const [targetMinutes, setTargetMinutes] = useState<30 | 45>(initialTargetMinutes);
  const [data, setData] = useState<TodayRecommendationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showAlternates, setShowAlternates] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/today?target_minutes=${targetMinutes}`)
      .then((res) => {
        if (!res.ok) throw new Error("Network response error");
        return res.json();
      })
      .then((json: TodayRecommendationData) => {
        if (active) {
          setData(json);
          setSelectedActivity(json.recommendedActivity);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Lỗi tải gợi ý học tập:", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [targetMinutes]);

  const handleSelectMinutes = (mins: 30 | 45) => {
    if (mins !== targetMinutes) {
      setLoading(true);
      setTargetMinutes(mins);
    }
  };

  const handleStartSession = async (activityId: string) => {
    setStarting(true);
    try {
      // Nếu là phiên đang dở
      if (
        data?.activeDraftSessionId &&
        selectedActivity?.id === data.recommendedActivity?.id
      ) {
        router.push(`/learn/${data.activeDraftSessionId}`);
        return;
      }

      const res = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: activityId,
          target_minutes: targetMinutes,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        router.push(`/learn/${json.session.id}`);
      } else {
        const err = await res.json();
        alert(err.error || "Không thể khởi tạo phiên học");
        setStarting(false);
      }
    } catch (err) {
      console.error("Lỗi bắt đầu phiên học:", err);
      alert("Lỗi kết nối máy chủ");
      setStarting(false);
    }
  };

  const handleSwapActivity = () => {
    if (!data || data.alternateActivities.length === 0) return;
    setShowAlternates((prev) => !prev);
  };

  const currentActivity = selectedActivity || data?.recommendedActivity;
  const currentModeInfo = currentActivity
    ? MODE_LABELS[currentActivity.mode] || {
        label: currentActivity.mode,
        color: "bg-slate-100 text-slate-800 border-slate-200",
        icon: "📚",
      }
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* 1. Header & Lời chào */}
      <div className="rounded-2xl p-6 text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              Xin chào, {displayName || "Bác sĩ"}! 👋
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Duy trì 30–45 phút mỗi ngày để nâng cao phản xạ tiếng Anh y khoa.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition font-medium backdrop-blur-sm"
          >
            Hồ sơ học tập ⚙️
          </Link>
        </div>

        {/* Bộ chọn thời lượng 30 / 45 phút */}
        <div className="mt-5 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs sm:text-sm font-medium text-blue-100">
            Thời lượng mục tiêu hôm nay:
          </span>
          <div className="inline-flex bg-black/20 p-1 rounded-xl backdrop-blur-sm">
            <button
              onClick={() => handleSelectMinutes(30)}
              className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                targetMinutes === 30
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              ⏱️ 30 phút
            </button>
            <button
              onClick={() => handleSelectMinutes(45)}
              className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                targetMinutes === 45
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              ⏱️ 45 phút
            </button>
          </div>
        </div>
      </div>

      {/* 2. Banner Ôn từ vựng đến hạn (Spaced Repetition) */}
      {data && data.dueVocabCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Có {data.dueVocabCount} từ vựng đến hạn ôn tập!
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Ôn ngay với thử thách micro-challenge ngắn (1-2 phút) để củng cố trí nhớ dài hạn.
              </p>
            </div>
          </div>
          <Link
            href="/vocab/review"
            className="inline-flex items-center justify-center whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shadow-sm"
          >
            Ôn từ ngay (tối đa 5 từ) →
          </Link>
        </div>
      )}

      {/* 3. Thẻ gợi ý bài học chính theo quy tắc giải thích được */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
          <div className="animate-spin text-3xl mb-3">⏳</div>
          <p className="text-sm text-slate-500 font-medium">Đang tính toán bài học tối ưu cho bạn...</p>
        </div>
      ) : currentActivity ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          {/* Header giải thích lý do gợi ý */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                Gợi ý thông minh
              </span>
              <span className="text-xs text-slate-600 font-medium">
                {data?.reason}
              </span>
            </div>

            {data?.alternateActivities && data.alternateActivities.length > 0 && (
              <button
                onClick={handleSwapActivity}
                className="text-xs text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1 transition"
              >
                🔄 Đổi bài khác
              </button>
            )}
          </div>

          {/* Chi tiết hoạt động */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {currentModeInfo && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border font-semibold inline-flex items-center gap-1 ${currentModeInfo.color}`}
                >
                  <span>{currentModeInfo.icon}</span>
                  <span>{currentModeInfo.label}</span>
                </span>
              )}
              <span className="text-xs text-slate-500 font-medium">
                Mã: {currentActivity.id}
              </span>
              {currentActivity.durationMinutes && (
                <span className="text-xs text-slate-400">
                  • Chuẩn {currentActivity.durationMinutes} phút
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              {currentActivity.title}
            </h2>

            {currentActivity.objective && (
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                🎯 <strong>Mục tiêu:</strong> {currentActivity.objective}
              </p>
            )}
          </div>

          {/* Nút hành động chính */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleStartSession(currentActivity.id)}
              disabled={starting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition shadow-md hover:shadow-lg disabled:opacity-50 text-center flex items-center justify-center gap-2"
            >
              {starting ? (
                <>
                  <span className="animate-spin">⏳</span> Đang mở bài...
                </>
              ) : data?.activeDraftSessionId && currentActivity.id === data.recommendedActivity?.id ? (
                <>
                  <span>📝</span> Tiếp tục bài đang dở ({targetMinutes} phút)
                </>
              ) : (
                <>
                  <span>🚀</span> Bắt đầu luyện tập ({targetMinutes} phút)
                </>
              )}
            </button>

            <Link
              href={`/library/${currentActivity.id}`}
              className="px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-center text-sm transition"
            >
              Xem đề bài
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-base font-bold text-slate-800">
            Hiện chưa có bài học phù hợp trong Thư viện
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Vui lòng kiểm tra lại Thư viện bài học hoặc liên hệ quản trị viên để nạp thêm nội dung.
          </p>
          <Link
            href="/library"
            className="inline-block mt-4 text-xs font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Mở Thư viện →
          </Link>
        </div>
      )}

      {/* 4. Danh sách bài thay thế nếu người học bấm "Đổi bài" */}
      {showAlternates && data?.alternateActivities && data.alternateActivities.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Các bài học khả dụng khác
            </h3>
            <button
              onClick={() => setShowAlternates(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Đóng ✕
            </button>
          </div>

          <div className="space-y-2">
            {data.alternateActivities.map((alt) => {
              const modeInfo = MODE_LABELS[alt.mode] || {
                label: alt.mode,
                color: "bg-slate-100 text-slate-700",
                icon: "📄",
              };
              const isCurrent = alt.id === currentActivity?.id;

              return (
                <div
                  key={alt.id}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition ${
                    isCurrent
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${modeInfo.color}`}
                      >
                        {modeInfo.label}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {alt.title}
                      </span>
                    </div>
                    {alt.objective && (
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {alt.objective}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedActivity(alt);
                      setShowAlternates(false);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-50 transition"
                  >
                    Chọn bài này
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Khối liên kết nhanh: Tiến độ & Sổ từ */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/progress"
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
            📊
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">
              Tiến độ học
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Phút thực học, lỗi lặp & so sánh
            </p>
          </div>
        </Link>

        <Link
          href="/vocab"
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
            📖
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">
              Sổ từ vựng
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Từ đã thuộc & Spaced Repetition
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
