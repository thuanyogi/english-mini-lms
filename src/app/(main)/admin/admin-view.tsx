"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminDashboardData } from "@/server/admin/service";

const REVIEW_STATE_BADGES: Record<string, { label: string; className: string }> = {
  approved: {
    label: "Đã duyệt (Approved)",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  draft: {
    label: "Bản nháp (Draft)",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  reviewing: {
    label: "Đang xét (Reviewing)",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  rejected: {
    label: "Từ chối (Rejected)",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  retired: {
    label: "Đã lưu trữ (Retired)",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

const MODE_LABELS: Record<string, string> = {
  writing: "Viết",
  reading: "Đọc - Dịch",
  speaking: "Nói",
  listening: "Nghe",
};

export default function AdminView() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái retry assessment
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  // Bộ lọc activity
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("all");

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/dashboard");
      if (res.status === 403) {
        throw new Error("Bạn không có quyền truy cập trang quản trị.");
      }
      if (!res.ok) throw new Error("Không thể tải dữ liệu quản trị.");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryAssessment(assessmentId: string) {
    try {
      setRetryingId(assessmentId);
      setRetryMessage(null);
      const res = await fetch(`/api/v1/assessments/${assessmentId}/retry`, {
        method: "POST",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Chấm lại thất bại");
      }

      setRetryMessage("✓ Đã chấm lại thành công bài nộp!");
      // Tải lại dữ liệu dashboard
      await fetchDashboard();
    } catch (err) {
      alert("Lỗi chấm lại: " + (err instanceof Error ? err.message : ""));
    } finally {
      setRetryingId(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
        <p>Đang tải bảng điều khiển quản trị viên...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="text-4xl">🔒</div>
        <h2 className="text-xl font-bold text-slate-800">Từ chối truy cập</h2>
        <p className="text-sm text-slate-600">{error}</p>
        <Link
          href="/today"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Quay về Trang chủ
        </Link>
      </div>
    );
  }

  const activities = data?.activities || [];
  const failedAssessments = data?.failedAssessments || [];
  const usage = data?.usage;

  const filteredActivities = activities.filter((act) => {
    if (selectedStateFilter === "all") return true;
    return act.reviewState === selectedStateFilter;
  });

  const totalTokens = (usage?.totalInputTokens || 0) + (usage?.totalOutputTokens || 0);
  const costUsd = usage?.totalEstimatedCostUsd || 0;
  const costVnd = Math.round(costUsd * 25400);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8 pb-24">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛠️</span>
            <h1 className="text-2xl font-bold text-slate-800">
              Quản trị Hệ thống
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Giám sát tài nguyên AI, trạng thái bài tập và xử lý lỗi chấm bài
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
          >
            🔄 Làm mới
          </button>
          <Link
            href="/settings"
            className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
          >
            ⚙️ Cài đặt
          </Link>
        </div>
      </div>

      {retryMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-sm rounded-lg border border-emerald-200">
          {retryMessage}
        </div>
      )}

      {/* 2. Thẻ thống kê chi phí & Token tháng này */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Chi phí Gemini ({usage?.month})
          </p>
          <p className="text-2xl font-bold text-emerald-600">
            ${costUsd.toFixed(4)}
          </p>
          <p className="text-xs text-slate-500">
            Ước tính ~ {costVnd.toLocaleString("vi-VN")} đ
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Tổng Token tháng này
          </p>
          <p className="text-2xl font-bold text-indigo-600">
            {totalTokens.toLocaleString("vi-VN")}
          </p>
          <p className="text-xs text-slate-500">
            {usage?.totalInputTokens.toLocaleString()} in / {usage?.totalOutputTokens.toLocaleString()} out
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Số lần gọi AI tháng này
          </p>
          <p className="text-2xl font-bold text-slate-800">
            {usage?.totalRequests || 0}
          </p>
          <p className="text-xs text-slate-500">
            Lượt đánh giá & tra cứu
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Chấm lỗi (Failed)
          </p>
          <p className={`text-2xl font-bold ${failedAssessments.length > 0 ? "text-red-600" : "text-slate-800"}`}>
            {failedAssessments.length}
          </p>
          <p className="text-xs text-slate-500">
            Cần chấm lại
          </p>
        </div>
      </div>

      {/* 3. Section: Failed Assessments & Nút chấm lại */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <span>⚠️</span> Các bài nộp bị lỗi chấm ({failedAssessments.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Danh sách bài nộp gặp lỗi kết nối hoặc timeout khi gọi Gemini, có thể nhấn nút để chấm lại.
            </p>
          </div>
        </div>

        {failedAssessments.length === 0 ? (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-sm border border-emerald-100 flex items-center gap-2">
            <span>✓</span> Tất cả bài nộp đã được chấm thành công. Không có bài nào bị lỗi!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border rounded-lg overflow-hidden">
            {failedAssessments.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm hover:bg-slate-50 transition"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {item.activityTitle}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {MODE_LABELS[item.activityMode] || item.activityMode}
                    </span>
                    <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                      Failed (Lần {item.runVersion})
                    </span>
                  </div>
                  {item.submissionBodySnippet && (
                    <p className="text-xs text-slate-600 italic truncate max-w-lg">
                      &quot;{item.submissionBodySnippet}&quot;
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Thời gian: {new Date(item.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>

                <button
                  onClick={() => handleRetryAssessment(item.id)}
                  disabled={retryingId === item.id}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 shrink-0"
                >
                  {retryingId === item.id ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                      Đang chấm lại...
                    </>
                  ) : (
                    <>
                      <span>🔄</span> Chấm lại
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Section: Chi tiết Token & Hoạt động AI */}
      {usage && usage.actionBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">
            Phân rã Token & Chi phí theo thao tác
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b">
                <tr>
                  <th className="py-2.5 px-3">Thao tác (Action)</th>
                  <th className="py-2.5 px-3 text-right">Lượt gọi</th>
                  <th className="py-2.5 px-3 text-right">Input Token</th>
                  <th className="py-2.5 px-3 text-right">Output Token</th>
                  <th className="py-2.5 px-3 text-right">Chi phí ước tính</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usage.actionBreakdown.map((row) => (
                  <tr key={row.action} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                      {row.action}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium">
                      {row.count}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {row.inputTokens.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {row.outputTokens.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                      ${row.estimatedCostUsd.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Section: Hoạt động học tập & review_state */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Danh sách Hoạt động học tập ({activities.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Toàn bộ bài học trong hệ thống kèm trạng thái kiểm duyệt (review_state)
            </p>
          </div>

          {/* Lọc theo review_state */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Lọc:</span>
            <select
              value={selectedStateFilter}
              onChange={(e) => setSelectedStateFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tất cả ({activities.length})</option>
              <option value="approved">Đã duyệt (Approved)</option>
              <option value="draft">Bản nháp (Draft)</option>
              <option value="reviewing">Đang xét (Reviewing)</option>
              <option value="rejected">Từ chối (Rejected)</option>
              <option value="retired">Lưu trữ (Retired)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b">
              <tr>
                <th className="py-2.5 px-3">Mã bài (ID)</th>
                <th className="py-2.5 px-3">Tiêu đề</th>
                <th className="py-2.5 px-3">Kỹ năng</th>
                <th className="py-2.5 px-3">Thời lượng</th>
                <th className="py-2.5 px-3">Độ khó</th>
                <th className="py-2.5 px-3">Trạng thái (review_state)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                    Không có bài học nào khớp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act) => {
                  const badge = REVIEW_STATE_BADGES[act.reviewState] || {
                    label: act.reviewState,
                    className: "bg-slate-100 text-slate-700 border-slate-200",
                  };
                  return (
                    <tr key={act.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {act.id}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 max-w-xs truncate">
                        {act.title}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          {MODE_LABELS[act.mode] || act.mode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {act.durationMinutes ? `${act.durationMinutes} phút` : "—"}
                      </td>
                      <td className="py-2.5 px-3 capitalize">
                        {act.difficulty || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
