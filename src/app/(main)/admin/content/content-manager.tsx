"use client";

import { useCallback, useEffect, useState } from "react";
import { REVIEW_STATES } from "@/lib/content-constants";
import type { AdminContentActivity } from "@/server/admin/content-service";
import type { AdminContentSegment, AdminContentSource } from "@/server/admin/content-sources-service";
import ActivityForm from "./activity-form";
import { sendJson } from "./api";
import { ActivitiesTable, SegmentsTable, SourcesTable } from "./content-tables";
import { btnGhost, btnPrimary, inputCls } from "./form-ui";
import SegmentForm from "./segment-form";
import SourceForm from "./source-form";

type View =
  | { kind: "list" }
  | { kind: "activity"; item: AdminContentActivity | null }
  | { kind: "source"; item: AdminContentSource | null }
  | { kind: "segment"; item: AdminContentSegment | null };

/** Tab "📚 Nội dung học": quản lý bài, nguồn, segment. Không có thao tác xoá vật lý. */
export default function ContentManager() {
  const [activities, setActivities] = useState<AdminContentActivity[]>([]);
  const [sources, setSources] = useState<AdminContentSource[]>([]);
  const [segments, setSegments] = useState<AdminContentSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "list" });
  const [stateFilter, setStateFilter] = useState("all");
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, s, g] = await Promise.all([
      sendJson<{ activities: AdminContentActivity[] }>("GET", "/api/v1/admin/content/activities?state=all"),
      sendJson<{ sources: AdminContentSource[] }>("GET", "/api/v1/admin/content/sources?state=all"),
      sendJson<{ segments: AdminContentSegment[] }>("GET", "/api/v1/admin/content/segments"),
    ]);
    if (a.ok && s.ok && g.ok) {
      setActivities(a.data!.activities);
      setSources(s.data!.sources);
      setSegments(g.data!.segments);
      setError(null);
    } else {
      setError(a.error || s.error || g.error || "Không tải được nội dung");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function done(message: string) {
    setView({ kind: "list" });
    setNotice(message);
    load();
  }

  if (view.kind === "activity") {
    return (
      <ActivityForm
        activity={view.item}
        activities={activities}
        segments={segments}
        sources={sources}
        onSaved={() => done("✓ Đã lưu bài học")}
        onCancel={() => setView({ kind: "list" })}
      />
    );
  }
  if (view.kind === "source") {
    return <SourceForm source={view.item} onSaved={() => done("✓ Đã lưu nguồn")} onCancel={() => setView({ kind: "list" })} />;
  }
  if (view.kind === "segment") {
    return (
      <SegmentForm
        segment={view.item}
        sources={sources}
        onSaved={() => done("✓ Đã lưu segment")}
        onCancel={() => setView({ kind: "list" })}
      />
    );
  }

  const shown = stateFilter === "all" ? activities : activities.filter((a) => a.reviewState === stateFilter);

  return (
    <div className="space-y-6">
      {notice && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-sm rounded-lg border border-emerald-200">{notice}</div>
      )}
      {error && (
        <div role="alert" className="p-3 bg-red-50 text-red-800 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-800">📚 Bài học ({activities.length})</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Lọc theo trạng thái"
              className={`${inputCls} !w-auto`}
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
            >
              <option value="all">Tất cả</option>
              {REVIEW_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button type="button" className={btnPrimary} onClick={() => setView({ kind: "activity", item: null })}>
              ＋ Bài mới
            </button>
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải…</p>
        ) : (
          <ActivitiesTable rows={shown} onEdit={(item) => setView({ kind: "activity", item })} />
        )}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-800">🔗 Nguồn ({sources.length})</h2>
          <button type="button" className={btnGhost} onClick={() => setView({ kind: "source", item: null })}>
            ＋ Nguồn mới
          </button>
        </div>
        <SourcesTable rows={sources} onEdit={(item) => setView({ kind: "source", item })} />
      </section>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-800">✂️ Segment ({segments.length})</h2>
          <button
            type="button"
            className={btnGhost}
            disabled={sources.length === 0}
            onClick={() => setView({ kind: "segment", item: null })}
          >
            ＋ Segment mới
          </button>
        </div>
        <SegmentsTable rows={segments} onEdit={(item) => setView({ kind: "segment", item })} />
      </section>
    </div>
  );
}
