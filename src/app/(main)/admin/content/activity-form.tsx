"use client";

import { useMemo, useState } from "react";
import {
  ACTIVITY_MODES,
  ANSWER_REVEALS,
  DIFFICULTIES,
  ID_PREFIX_BY_MODE,
  OUTPUTS,
  PURPOSES,
  REVIEW_STATES,
  modeSkill,
  type ActivityMode,
  type FieldError,
} from "@/lib/content-constants";
import { parseAndValidateQuestionsJson } from "@/lib/listening-questions";
import type { AdminContentActivity } from "@/server/admin/content-service";
import type { AdminContentSegment, AdminContentSource } from "@/server/admin/content-sources-service";
import { sendJson } from "./api";
import { ErrorList, Field, FormShell, inputCls, textareaCls } from "./form-ui";
import QuestionsEditor, { questionsToText } from "./questions-editor";
import SegmentPicker from "./segment-picker";
import TopicPicker from "./topic-picker";

/** Gợi ý id kế tiếp theo mode: W5, R5, IL2… */
function suggestId(mode: ActivityMode, existingIds: string[]): string {
  const prefix = ID_PREFIX_BY_MODE[mode];
  const used = existingIds
    .filter((id) => id.startsWith(prefix) && /^\d+$/.test(id.slice(prefix.length)))
    .map((id) => Number(id.slice(prefix.length)));
  return `${prefix}${(used.length ? Math.max(...used) : 0) + 1}`;
}

const orNull = (s: string) => (s.trim() === "" ? null : s);

