"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export interface SubmissionListItem {
  id: string;
  sessionId: string;
  revision: number;
  modality: "text" | "audio";
  assisted: boolean;
  submittedAt: string | Date;
  activityId: string;
  activityTitle: string;
  activityMode: string;
  activitySlot: string | null;
  assessmentStatus: "queued" | "processing" | "needs_input" | "feedback_ready" | "failed";
}

const MODE_CONFIG: Record<
  string,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  writing: {
    label: "Viết",
    icon: "✍️",
    bg: "#eef2ff",
    text: "#4338ca",
    border: "#c7d2fe",
  },
  reading: {
    label: "Đọc–dịch",
    icon: "📖",
    bg: "#ecfdf5",
    text: "#047857",
    border: "#a7f3d0",
  },
  speaking: {
    label: "Nói",
    icon: "🎙️",
    bg: "#fffbeb",
    text: "#b45309",
    border: "#fde68a",
  },
  listening: {
    label: "Nghe",
    icon: "🎧",
    bg: "#f0f9ff",
    text: "#0369a1",
    border: "#bae6fd",
  },
  "ielts-writing": {
    label: "IELTS Viết",
    icon: "📝",
    bg: "#faf5ff",
    text: "#7e22ce",
    border: "#e9d5ff",
  },
  "ielts-reading": {
    label: "IELTS Đọc",
    icon: "📑",
    bg: "#f0fdf4",
    text: "#15803d",
    border: "#bbf7d0",
  },
  "ielts-speaking": {
    label: "IELTS Nói",
    icon: "🗣️",
    bg: "#fff7ed",
    text: "#c2410c",
    border: "#fed7aa",
  },
  "ielts-listening": {
    label: "IELTS Nghe",
    icon: "🎵",
    bg: "#eff6ff",
    text: "#1d4ed8",
    border: "#bfdbfe",
  },
};

const FILTER_MODES = [
  { id: "all", label: "Tất cả kỹ năng" },
  { id: "writing", label: "Viết" },
  { id: "reading", label: "Đọc–dịch" },
  { id: "speaking", label: "Nói" },
  { id: "listening", label: "Nghe" },
];

const FILTER_STATUSES = [
  { id: "all", label: "Tất cả trạng thái" },
  { id: "feedback_ready", label: "Có feedback" },
  { id: "processing", label: "Đang chấm" },
  { id: "needs_input", label: "Đã gắn cờ" },
];

function renderAssessmentBadge(status: string) {
  switch (status) {
    case "feedback_ready":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span>✅</span>
          <span>Đã có feedback</span>
        </span>
      );
    case "queued":
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="animate-spin">⏳</span>
          <span>Đang chấm</span>
        </span>
      );
    case "needs_input":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span>🚩</span>
          <span>Đã gắn cờ</span>
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <span>❌</span>
          <span>Lỗi chấm</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
          <span>📄</span>
          <span>{status}</span>
        </span>
      );
  }
}

