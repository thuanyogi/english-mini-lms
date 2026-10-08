"use client";

import type { ReactNode } from "react";
import type { FieldError } from "@/lib/content-constants";

/** Chữ ≥16px + chiều cao ≥44px cho thao tác trên điện thoại. */
export const inputCls =
  "w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500";
export const textareaCls = `${inputCls} font-mono text-sm leading-relaxed`;
export const btnPrimary =
  "min-h-[44px] px-4 rounded-lg bg-indigo-600 text-white text-base font-medium hover:bg-indigo-700 disabled:opacity-50";
export const btnGhost =
  "min-h-[44px] px-4 rounded-lg bg-slate-100 text-slate-700 text-base font-medium hover:bg-slate-200 disabled:opacity-50";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

/** Lỗi từ server: tên field + thông điệp. */
export function ErrorList({ error, details }: { error: string | null; details: FieldError[] }) {
  if (!error && details.length === 0) return null;
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 space-y-1">
      {error && <p className="font-medium">{error}</p>}
      {details.length > 0 && (
        <ul className="list-disc pl-5 space-y-0.5">
          {details.map((d, i) => (
            <li key={i}>
              <code className="font-semibold">{d.field}</code>: {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FormShell({
  title,
  saving,
  canSave,
  onSave,
  onCancel,
  children,
}: {
  title: string;
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4"
    >
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      {children}
      <div className="flex flex-wrap gap-2 pt-2 sticky bottom-0 bg-white/95 py-3 border-t">
        <button type="submit" disabled={saving || !canSave} className={btnPrimary}>
          {saving ? "Đang lưu…" : "💾 Lưu"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={btnGhost}>
          Hủy
        </button>
      </div>
    </form>
  );
}
