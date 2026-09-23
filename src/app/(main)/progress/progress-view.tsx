"use client";

import { useState } from "react";
import Link from "next/link";
import { ProgressSummary } from "@/server/progress/service";

interface ProgressViewProps {
  initialSummary: ProgressSummary;
}

const SKILL_ICONS: Record<string, { label: string; icon: string; color: string }> = {
  writing: { label: "Viết", icon: "✍️", color: "bg-blue-500" },
  reading: { label: "Đọc - Dịch", icon: "📖", color: "bg-emerald-500" },
  speaking: { label: "Nói", icon: "🎙️", color: "bg-purple-500" },
  listening: { label: "Nghe / Shadowing", icon: "🎧", color: "bg-amber-500" },
};

export default function ProgressView({ initialSummary }: ProgressViewProps) {
  const [summary] = useState<ProgressSummary>(initialSummary);
  const [expandedCompId, setExpandedCompId] = useState<string | null>(null);

  const totalSubs = summary.totalSubmissions || 0;
  const independentPct =
    totalSubs > 0
      ? Math.round((summary.independentCount / totalSubs) * 100)
      : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* 1. Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>📊</span> Báo cáo Tiến độ Học tập
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Theo dõi bằng chứng thực tế: thời lượng tập trung, lỗi lặp và các bản sửa bài cải thiện.
          </p>
        </div>
        <Link
          href="/settings"
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition font-medium shrink-0"
        >
          ⚙️ Cài đặt
        </Link>
      </div>

      {/* 2. Cảnh báo khi dữ liệu chưa đủ (dưới 3 bài) */}
      {!summary.hasSufficientData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="text-xl">ℹ️</div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-amber-900">
              Chưa đủ bằng chứng để phân tích xu hướng
            </h3>
            <p className="text-xs text-amber-700 mt-0.5">
              Hệ thống cần tối thiểu 3 bài làm để bắt đầu nhận diện mẫu lỗi lặp và so sánh độ tiến bộ. Hãy tiếp tục luyện tập thêm các bài trong Thư viện!
            </p>
          </div>
        </div>
      )}

      {/* 3. 4 Thẻ chỉ số chính */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Số phiên tuần */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Phiên 7 ngày qua
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {summary.sessionsThisWeek}
          </div>
          <span className="text-[11px] text-slate-500">phiên học thực tế</span>
        </div>

        {/* Phút thực học */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Phút thực học
          </span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">
            {summary.actualStudyMinutes}&apos;
          </div>
          <span className="text-[11px] text-slate-500">tổng active time</span>
        </div>

        {/* Tách Độc lập vs Có hỗ trợ */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Tự chủ / Độc lập
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
            {independentPct}%
          </div>
          <span className="text-[11px] text-slate-500">
            {summary.independentCount} độc lập / {summary.assistedCount} có hỗ trợ
          </span>
        </div>

        {/* Từ vựng đã thuộc */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Từ đã thuộc
          </span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1">
            {summary.masteredVocabCount}
          </div>
          <span className="text-[11px] text-slate-500">
            trên {summary.totalVocabCount} từ trong sổ
          </span>
        </div>
      </div>

      {/* 4. Bài theo kỹ năng (Tách Độc lập & Có hỗ trợ) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-sm font-bold text-slate-900">
            Phân bổ bài tập theo kỹ năng
          </h2>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
              Độc lập
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block"></span>
              Có hỗ trợ (gợi ý)
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {summary.skillBreakdown.map((item) => {
            const skillMeta = SKILL_ICONS[item.skill] || {
              label: item.skill,
              icon: "📚",
              color: "bg-blue-500",
            };
            const indepWidth =
              item.total > 0
                ? `${Math.round((item.independent / item.total) * 100)}%`
                : "0%";
            const assistWidth =
              item.total > 0
                ? `${Math.round((item.assisted / item.total) * 100)}%`
                : "0%";

            return (
              <div key={item.skill} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>{skillMeta.icon}</span>
                    <span>{skillMeta.label}</span>
                  </span>
                  <span className="text-slate-600 font-medium">
                    {item.total} bài ({item.independent} độc lập, {item.assisted} có hỗ trợ)
                  </span>
                </div>

                {/* Thanh tỉ lệ chia 2 màu */}
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  {item.total > 0 ? (
                    <>
                      <div
                        style={{ width: indepWidth }}
                        className="bg-emerald-500 transition-all duration-300"
                        title={`Độc lập: ${item.independent}`}
                      />
                      <div
                        style={{ width: assistWidth }}
                        className="bg-amber-400 transition-all duration-300"
                        title={`Có hỗ trợ: ${item.assisted}`}
                      />
                    </>
                  ) : (
                    <div className="w-full bg-slate-100" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Lỗi lặp (error_observations nhóm theo category) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Lỗi lặp cần chú ý (Nhóm theo danh mục)
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Các điểm ngữ pháp và dùng từ thường gặp từ nhận xét của Gemini trong các bài nộp.
          </p>
        </div>

        {summary.recurringErrors.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            Chưa có đủ lỗi quan sát được ghi nhận.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summary.recurringErrors.map((err) => (
              <div
                key={err.category}
                className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 capitalize">
                    {err.category === "writing"
                      ? "✍️ Ngữ pháp / Diễn đạt viết"
                      : err.category === "reading"
                      ? "📖 Thuật ngữ / Dịch thuật"
                      : err.category === "speaking"
                      ? "🎙️ Phát âm / Độ trôi chảy"
                      : err.category === "listening"
                      ? "🎧 Nhận diện âm / Shadowing"
                      : err.category}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    {err.count} lần
                  </span>
                </div>

                {err.samples.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Trích đoạn lỗi:
                    </span>
                    {err.samples.map((s, idx) => (
                      <p
                        key={idx}
                        className="text-xs text-slate-700 bg-white p-1.5 rounded border border-slate-100 italic"
                      >
                        &quot;{s}&quot;
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Danh sách bài có bản sửa để so sánh */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            So sánh bài gốc & Bản sửa (Revisions)
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Bằng chứng cải thiện thực tế giữa lần nộp đầu và các lần sửa lại sau phản hồi của AI.
          </p>
        </div>

        {summary.revisionComparisons.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            Chưa có bài nào được viết/nói lại bản sửa. Khi bạn sửa bài dựa trên góp ý, các bản so sánh sẽ xuất hiện tại đây.
          </div>
        ) : (
          <div className="space-y-3">
            {summary.revisionComparisons.map((comp) => {
              const isExpanded = expandedCompId === comp.revisedSubmissionId;

              return (
                <div
                  key={comp.revisedSubmissionId}
                  className="border border-slate-200 rounded-xl p-4 space-y-3 transition hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-blue-600">
                        {comp.activityId}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        {comp.activityTitle}
                      </h3>
                    </div>
                    <button
                      onClick={() =>
                        setExpandedCompId(isExpanded ? null : comp.revisedSubmissionId)
                      }
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-2.5 py-1 rounded bg-blue-50 border border-blue-100"
                    >
                      {isExpanded ? "Thu gọn ▲" : "Xem so sánh ▼"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Bản đầu */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-600">Bản đầu (Lần 1)</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            comp.originalAssisted
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {comp.originalAssisted ? "Có hỗ trợ" : "Độc lập"}
                        </span>
                      </div>
                      <p className="text-slate-700 line-clamp-3 italic">
                        &quot;{comp.originalExcerpt || "(Audio / dữ liệu)"}&quot;
                      </p>
                    </div>

                    {/* Bản sửa */}
                    <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200/60 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-emerald-900">Bản sửa (Lần 2+)</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            comp.revisedAssisted
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {comp.revisedAssisted ? "Có hỗ trợ" : "Độc lập"}
                        </span>
                      </div>
                      <p className="text-slate-800 line-clamp-3 italic">
                        &quot;{comp.revisedExcerpt || "(Audio / dữ liệu)"}&quot;
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t text-xs text-slate-600 flex justify-end">
                      <Link
                        href={`/library/${comp.activityId}`}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Mở bài tập này để luyện thêm →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
