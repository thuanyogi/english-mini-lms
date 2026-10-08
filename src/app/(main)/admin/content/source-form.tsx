"use client";

import { useState } from "react";
import {
  LOCATOR_TYPES,
  REVIEW_STATES,
  SOURCE_KINDS,
  type FieldError,
} from "@/lib/content-constants";
import type { AdminContentSource } from "@/server/admin/content-sources-service";
import { sendJson } from "./api";
import { ErrorList, Field, FormShell, inputCls, textareaCls } from "./form-ui";

const orNull = (s: string) => (s.trim() === "" ? null : s.trim());

/** Form tạo/sửa nguồn (sách, video YouTube, bài báo...). Không có xoá — chỉ retired. */
export default function SourceForm({
  source,
  onSaved,
  onCancel,
}: {
  source: AdminContentSource | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isNew = source === null;
  const [f, setF] = useState({
    id: source?.id ?? "src-",
    title: source?.title ?? "",
    kind: source?.kind ?? "video",
    permission: source?.permission ?? "",
    locatorType: source?.locatorType ?? "",
    url: source?.url ?? "",
    notes: source?.notes ?? "",
    reviewState: source?.reviewState ?? "draft",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<FieldError[]>([]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setSaving(true);
    setError(null);
    setDetails([]);
    const payload: Record<string, unknown> = {
      title: f.title.trim(),
      kind: f.kind,
      permission: orNull(f.permission),
      locatorType: f.locatorType || null,
      url: orNull(f.url),
      notes: orNull(f.notes),
    };
    if (isNew) payload.id = f.id.trim();
    else payload.reviewState = f.reviewState;
    const res = isNew
      ? await sendJson("POST", "/api/v1/admin/content/sources", payload)
      : await sendJson("PATCH", `/api/v1/admin/content/sources/${source.id}`, payload);
    setSaving(false);
    if (res.ok) onSaved();
    else {
      setError(res.error ?? "Lưu thất bại");
      setDetails(res.details);
    }
  }

  return (
    <FormShell
      title={isNew ? "＋ Nguồn mới (bản nháp)" : `Sửa nguồn ${source.id}`}
      saving={saving}
      canSave={f.title.trim() !== ""}
      onSave={save}
      onCancel={onCancel}
    >
      <ErrorList error={error} details={details} />
      <Field label="Mã nguồn (id)" hint={isNew ? "Dạng src-ten-nguon (chữ thường/số, nối bằng -). Không đổi được sau khi tạo." : "Không đổi được"}>
        <input className={inputCls} value={f.id} disabled={!isNew} onChange={(e) => set("id", e.target.value.toLowerCase())} />
      </Field>
      <Field label="Tiêu đề">
        <input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Loại (kind)">
          <select className={inputCls} value={f.kind} onChange={(e) => set("kind", e.target.value)}>
            {SOURCE_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="Định vị (locatorType)">
          <select className={inputCls} value={f.locatorType} onChange={(e) => set("locatorType", e.target.value)}>
            <option value="">—</option>
            {LOCATOR_TYPES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Quyền sử dụng">
          <input className={inputCls} value={f.permission} placeholder="personal-study, public-embed, cc…" onChange={(e) => set("permission", e.target.value)} />
        </Field>
      </div>
      <Field
        label="URL"
        hint={f.kind === "video" ? "Link YouTube (https://www.youtube.com/watch?v=… hoặc youtu.be/…)" : "Link http(s), có thể để trống"}
      >
        <input className={inputCls} inputMode="url" value={f.url} onChange={(e) => set("url", e.target.value)} />
      </Field>
      <Field label="Ghi chú">
        <textarea className={textareaCls} rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
      {!isNew && (
        <Field label="Trạng thái (reviewState)" hint='"retired" = gỡ nguồn, không xoá dữ liệu.'>
          <select className={inputCls} value={f.reviewState} onChange={(e) => set("reviewState", e.target.value as typeof f.reviewState)}>
            {REVIEW_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      )}
    </FormShell>
  );
}
