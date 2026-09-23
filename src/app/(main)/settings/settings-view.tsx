"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface SubmissionItem {
  id: string;
  revision: number;
  createdAt: string;
  mediaId: string | null;
  activityId: string;
  activityTitle: string;
  activityMode: string;
}

interface LearnerProfile {
  id: string;
  displayName: string | null;
  role: "learner" | "admin";
  preferences: {
    remindEnabled?: boolean;
    remindTime?: string;
  } | null;
  timezone: string | null;
  createdAt: string;
}

const MODE_LABELS: Record<string, string> = {
  writing: "Viết (Writing)",
  reading: "Đọc - Dịch (Reading)",
  speaking: "Nói (Speaking)",
  listening: "Nghe / Shadowing",
};

export default function SettingsView() {
  const router = useRouter();
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái nhắc học
  const [remindEnabled, setRemindEnabled] = useState(false);
  const [remindTime, setRemindTime] = useState("20:00");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);

  // Xuất dữ liệu
  const [exporting, setExporting] = useState(false);

  // Xoá bài
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Đăng xuất
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/settings")
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải cài đặt");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setProfile(data.learner);
        setSubmissions(data.submissions || []);
        if (data.learner?.preferences) {
          setRemindEnabled(Boolean(data.learner.preferences.remindEnabled));
          if (data.learner.preferences.remindTime) {
            setRemindTime(data.learner.preferences.remindTime);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Lỗi khi tải thông tin");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSavePreferences(newEnabled: boolean, newTime: string) {
    try {
      setSavingPrefs(true);
      const res = await fetch("/api/v1/settings/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remindEnabled: newEnabled, remindTime: newTime }),
      });
      if (!res.ok) throw new Error("Lỗi lưu cấu hình");
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 2500);
    } catch (err) {
      alert("Không thể lưu cài đặt: " + (err instanceof Error ? err.message : ""));
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleExportData() {
    try {
      setExporting(true);
      const res = await fetch("/api/v1/settings/export");
      if (!res.ok) throw new Error("Lỗi tải bản xuất");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `english-mini-lms-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Xuất dữ liệu thất bại: " + (err instanceof Error ? err.message : ""));
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteSubmission(submissionId: string) {
    try {
      setDeletingId(submissionId);
      const res = await fetch(`/api/v1/submissions/${submissionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Không thể xoá bài");
      }
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      setDeleteConfirmId(null);
    } catch (err) {
      alert("Lỗi xoá bài: " + (err instanceof Error ? err.message : ""));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSignOut() {
    if (!confirm("Bác sĩ có chắc chắn muốn đăng xuất không?")) return;
    try {
      setLoggingOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      alert("Đăng xuất thất bại: " + (err instanceof Error ? err.message : ""));
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
        <p>Đang tải thông tin cài đặt...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* 1. Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cài đặt</h1>
          <p className="text-sm text-slate-500">
            Quản lý tài khoản, dữ liệu học tập và thông báo
          </p>
        </div>
        {profile?.role === "admin" && (
          <Link
            href="/admin"
            className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs px-3 py-1.5 rounded-lg font-semibold transition"
          >
            Quản trị (Admin) 🛠️
          </Link>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* 2. Thông tin cá nhân & Role */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Tài khoản người học
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-800">
              {profile?.displayName || "Bác sĩ Minh"}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Múi giờ: {profile?.timezone || "Asia/Ho_Chi_Minh"}
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {profile?.role === "admin" ? "Quản trị viên (Admin)" : "Người học (Learner)"}
          </span>
        </div>
      </div>

      {/* 3. Cài đặt nhắc học */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Nhắc nhở học hàng ngày
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Thông báo nhắc nhở 30–45 phút học mỗi ngày (mặc định tắt)
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={remindEnabled}
              disabled={savingPrefs}
              onChange={(e) => {
                const nextVal = e.target.checked;
                setRemindEnabled(nextVal);
                handleSavePreferences(nextVal, remindTime);
              }}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {remindEnabled && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-700">Giờ nhắc học:</span>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={remindTime}
                disabled={savingPrefs}
                onChange={(e) => {
                  const val = e.target.value;
                  setRemindTime(val);
                  handleSavePreferences(remindEnabled, val);
                }}
                className="border border-slate-300 rounded-lg px-2.5 py-1 text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {prefSuccess && (
          <div className="text-xs text-emerald-600 font-medium">
            ✓ Đã lưu cài đặt nhắc học thành công.
          </div>
        )}
      </div>

      {/* 4. Xuất dữ liệu cá nhân (JSON + link audio) */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Xuất dữ liệu của tôi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tải về toàn bộ lịch sử học tập, bài nộp, nhận xét AI, sổ từ vựng và link tải file ghi âm (JSON).
          </p>
        </div>
        <button
          onClick={handleExportData}
          disabled={exporting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
        >
          {exporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Đang tạo file sao lưu...
            </>
          ) : (
            <>
              <span>📦</span> Xuất dữ liệu học tập (JSON)
            </>
          )}
        </button>
      </div>

      {/* 5. Xoá bài nộp theo yêu cầu (Soft delete + Xoá file) */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Quản lý và xoá bài làm theo yêu cầu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Xoá mềm bài nộp khỏi tiến độ và vĩnh viễn xoá file âm thanh lưu trữ trên máy chủ.
          </p>
        </div>

        {submissions.length === 0 ? (
          <p className="text-sm text-slate-400 italic">
            Chưa có bài nộp nào được lưu.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="py-3 flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 truncate">
                    {sub.activityTitle}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{MODE_LABELS[sub.activityMode] || sub.activityMode}</span>
                    <span>•</span>
                    <span>
                      {new Date(sub.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {sub.mediaId && (
                      <span className="text-purple-600 bg-purple-50 px-1 rounded text-[11px]">
                        🎙️ Audio
                      </span>
                    )}
                  </p>
                </div>

                {deleteConfirmId === sub.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDeleteSubmission(sub.id)}
                      disabled={deletingId === sub.id}
                      className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium disabled:opacity-50"
                    >
                      {deletingId === sub.id ? "Đang xoá..." : "Xác nhận xoá"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                    >
                      Huỷ
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(sub.id)}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded transition shrink-0"
                  >
                    Xoá
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Đăng xuất */}
      <div className="pt-2">
        <button
          onClick={handleSignOut}
          disabled={loggingOut}
          className="w-full py-2.5 px-4 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition disabled:opacity-50"
        >
          {loggingOut ? "Đang đăng xuất..." : "🚪 Đăng xuất khỏi hệ thống"}
        </button>
      </div>
    </div>
  );
}
