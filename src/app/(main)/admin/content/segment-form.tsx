"use client";

import { useMemo, useState } from "react";
import { validateTranscript } from "@/lib/content-fields";
import type { FieldError } from "@/lib/content-constants";
import type { AdminContentSegment, AdminContentSource } from "@/server/admin/content-sources-service";
import { sendJson } from "./api";
import { ErrorList, Field, FormShell, inputCls, textareaCls } from "./form-ui";

const orNull = (s: string) => (s.trim() === "" ? null : s);
const intOrNull = (s: string) => (s.trim() === "" ? null : Number(s));

/** Form tạo/sửa segment: nhập thẳng textContent / transcript (mỗi dòng "start|end|text"). */
export default function SegmentForm({
  segment,
  sources,
  onSaved,
  onCancel,
}: {
  segment: AdminContentSegment | null;
  sources: AdminContentSource[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isNew = segment === null;
  const [f, setF] = useState({
    id: segment?.id ?? "seg-",
    sourceId: segment?.sourceId ?? sources[0]?.id ?? "",
    page: segment?.page != null ? String(segment.page) : "",
    startSeconds: segment?.startSeconds != null ? String(segment.startSeconds) : "",
    endSeconds: segment?.endSeconds != null ? String(segment.endSeconds) : "",
    language: segment?.language ?? "en",
    verifiedTranscript: segment?.verifiedTranscript ?? false,
    textContent: segment?.textContent ?? "",
    transcriptContent: segment?.transcriptContent ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<FieldError[]>([]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const transcriptErrors = useMemo(() => validateTranscript(f.transcriptContent), [f.transcriptContent]);

  async function save() {
    setSaving(true);
    setError(null);
    setDetails([]);
    const payload: Record<string, unknown> = {
      page: intOrNull(f.page),
      startSeconds: intOrNull(f.startSeconds),
      endSeconds: intOrNull(f.endSeconds),
      language: orNull(f.language),
      verifiedTranscript: f.verifiedTranscript,
      textContent: orNull(f.textContent),
      transcriptContent: orNull(f.transcriptContent),
    };
    if (isNew) {
      payload.id = f.id.trim();
      payload.sourceId = f.sourceId;
    }
    const res = isNew
      ? await sendJson("POST", "/api/v1/admin/content/segments", payload)
      : await sendJson("PATCH", `/api/v1/admin/content/segments/${segment.id}`, payload);
    setSaving(false);
    if (res.ok) onSaved();
    else {
      setError(res.error ?? "Lưu thất bại");
      setDetails(res.details);
    }
  }

  return (
    <FormShell
      title={isNew ? "＋ Segment mới" : `Sửa segment ${segment.id}`}
      saving={saving}
      canSave={(!isNew || (f.id.length > 4 && f.sourceId !== "")) && transcriptErrors.length === 0}
      onSave={save}
      onCancel={onCancel}
    >
      <ErrorList error={error} details={details} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mã segment (id)" hint={isNew ? "Dạng seg-ten-doan. Không đổi được sau khi tạo." : "Không đổi được"}>
          <input className={inputCls} value={f.id} disabled={!isNew} onChange={(e) => set("id", e.target.value.toLowerCase())} />
        </Field>
        <Field label="Thuộc nguồn (sourceId)">
          <select className={inputCls} value={f.sourceId} disabled={!isNew} onChange={(e) => set("sourceId", e.target.value)}>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.title}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Trang">
          <input className={inputCls} inputMode="numeric" value={f.page} onChange={(e) => set("page", e.target.value)} />
        </Field>
        <Field label="Bắt đầu (giây)">
          <input className={inputCls} inputMode="numeric" value={f.startSeconds} onChange={(e) => set("startSeconds", e.target.value)} />
        </Field>
        <Field label="Kết thúc (giây)">
          <input className={inputCls} inputMode="numeric" value={f.endSeconds} onChange={(e) => set("endSeconds", e.target.value)} />
        </Field>
        <Field label="Ngôn ngữ">
          <input className={inputCls} value={f.language} onChange={(e) => set("language", e.target.value)} />
        </Field>
      </div>
      <Field label="Nội dung văn bản (textContent) — dùng cho bài đọc">
        <textarea className={textareaCls} rows={14} value={f.textContent} onChange={(e) => set("textContent", e.target.value)} />
      </Field>
      <Field label="Transcript (transcriptContent) — dùng cho bài nghe" hint='Mỗi dòng: giây_bắt_đầu|giây_kết_thúc|nội dung. Ví dụ: 95|101|Good morning, everyone.'>
        <textarea
          className={`${textareaCls} ${transcriptErrors.length ? "border-red-400" : ""}`}
          rows={14}
          value={f.transcriptContent}
          onChange={(e) => set("transcriptContent", e.target.value)}
        />
      </Field>
      {transcriptErrors.length > 0 && (
        <ul role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 list-disc pl-6">
          {transcriptErrors.slice(0, 8).map((e, i) => (
            <li key={i}>{e.message}</li>
          ))}
        </ul>
      )}
      <label className="flex items-center gap-3 min-h-[44px] text-base text-slate-700">
        <input type="checkbox" className="h-5 w-5" checked={f.verifiedTranscript} onChange={(e) => set("verifiedTranscript", e.target.checked)} />
        Transcript đã được đối chiếu với audio
      </label>
    </FormShell>
  );
}
