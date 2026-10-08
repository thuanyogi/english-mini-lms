"use client";

import { useState } from "react";

interface SyncConflict {
  id: string;
  kind: "activity" | "source" | "segment";
  reason: string;
}

interface SyncError {
  file?: string;
  id?: string;
  message: string;
}

interface SyncResult {
  added: string[];
  updated: string[];
  skipped: string[];
  conflicts: SyncConflict[];
  errors: SyncError[];
  dryRun: boolean;
}

export default function DriveSync() {
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    setApiError(null);
    try {
      const res = await fetch("/api/v1/admin/content/sync-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const json = await res.json();
      if (!res.ok) {
        setApiError(json.error || `Lỗi ${res.status}`);
        return;
      }
      setResult(json as SyncResult);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Lỗi kết nối.");
    } finally {
      setLoading(false);
    }
  }

  const totalAdded = result?.added.filter((x) => x.startsWith("activity:")).length ?? 0;
  const totalUpdated = result?.updated.filter((x) => x.startsWith("activity:")).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">☁️</span>
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Đồng bộ từ Google Drive
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Đọc <code className="bg-slate-100 px-1 rounded text-xs">manifest.yaml</code> từ thư mục Drive và nạp nội dung đã duyệt vào cơ sở dữ liệu.
              Chỉ bài <strong>review_state=approved</strong> mới được nhập. Bài do admin tạo (origin=admin) sẽ không bị ghi đè.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <label
            id="drive-sync-dryrun-label"
            className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 select-none"
          >
            <input
              id="drive-sync-dryrun"
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-600"
            />
            <span>
              Dry-run <span className="text-slate-400">(kiểm tra, không ghi DB)</span>
            </span>
          </label>

          <button
            id="drive-sync-btn"
            onClick={handleSync}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                {dryRun ? "Đang kiểm tra..." : "Đang đồng bộ..."}
              </>
            ) : (
              <>
                <span>🔄</span>
                {dryRun ? "Kiểm tra (Dry-run)" : "Đồng bộ Google Drive"}
              </>
            )}
          </button>
        </div>

        {/* Link to setup docs */}
        <p className="text-xs text-slate-400">
          Chưa thiết lập? Xem{" "}
          <a
            href="https://github.com"
            className="text-indigo-500 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            docs/google-drive-setup.md
          </a>{" "}
          để hướng dẫn tạo Service Account và chia sẻ thư mục Drive.
        </p>
      </div>

      {/* API Error */}
      {apiError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-start gap-2">
          <span>❌</span>
          <div>
            <p className="font-semibold">Lỗi kết nối API</p>
            <p className="mt-1 font-mono text-xs">{apiError}</p>
          </div>
        </div>
      )}

      {/* Sync Result */}
      {result && (
        <div className="space-y-4">
          {/* Summary chips */}
          <div
            id="drive-sync-result"
            className={`bg-white rounded-xl border shadow-sm p-5 space-y-4 ${
              result.dryRun ? "border-amber-200" : "border-emerald-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{result.dryRun ? "🔍" : "✅"}</span>
              <h3 className="font-semibold text-slate-800">
                {result.dryRun
                  ? "Kết quả Dry-run (chưa ghi vào DB)"
                  : "Đồng bộ hoàn tất"}
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatChip
                label="Thêm mới (activity)"
                value={totalAdded}
                color="emerald"
              />
              <StatChip
                label="Cập nhật (activity)"
                value={totalUpdated}
                color="indigo"
              />
              <StatChip
                label="Conflict"
                value={result.conflicts.length}
                color={result.conflicts.length > 0 ? "amber" : "slate"}
              />
              <StatChip
                label="Lỗi"
                value={result.errors.filter((e) => !e.message.startsWith("[warning]")).length}
                color={result.errors.filter((e) => !e.message.startsWith("[warning]")).length > 0 ? "red" : "slate"}
              />
            </div>

            {/* Detail sections */}
            {result.added.length > 0 && (
              <IdList
                title="✅ Mới thêm"
                ids={result.added}
                colorClass="text-emerald-700 bg-emerald-50 border-emerald-200"
              />
            )}
            {result.updated.length > 0 && (
              <IdList
                title="🔄 Cập nhật"
                ids={result.updated}
                colorClass="text-indigo-700 bg-indigo-50 border-indigo-200"
              />
            )}
            {result.skipped.length > 0 && (
              <IdList
                title="⏭ Bỏ qua"
                ids={result.skipped}
                colorClass="text-slate-600 bg-slate-50 border-slate-200"
              />
            )}

            {result.conflicts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-800">⚡ Conflicts ({result.conflicts.length})</p>
                <div className="divide-y divide-amber-100 border border-amber-200 rounded-lg overflow-hidden">
                  {result.conflicts.map((c) => (
                    <div key={c.id} className="px-3 py-2 bg-amber-50 text-xs text-amber-900">
                      <span className="font-mono font-medium">{c.id}</span>{" "}
                      <span className="text-amber-600">({c.kind})</span>{" — "}
                      {c.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-red-800">
                  ❌ Lỗi ({result.errors.filter((e) => !e.message.startsWith("[warning]")).length})
                  {result.errors.some((e) => e.message.startsWith("[warning]")) &&
                    ` + ${result.errors.filter((e) => e.message.startsWith("[warning]")).length} cảnh báo`}
                </p>
                <div className="divide-y divide-red-100 border border-red-200 rounded-lg overflow-hidden">
                  {result.errors.map((e, i) => (
                    <div
                      key={i}
                      className={`px-3 py-2 text-xs ${
                        e.message.startsWith("[warning]")
                          ? "bg-amber-50 text-amber-800"
                          : "bg-red-50 text-red-900"
                      }`}
                    >
                      {e.id && (
                        <span className="font-mono font-medium mr-1">[{e.id}]</span>
                      )}
                      {e.file && (
                        <span className="font-mono text-slate-500 mr-1">{e.file}:</span>
                      )}
                      {e.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.added.length === 0 &&
              result.updated.length === 0 &&
              result.conflicts.length === 0 &&
              result.errors.length === 0 && (
                <p className="text-sm text-slate-500 italic">
                  Không có thay đổi nào — Drive và DB đang đồng bộ.
                </p>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "indigo" | "amber" | "red" | "slate";
}) {
  const colorMap = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-700",
    slate: "bg-slate-50 border-slate-200 text-slate-600",
  };
  return (
    <div
      className={`rounded-lg border p-3 text-center space-y-1 ${colorMap[color]}`}
    >
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] font-medium leading-tight">{label}</p>
    </div>
  );
}

function IdList({
  title,
  ids,
  colorClass,
}: {
  title: string;
  ids: string[];
  colorClass: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-slate-700">{title} ({ids.length})</p>
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id) => (
          <span
            key={id}
            className={`text-[11px] font-mono px-2 py-0.5 rounded border ${colorClass}`}
          >
            {id}
          </span>
        ))}
      </div>
    </div>
  );
}