export default function ActivityForm({
  activity,
  activities,
  segments,
  sources,
  onSaved,
  onCancel,
}: {
  activity: AdminContentActivity | null;
  activities: AdminContentActivity[];
  segments: AdminContentSegment[];
  sources: AdminContentSource[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isNew = activity === null;
  const existingIds = useMemo(() => activities.map((a) => a.id), [activities]);
  const existingTopics = useMemo(
    () => Array.from(new Set(activities.map((a) => a.topic).filter((t): t is string => !!t))),
    [activities]
  );

  const [idTouched, setIdTouched] = useState(false);
  const [f, setF] = useState(() => ({
    id: activity?.id ?? suggestId("writing", existingIds),
    mode: (activity?.mode ?? "writing") as ActivityMode,
    title: activity?.title ?? "",
    slot: activity?.slot ?? "",
    objective: activity?.objective ?? "",
    topic: activity?.topic ?? "",
    durationMinutes: activity?.durationMinutes != null ? String(activity.durationMinutes) : "",
    difficulty: activity?.difficulty ?? "trial",
    purpose: activity?.purpose ?? "",
    reviewState: activity?.reviewState ?? "draft",
    output: activity?.output ?? "text",
    answerReveal: activity?.answerReveal ?? "none",
    promptText: activity?.promptText ?? "",
    feedbackGuide: activity?.feedbackGuide ?? "",
    segmentIds: activity?.segmentIds ?? [],
    questionsText: activity && activity.questions == null ? "" : questionsToText(activity?.questions),
  }));
  // Chỉ gửi questions khi người dùng thực sự sửa — tránh ghi đè câu hỏi đang lấy từ file yaml
  const [initialQuestionsText] = useState(f.questionsText);
  const usesFileQuestions = !isNew && activity.questions == null && !!activity.questionsFile;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<FieldError[]>([]);

  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));
  const isListening = modeSkill(f.mode) === "listening";
  const questionsCheck = useMemo(() => parseAndValidateQuestionsJson(f.questionsText), [f.questionsText]);
  const canSave = f.title.trim() !== "" && (!isListening || questionsCheck.ok);

  function changeMode(mode: ActivityMode) {
    setF((prev) => ({
      ...prev,
      mode,
      id: isNew && !idTouched ? suggestId(mode, existingIds) : prev.id,
      output: modeSkill(mode) === "speaking" ? "audio" : prev.output === "audio" ? "text" : prev.output,
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setDetails([]);
    const payload: Record<string, unknown> = {
      mode: f.mode,
      title: f.title.trim(),
      slot: orNull(f.slot),
      objective: orNull(f.objective),
      topic: f.topic || null,
      durationMinutes: f.durationMinutes.trim() === "" ? null : Number(f.durationMinutes),
      difficulty: f.difficulty,
      purpose: f.purpose || null,
      output: f.output,
      answerReveal: f.answerReveal,
      promptText: orNull(f.promptText),
      feedbackGuide: orNull(f.feedbackGuide),
      segmentIds: f.segmentIds,
      ...(isListening && (isNew || f.questionsText !== initialQuestionsText)
        ? { questions: questionsCheck.value }
        : {}),
    };
    if (isNew) payload.id = f.id.trim();
    else payload.reviewState = f.reviewState;

    const res = isNew
      ? await sendJson("POST", "/api/v1/admin/content/activities", payload)
      : await sendJson("PATCH", `/api/v1/admin/content/activities/${activity.id}`, payload);
    setSaving(false);
    if (res.ok) onSaved();
    else {
      setError(res.error ?? "Lưu thất bại");
      setDetails(res.details);
    }
  }

  return (
    <FormShell
      title={isNew ? "＋ Bài mới (bản nháp)" : `Sửa bài ${activity.id}`}
      saving={saving}
      canSave={canSave}
      onSave={save}
      onCancel={onCancel}
    >
      <ErrorList error={error} details={details} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kỹ năng (mode)">
          <select className={inputCls} value={f.mode} onChange={(e) => changeMode(e.target.value as ActivityMode)}>
            {ACTIVITY_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Mã bài (id)"
          hint={isNew ? `Bắt đầu bằng ${ID_PREFIX_BY_MODE[f.mode]} + số, vd ${ID_PREFIX_BY_MODE[f.mode]}5. Không đổi được sau khi tạo.` : "Không đổi được"}
        >
          <input
            className={inputCls}
            value={f.id}
            disabled={!isNew}
            onChange={(e) => {
              setIdTouched(true);
              set("id", e.target.value.toUpperCase());
            }}
          />
        </Field>
      </div>

      <Field label="Tiêu đề">
        <input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} />
      </Field>
      <Field label="Mục tiêu (objective)">
        <input className={inputCls} value={f.objective} onChange={(e) => set("objective", e.target.value)} />
      </Field>

      <TopicPicker value={f.topic} existingTopics={existingTopics} onChange={(v) => set("topic", v)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Thời lượng (phút)">
          <input
            className={inputCls}
            inputMode="numeric"
            value={f.durationMinutes}
            onChange={(e) => set("durationMinutes", e.target.value)}
          />
        </Field>
        <Field label="Độ khó">
          <select className={inputCls} value={f.difficulty} onChange={(e) => set("difficulty", e.target.value as typeof f.difficulty)}>
            {DIFFICULTIES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Mục đích (purpose)">
          <select className={inputCls} value={f.purpose} onChange={(e) => set("purpose", e.target.value)}>
            <option value="">—</option>
            {PURPOSES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Slot">
          <input className={inputCls} value={f.slot} onChange={(e) => set("slot", e.target.value)} />
        </Field>
        <Field label="Đầu ra (output)">
          <select className={inputCls} value={f.output} onChange={(e) => set("output", e.target.value)}>
            {OUTPUTS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field label="Hiện đáp án">
          <select className={inputCls} value={f.answerReveal} onChange={(e) => set("answerReveal", e.target.value as typeof f.answerReveal)}>
            {ANSWER_REVEALS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Đề bài / hướng dẫn (promptText)">
        <textarea className={textareaCls} rows={10} value={f.promptText} onChange={(e) => set("promptText", e.target.value)} />
      </Field>
      <Field label="Hướng dẫn chấm / phản hồi (feedbackGuide)">
        <textarea className={textareaCls} rows={5} value={f.feedbackGuide} onChange={(e) => set("feedbackGuide", e.target.value)} />
      </Field>

      <SegmentPicker segments={segments} sources={sources} selected={f.segmentIds} onChange={(ids) => set("segmentIds", ids)} />

      {isListening && (
        <div className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Câu hỏi nghe (questions)</span>
          {usesFileQuestions && (
            <p className="text-xs text-amber-700">
              Bài này đang dùng câu hỏi từ file <code>{activity?.questionsFile}</code>. Để trống = giữ nguyên;
              nhập JSON ở dưới để thay bằng câu hỏi mới.
            </p>
          )}
          <QuestionsEditor value={f.questionsText} onChange={(t) => set("questionsText", t)} />
        </div>
      )}

      {!isNew && (
        <Field
          label="Trạng thái (reviewState)"
          hint='Chọn "retired" để gỡ bài khỏi thư viện (không xoá dữ liệu). Chuyển sang approved sẽ được server kiểm tra đủ nội dung.'
        >
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
