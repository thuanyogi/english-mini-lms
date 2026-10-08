"use client";

import { useMemo } from "react";
import { parseAndValidateQuestionsJson } from "@/lib/listening-questions";
import { btnGhost, textareaCls } from "./form-ui";

const TEMPLATE = [
  {
    id: "q1",
    prompt: "What is the main topic of the audio?",
    options: [
      { id: "A", text: "Option A" },
      { id: "B", text: "Option B" },
      { id: "C", text: "Option C" },
    ],
    correct_option_id: "B",
    explanation: "Giải thích ngắn vì sao B đúng.",
    timestamp_reference: 10,
  },
];

export function questionsToText(questions: unknown): string {
  return Array.isArray(questions) && questions.length > 0 ? JSON.stringify(questions, null, 2) : "[]";
}

/**
 * JSON editor nhẹ cho câu hỏi nghe. Không chỉ check cú pháp: validate đúng schema
 * mà màn nghe + chấm điểm đọc (id, prompt, options[{id,text}], correct_option_id...).
 */
export default function QuestionsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const result = useMemo(() => parseAndValidateQuestionsJson(value), [value]);

  function prettify() {
    if (!result.ok) return;
    onChange(JSON.stringify(result.value, null, 2));
  }

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        spellCheck={false}
        aria-label="Câu hỏi nghe (JSON)"
        className={`${textareaCls} ${result.ok ? "" : "border-red-400 focus:ring-red-500"}`}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnGhost} onClick={() => onChange(JSON.stringify(TEMPLATE, null, 2))}>
          ➕ Chèn mẫu
        </button>
        <button type="button" className={btnGhost} onClick={prettify} disabled={!result.ok}>
          ✨ Định dạng
        </button>
      </div>
      {result.ok ? (
        <p className="text-sm text-emerald-700">
          ✓ Hợp lệ — {result.value.length} câu hỏi (đúng schema màn nghe đọc)
        </p>
      ) : (
        <ul role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 list-disc pl-6 space-y-0.5">
          {result.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-500">
        Mỗi câu: <code>id</code>, <code>prompt</code>, <code>options</code> [{`{id, text}`}] (≥2),{" "}
        <code>correct_option_id</code> (khớp 1 option); tuỳ chọn <code>explanation</code>,{" "}
        <code>timestamp_reference</code> (giây).
      </p>
    </div>
  );
}
