"use client";

import { getTopicMeta } from "@/lib/topics";
import type { AdminContentActivity } from "@/server/admin/content-service";
import type { AdminContentSegment, AdminContentSource } from "@/server/admin/content-sources-service";

const BADGE: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  reviewing: "bg-amber-100 text-amber-800 border-amber-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  retired: "bg-gray-100 text-gray-500 border-gray-200",
};

export function StateBadge({ state }: { state: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${BADGE[state] ?? BADGE.draft}`}
    >
      {state}
    </span>
  );
}

const editBtn =
  "min-h-[44px] min-w-[64px] px-3 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100";
const th = "py-2.5 px-3 whitespace-nowrap";
const td = "py-2 px-3";

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider border-b">
          <tr>
            {head.map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function ActivitiesTable({
  rows,
  onEdit,
}: {
  rows: AdminContentActivity[];
  onEdit: (a: AdminContentActivity) => void;
}) {
  return (
    <Table head={["ID", "Tiêu đề", "Kỹ năng", "Chủ đề", "Trạng thái", ""]}>
      {rows.length === 0 && (
        <tr>
          <td colSpan={6} className="py-6 text-center text-slate-400 italic">
            Không có bài nào.
          </td>
        </tr>
      )}
      {rows.map((a) => {
        const topic = getTopicMeta(a.topic);
        return (
          <tr key={a.id} className="hover:bg-slate-50/50">
            <td className={`${td} font-mono text-xs text-slate-500`}>{a.id}</td>
            <td className={`${td} font-medium text-slate-800 min-w-[180px]`}>{a.title}</td>
            <td className={td}>{a.mode}</td>
            <td className={`${td} whitespace-nowrap`}>
              {topic.icon} {topic.name}
            </td>
            <td className={td}>
              <StateBadge state={a.reviewState} />
            </td>
            <td className={td}>
              <button type="button" className={editBtn} onClick={() => onEdit(a)} aria-label={`Sửa bài ${a.id}`}>
                ✏️ Sửa
              </button>
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

export function SourcesTable({
  rows,
  onEdit,
}: {
  rows: AdminContentSource[];
  onEdit: (s: AdminContentSource) => void;
}) {
  return (
    <Table head={["ID", "Tiêu đề", "Loại", "URL", "Trạng thái", ""]}>
      {rows.map((s) => (
        <tr key={s.id} className="hover:bg-slate-50/50">
          <td className={`${td} font-mono text-xs text-slate-500`}>{s.id}</td>
          <td className={`${td} font-medium text-slate-800 min-w-[160px]`}>{s.title}</td>
          <td className={td}>{s.kind}</td>
          <td className={`${td} max-w-[160px] truncate text-xs`}>{s.url ?? "—"}</td>
          <td className={td}>
            <StateBadge state={s.reviewState} />
          </td>
          <td className={td}>
            <button type="button" className={editBtn} onClick={() => onEdit(s)} aria-label={`Sửa nguồn ${s.id}`}>
              ✏️ Sửa
            </button>
          </td>
        </tr>
      ))}
    </Table>
  );
}

export function SegmentsTable({
  rows,
  onEdit,
}: {
  rows: AdminContentSegment[];
  onEdit: (s: AdminContentSegment) => void;
}) {
  return (
    <Table head={["ID", "Nguồn", "Vị trí", "Nội dung", ""]}>
      {rows.map((s) => (
        <tr key={s.id} className="hover:bg-slate-50/50">
          <td className={`${td} font-mono text-xs text-slate-500`}>{s.id}</td>
          <td className={`${td} font-mono text-xs`}>{s.sourceId}</td>
          <td className={`${td} whitespace-nowrap`}>
            {s.page != null ? `tr.${s.page}` : s.startSeconds != null ? `${s.startSeconds}–${s.endSeconds ?? "?"}s` : "—"}
          </td>
          <td className={`${td} text-xs`}>
            {[s.textContent ? "text" : "", s.transcriptContent ? "transcript" : ""].filter(Boolean).join(" + ") || "trống"}
          </td>
          <td className={td}>
            <button type="button" className={editBtn} onClick={() => onEdit(s)} aria-label={`Sửa segment ${s.id}`}>
              ✏️ Sửa
            </button>
          </td>
        </tr>
      ))}
    </Table>
  );
}