export function MyWorkListView({
  initialSubmissions = [],
}: {
  initialSubmissions?: SubmissionListItem[];
}) {
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>(initialSubmissions);
  const [loading, setLoading] = useState(initialSubmissions.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc
  const [selectedMode, setSelectedMode] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    let active = true;
    fetch("/api/v1/submissions")
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải danh sách bài làm");
        return res.json();
      })
      .then((data) => {
        if (active) {
          setSubmissions(data.submissions || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Lọc client-side
  const filteredSubmissions = submissions.filter((sub) => {
    if (selectedMode !== "all" && sub.activityMode !== selectedMode) return false;
    if (selectedStatus === "processing") {
      return sub.assessmentStatus === "queued" || sub.assessmentStatus === "processing";
    }
    if (selectedStatus === "feedback_ready") {
      return sub.assessmentStatus === "feedback_ready";
    }
    if (selectedStatus === "needs_input") {
      return sub.assessmentStatus === "needs_input";
    }
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-[768px] px-4 pt-4 pb-12 lg:max-w-[1100px]">
      {/* Header trang */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          📝 Bài của tôi
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Xem lại tất cả bài tập đã nộp, trạng thái chấm của AI và lịch sử sửa bài.
        </p>
      </div>

      {/* Thanh bộ lọc */}
      <div className="space-y-3 mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Hàng 1: Tabs Mode */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_MODES.map((tab) => {
            const isActive = selectedMode === tab.id;
            const count =
              tab.id === "all"
                ? submissions.length
                : submissions.filter((s) => s.activityMode === tab.id).length;

            return (
              <button
                key={tab.id}
                onClick={() => setSelectedMode(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[36px] ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hàng 2: Bộ lọc Trạng thái chấm (Select/Buttons) */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span className="font-medium">Trạng thái chấm:</span>
          {FILTER_STATUSES.map((st) => {
            const isActive = selectedStatus === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading & Error */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-xs">
          <div className="animate-spin text-3xl mb-3">⏳</div>
          <p className="text-sm text-slate-500 font-medium">Đang tải danh sách bài làm...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          ⚠️ {error}
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center shadow-xs">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="text-base font-bold text-slate-800">
            {submissions.length === 0
              ? "Bạn chưa có bài nộp nào"
              : "Không tìm thấy bài nộp phù hợp bộ lọc"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {submissions.length === 0
              ? "Hãy vào Thư viện để bắt đầu bài tập đầu tiên và nhận phản hồi chi tiết từ AI."
              : "Hãy thử đổi bộ lọc kỹ năng hoặc trạng thái chấm để xem các bài khác."}
          </p>
          {submissions.length === 0 && (
            <div className="mt-5">
              <Link
                href="/library"
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs"
              >
                Khám phá Thư viện bài học →
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* Danh sách bài nộp */
        <div className="space-y-3">
          {filteredSubmissions.map((sub) => {
            const config = MODE_CONFIG[sub.activityMode] || {
              label: sub.activityMode,
              icon: "📄",
              bg: "#f8fafc",
              text: "#334155",
              border: "#e2e8f0",
            };

            const submittedDate = new Date(sub.submittedAt);
            const dateStr = `${submittedDate.getHours().toString().padStart(2, "0")}:${submittedDate
              .getMinutes()
              .toString()
              .padStart(2, "0")} · ${submittedDate.toLocaleDateString("vi-VN")}`;

            return (
              <Link
                key={sub.id}
                href={`/my-work/${sub.id}`}
                className="block bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-400 hover:shadow-sm transition group no-underline"
              >
                {/* Header card: Slot, Mode, Revision, Trạng thái chấm, Assisted */}
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      style={{
                        background: config.bg,
                        color: config.text,
                        borderColor: config.border,
                      }}
                      className="text-xs font-bold px-2.5 py-0.5 rounded-md border inline-flex items-center gap-1"
                    >
                      <span>{config.icon}</span>
                      <span>
                        {sub.activitySlot ? `${sub.activitySlot} · ` : ""}
                        {config.label}
                      </span>
                    </span>

                    <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200">
                      Bản {sub.revision}
                    </span>

                    {sub.assisted ? (
                      <span className="text-xs font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 inline-flex items-center gap-1">
                        <span>💡</span>
                        <span>Có hỗ trợ</span>
                      </span>
                    ) : (
                      <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                        <span>⭐</span>
                        <span>Độc lập</span>
                      </span>
                    )}
                  </div>

                  <div>{renderAssessmentBadge(sub.assessmentStatus)}</div>
                </div>

                {/* Tiêu đề bài học */}
                <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug mb-2">
                  {sub.activityTitle}
                </h2>

                {/* Footer card: Thời gian nộp & Nút xem chi tiết */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>Nộp lúc {dateStr}</span>
                  <span className="font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Xem bài làm & nhận xét →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
