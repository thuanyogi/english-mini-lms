"use client";

import type { AdminContentSegment, AdminContentSource } from "@/server/admin/content-sources-service";

function describe(seg: AdminContentSegment, sources: AdminContentSource[]): string {
  const src = sources.find((s) => s.id === seg.sourceId);
  const where =
    seg.page != null
      ? `tr.${seg.page}`
      : seg.startSeconds != null
        ? `${seg.startSeconds}–${seg.endSeconds ?? "?"}s`
        : "";
  const has = [seg.textContent ? "text" : "", seg.transcriptContent ? "transcript" : ""]
    .filter(Boolean)
    .join("+");
  return [seg.id, src?.title ?? seg.sourceId, where, has ? `(${has})` : "(trống)"].filter(Boolean).join(" · ");
}

/**
 * Multi-select segment cho một bài. Màn học CHỈ dùng segment đầu tiên,
 * nên có thứ tự và nút "đặt làm chính".
 */
export default function SegmentPicker({
  segments,
  sources,
  selected,
  onChange,
}: {
  segments: AdminContentSegment[];
  sources: AdminContentSource[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }
  function makePrimary(id: string) {
    onChange([id, ...selected.filter((s) => s !== id)]);
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-slate-700">Segment gắn với bài</span>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-300 divide-y divide-slate-100 bg-white">
        {segments.length === 0 && (
          <p className="p-3 text-sm text-slate-500 italic">Chưa có segment — tạo bằng “＋ Segment mới”.</p>
        )}
        {segments.map((seg) => (
          <label key={seg.id} className="flex items-start gap-3 px-3 py-2.5 min-h-[44px] cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5"
              checked={selected.includes(seg.id)}
              onChange={() => toggle(seg.id)}
            />
            <span className="text-sm text-slate-700 break-words">{describe(seg, sources)}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <ol className="space-y-1 text-sm">
          {selected.map((id, i) => (
            <li key={id} className="flex items-center gap-2">
              <code className="px-1.5 py-0.5 rounded bg-slate-100">{id}</code>
              {i === 0 ? (
                <span className="text-xs font-medium text-indigo-700">★ Chính — màn học dùng segment này</span>
              ) : (
                <button
                  type="button"
                  onClick={() => makePrimary(id)}
                  className="text-xs text-indigo-600 underline min-h-[32px]"
                >
                  đặt làm chính
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
