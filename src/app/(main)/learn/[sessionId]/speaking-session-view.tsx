"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AudioRecorder } from "./audio-recorder";
import { SpeakingFeedback } from "@/server/providers/gemini";

interface SpeakingSessionViewProps {
  sessionId: string;
  targetMinutes: number;
  activity: {
    id: string;
    slot: string | null;
    title: string;
    mode: string;
    objective: string | null;
    promptText: string | null;
    feedbackGuide: string | null;
    durationMinutes: number;
  };
  parentId?: string;
  parentData?: {
    submission: {
      id: string;
      revision: number;
      body: string | null;
      assisted: boolean;
      submittedAt: Date;
      audioUrl?: string | null;
    };
    feedback: SpeakingFeedback | null;
  } | null;
}

export function SpeakingSessionView({
  sessionId,
  targetMinutes,
  activity,
  parentId,
  parentData,
}: SpeakingSessionViewProps) {
  const router = useRouter();

  // Audio state
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [notes, setNotes] = useState("");

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Timer state
  const [secondsRemaining, setSecondsRemaining] = useState(targetMinutes * 60);
  const [timerActive, setTimerActive] = useState(true);

  // Hint / help state
  const [hintShown, setHintShown] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);

  // Reference to previous revision
  const [showParentRef, setShowParentRef] = useState(Boolean(parentData));

  // Countdown timer effect
  useEffect(() => {
    if (!timerActive || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, secondsRemaining]);

  // Format seconds -> MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  // Nút xin gợi ý
  async function handleAskHint() {
    if (hintShown || hintLoading) return;
    try {
      setHintLoading(true);
      await fetch(`/api/v1/sessions/${sessionId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "hint", payload: { trigger: "speaking_prompt" } }),
      });
      setHintShown(true);
    } catch (e) {
      console.error("Lỗi khi ghi sự kiện gợi ý:", e);
      setHintShown(true);
    } finally {
      setHintLoading(false);
    }
  }

  // Nộp bài nói (Upload 2 bước)
  async function handleSubmit() {
    if (!recordedBlob) {
      setSubmitError("Vui lòng ghi âm bài nói trước khi nộp.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Bước 1: Upload media lên Supabase Storage bucket 'learner-media'
      setSubmitStep("Đang tải tệp ghi âm lên hệ thống lưu trữ...");
      const fileExt = recordedBlob.type.includes("mp4") ? "mp4" : "webm";
      const fileName = `speaking-${sessionId}-${Date.now()}.${fileExt}`;
      const fileObj = new File([recordedBlob], fileName, { type: recordedBlob.type });

      const formData = new FormData();
      formData.append("file", fileObj);
      formData.append("sessionId", sessionId);

      const mediaRes = await fetch("/api/v1/media", {
        method: "POST",
        body: formData,
      });

      const mediaData = await mediaRes.json();
      if (!mediaRes.ok || !mediaData.mediaId) {
        throw new Error(mediaData.error || "Không thể tải file âm thanh lên hệ thống.");
      }

      // Bước 2: Nộp submission kèm media_id
      setSubmitStep("AI đang lắng nghe, nhận diện phát âm và phân tích bài nói...");
      const subRes = await fetch(`/api/v1/sessions/${sessionId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_id: mediaData.mediaId,
          body: notes.trim() || undefined,
          parentId: parentId || undefined,
        }),
      });

      const subData = await subRes.json();
      if (!subRes.ok || !subData.submissionId) {
        throw new Error(subData.error || "Lỗi khi chấm bài nói.");
      }

      setSubmitStep("Hoàn tất! Đang chuyển đến bảng nhận xét...");
      router.push(`/my-work/${subData.submissionId}`);
    } catch (err) {
      console.error("Lỗi khi nộp bài nói:", err);
      setSubmitError(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi nộp bài.");
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: "768px",
        margin: "0 auto",
        padding: "16px 16px 40px",
        minHeight: "100vh",
      }}
    >
      {/* Thanh điều hướng quay lại & Đồng hồ đếm ngược */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/library"
          style={{
            fontSize: "0.875rem",
            color: "#64748b",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            minHeight: "44px",
          }}
        >
          ← Thoát phiên học
        </Link>

        {/* Đồng hồ đếm ngược */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: secondsRemaining < 300 ? "#fee2e2" : "#f1f5f9",
            color: secondsRemaining < 300 ? "#b91c1c" : "#334155",
            padding: "6px 14px",
            borderRadius: "20px",
            fontWeight: 700,
            fontSize: "0.875rem",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <span>⏱️</span>
          <span>{formatTime(secondsRemaining)}</span>
          <button
            onClick={() => setTimerActive(!timerActive)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.75rem",
              padding: "2px 4px",
              color: "inherit",
              opacity: 0.8,
            }}
            title={timerActive ? "Tạm dừng" : "Tiếp tục"}
          >
            {timerActive ? "⏸" : "▶"}
          </button>
        </div>
      </div>

      {/* Header phiên học */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "18px 20px",
          marginBottom: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: "6px",
              background: "#fef3c7",
              color: "#b45309",
            }}
          >
            🎙️ {activity.slot || "S1"} · Luyện Nói (Speaking)
          </span>

          {parentId && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: "6px",
                background: "#dbeafe",
                color: "#1e40af",
              }}
            >
              🔄 Bản nói sửa (Revision)
            </span>
          )}
        </div>

        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 6px 0",
            lineHeight: 1.35,
          }}
        >
          {activity.title}
        </h1>

        {activity.objective && (
          <p
            style={{
              fontSize: "0.875rem",
              color: "#475569",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            🎯 <strong>Mục tiêu:</strong> {activity.objective}
          </p>
        )}
      </div>

      {/* Hiển thị bản nói trước đó nếu đang sửa bài */}
      {parentData && (
        <div
          style={{
            background: "#f8fafc",
            borderRadius: "14px",
            border: "1px solid #cbd5e1",
            padding: "14px 16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            onClick={() => setShowParentRef(!showParentRef)}
          >
            <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#334155" }}>
              📋 So sánh với Bản {parentData.submission.revision} trước đó
            </div>
            <button
              style={{
                background: "none",
                border: "none",
                color: "#2563eb",
                fontSize: "0.8125rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {showParentRef ? "Thu gọn ▲" : "Xem chi tiết ▼"}
            </button>
          </div>

          {showParentRef && (
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {parentData.submission.audioUrl && (
                <div>
                  <div style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: "4px" }}>
                    🔊 Bản ghi âm trước đó (Signed URL 10 phút):
                  </div>
                  <audio
                    controls
                    src={parentData.submission.audioUrl}
                    style={{ width: "100%", height: "36px" }}
                  />
                </div>
              )}

              {parentData.submission.body && (
                <div>
                  <div style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: "2px" }}>
                    📝 Transcript bản trước:
                  </div>
                  <div
                    style={{
                      background: "#ffffff",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "0.875rem",
                      color: "#334155",
                    }}
                  >
                    {parentData.submission.body}
                  </div>
                </div>
              )}

              {parentData.feedback?.pronunciation && (
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "0.8125rem",
                    color: "#065f46",
                  }}
                >
                  <strong>🗣️ Nhận xét phát âm trước đó:</strong> {parentData.feedback.pronunciation.notes}
                </div>
              )}

              {parentData.feedback?.observations && parentData.feedback.observations.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: "4px" }}>
                    🔍 Các điểm cần cải thiện lần này:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.8125rem", color: "#b45309" }}>
                    {parentData.feedback.observations.map((obs, i) => (
                      <li key={i} style={{ marginBottom: "2px" }}>
                        {obs.suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Card đề bài & tình huống giao tiếp */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "18px 20px",
          marginBottom: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#1e293b", marginBottom: "8px" }}>
          🗣️ Tình huống nói:
        </div>
        <div
          style={{
            fontSize: "0.9375rem",
            color: "#334155",
            lineHeight: 1.6,
            background: "#f8fafc",
            padding: "14px 16px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            whiteSpace: "pre-wrap",
            marginBottom: "12px",
          }}
        >
          {activity.promptText || activity.title}
        </div>

        {/* Nút xin gợi ý */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {!hintShown ? (
            <button
              onClick={handleAskHint}
              disabled={hintLoading}
              style={{
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {hintLoading ? "Đang tải gợi ý..." : "💡 Xin gợi ý cách diễn đạt"}
            </button>
          ) : (
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "10px",
                padding: "12px 14px",
                fontSize: "0.875rem",
                color: "#1e40af",
                width: "100%",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>💡 Gợi ý cấu trúc & từ khoá:</div>
              <div style={{ lineHeight: 1.5 }}>
                {activity.feedbackGuide ||
                  "Mở đầu chào hỏi chuyên nghiệp ('Hello Dr. ..., great presentation on ...'), giới thiệu vai trò của bạn ('I am a musculoskeletal radiologist from Vietnam'), nêu câu hỏi hoặc điểm tâm đắc ('I particularly appreciated your insight on ...'), và để mở cơ hội trao đổi danh thiếp hoặc email ('Could I exchange contact with you?')."}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Khu vực ghi âm */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "20px",
          marginBottom: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#1e293b", marginBottom: "14px" }}>
          🎙️ Thu âm bài nói (Tối đa 5 phút):
        </div>

        <AudioRecorder
          maxSeconds={300}
          onRecordingComplete={(blob, durationSecs) => {
            setRecordedBlob(blob);
            setRecordedDuration(durationSecs);
            setSubmitError(null);
          }}
          onClear={() => {
            setRecordedBlob(null);
            setRecordedDuration(0);
          }}
        />

        {/* Ô ghi chú / ý chính (tuỳ chọn) */}
        <div style={{ marginTop: "16px" }}>
          <label
            htmlFor="speaking-notes"
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: "0.8125rem",
              color: "#64748b",
              marginBottom: "6px",
            }}
          >
            📝 Ghi chú hoặc bản thảo nháp của bạn (tuỳ chọn):
          </label>
          <textarea
            id="speaking-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bạn có thể gõ các ý chính hoặc nội dung dự kiến nói ở đây nếu muốn..."
            rows={2}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.875rem",
              color: "#0f172a",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {submitError && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "12px 14px",
            borderRadius: "10px",
            fontSize: "0.875rem",
            marginBottom: "16px",
          }}
        >
          ⚠️ {submitError}
        </div>
      )}

      {/* Nút nộp bài */}
      <div>
        <button
          onClick={handleSubmit}
          disabled={!recordedBlob || isSubmitting}
          style={{
            width: "100%",
            padding: "14px",
            background: !recordedBlob || isSubmitting ? "#94a3b8" : "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: !recordedBlob || isSubmitting ? "not-allowed" : "pointer",
            boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
            minHeight: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          {isSubmitting ? (
            <>
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
              <span>{submitStep || "Đang xử lý bài nói..."}</span>
            </>
          ) : (
            <>
              <span>📤</span>
              <span>
                Nộp bài & Chấm AI {recordedDuration > 0 ? `(${recordedDuration}s)` : ""}
              </span>
            </>
          )}
        </button>

        {!recordedBlob && !isSubmitting && (
          <p
            style={{
              textAlign: "center",
              fontSize: "0.75rem",
              color: "#64748b",
              marginTop: "8px",
              margin: "8px 0 0",
            }}
          >
            Hãy nhấn nút Ghi âm và nói tối thiểu vài giây trước khi nộp.
          </p>
        )}
      </div>
    </div>
  );
}
