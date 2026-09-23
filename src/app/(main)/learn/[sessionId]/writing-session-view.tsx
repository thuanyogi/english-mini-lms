"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WritingFeedback } from "@/server/providers/gemini";

interface WritingSessionViewProps {
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
  };
  initialDraft: string;
  parentId?: string;
  parentData?: {
    submission: {
      id: string;
      revision: number;
      body: string | null;
      assisted: boolean;
      submittedAt: Date;
    };
    feedback: WritingFeedback | null;
  } | null;
}

export function WritingSessionView({
  sessionId,
  targetMinutes,
  activity,
  initialDraft,
  parentId,
  parentData,
}: WritingSessionViewProps) {
  const router = useRouter();

  // Content state
  const [text, setText] = useState(initialDraft || (parentData?.submission.body ? parentData.submission.body : ""));
  const [draftVersion, setDraftVersion] = useState(1);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Hint / assistance state
  const [hintShown, setHintShown] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Timer state
  const [secondsRemaining, setSecondsRemaining] = useState(targetMinutes * 60);
  const [timerActive, setTimerActive] = useState(true);

  // Toggle parent reference panel
  const [showParentRef, setShowParentRef] = useState(Boolean(parentData));

  // Word count calculation
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

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

  // Auto-save draft every 30s
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    const autoSaveTimer = setInterval(async () => {
      if (!textRef.current.trim() || isSubmitting) return;

      try {
        await fetch(`/api/v1/sessions/${sessionId}/drafts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: textRef.current,
            version: draftVersion + 1,
          }),
        });
        setDraftVersion((v) => v + 1);
        const now = new Date();
        setLastSavedAt(
          `${now.getHours().toString().padStart(2, "0")}:${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}`
        );
      } catch {
        // Silent fail for auto-save
      }
    }, 30000);

    return () => clearInterval(autoSaveTimer);
  }, [sessionId, draftVersion, isSubmitting]);

  // Format time MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  // Manual save draft
  async function handleSaveDraft() {
    try {
      setIsSavingDraft(true);
      const res = await fetch(`/api/v1/sessions/${sessionId}/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, version: draftVersion + 1 }),
      });
      if (res.ok) {
        setDraftVersion((v) => v + 1);
        const now = new Date();
        setLastSavedAt(
          `${now.getHours().toString().padStart(2, "0")}:${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}`
        );
      }
    } finally {
      setIsSavingDraft(false);
    }
  }

  // Request hint
  async function handleRequestHint() {
    try {
      setHintLoading(true);
      await fetch(`/api/v1/sessions/${sessionId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "hint" }),
      });
      setHintShown(true);
    } catch (err) {
      console.error("Lỗi xin gợi ý:", err);
    } finally {
      setHintLoading(false);
    }
  }

  // Submit essay for Gemini evaluation
  async function handleSubmit() {
    if (!text.trim()) {
      setSubmitError("Vui lòng viết bài trước khi nộp.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setTimerActive(false);

      const res = await fetch(`/api/v1/sessions/${sessionId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text,
          parentId: parentId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi khi nộp bài");
      }

      // Navigate to my-work page
      router.push(`/my-work/${data.submissionId}`);
    } catch (err) {
      console.error("Lỗi nộp bài:", err);
      setSubmitError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: "768px",
        margin: "0 auto",
        padding: "16px 16px 40px",
      }}
    >
      {/* Loading Overlay khi Gemini đang chấm */}
      {isSubmitting && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            color: "white",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              border: "4px solid rgba(255,255,255,0.2)",
              borderTopColor: "#38bdf8",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "20px",
            }}
          />
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 8px" }}>
            Gemini đang đọc và chấm bài của bạn...
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#cbd5e1",
              maxWidth: "380px",
              lineHeight: 1.5,
              margin: "0 0 16px",
            }}
          >
            Đang phân tích độ rõ, ngữ pháp, tính trang trọng và cấu trúc theo rubric. Quá trình mất khoảng 15–30 giây.
          </p>
          <div
            style={{
              fontSize: "0.8125rem",
              background: "rgba(255,255,255,0.1)",
              padding: "6px 14px",
              borderRadius: "20px",
              color: "#94a3b8",
            }}
          >
            Vui lòng không đóng trình duyệt
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Header thanh công cụ trên cùng */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
          background: "#ffffff",
          padding: "12px 16px",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <Link
          href={`/library/${activity.id}`}
          style={{
            fontSize: "0.875rem",
            color: "#64748b",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          ← Thoát
        </Link>

        {/* Đồng hồ đếm ngược */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: secondsRemaining < 300 ? "#fef2f2" : "#f1f5f9",
            color: secondsRemaining < 300 ? "#dc2626" : "#1e293b",
            padding: "6px 12px",
            borderRadius: "20px",
            fontWeight: 700,
            fontSize: "0.9375rem",
            letterSpacing: "0.02em",
          }}
        >
          <span>⏱️</span>
          <span>{timeFormatted}</span>
        </div>

        {/* Trạng thái lưu nháp */}
        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
          {lastSavedAt ? `Đã lưu ${lastSavedAt}` : "Chưa lưu"}
        </div>
      </div>

      {/* Thông tin bài & Đề bài */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "6px",
              background: "#eef2ff",
              color: "#4338ca",
            }}
          >
            {activity.slot || activity.id} · Viết thực tế
          </span>
          {parentId && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "6px",
                background: "#fef3c7",
                color: "#92400e",
              }}
            >
              ✍️ Đang viết Bản 2 (sửa bài)
            </span>
          )}
        </div>

        <h1
          style={{
            fontSize: "1.125rem",
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 10px",
          }}
        >
          {activity.title}
        </h1>

        {activity.objective && (
          <p
            style={{
              fontSize: "0.875rem",
              color: "#475569",
              margin: "0 0 10px",
              lineHeight: 1.45,
            }}
          >
            <strong>Mục tiêu:</strong> {activity.objective}
          </p>
        )}

        {/* Khối đề bài chi tiết */}
        {activity.promptText && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #f1f5f9",
              borderRadius: "10px",
              padding: "12px",
              fontSize: "0.875rem",
              color: "#334155",
              lineHeight: 1.5,
              whiteSpace: "pre-line",
            }}
          >
            {activity.promptText}
          </div>
        )}

        {/* Nút Xin gợi ý & Popup Gợi ý */}
        <div style={{ marginTop: "12px" }}>
          {!hintShown ? (
            <button
              onClick={handleRequestHint}
              disabled={hintLoading}
              style={{
                background: "#fffbeb",
                color: "#b45309",
                border: "1px solid #fde68a",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                minHeight: "36px",
              }}
            >
              💡 {hintLoading ? "Đang mở gợi ý..." : "Xin gợi ý dàn bài"}
            </button>
          ) : (
            <div
              style={{
                background: "#fefce8",
                border: "1px solid #fef08a",
                borderRadius: "10px",
                padding: "12px",
                fontSize: "0.8125rem",
                color: "#713f12",
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                💡 Gợi ý cấu trúc viết email hội nghị chuẩn:
              </div>
              <ul style={{ margin: "0 0 6px", paddingLeft: "18px" }}>
                <li><strong>Mở đầu:</strong> &ldquo;Dear Organizing Committee,&rdquo; hoặc &ldquo;Dear Conference Secretariat,&rdquo;</li>
                <li><strong>Đoạn 1 (Mục đích):</strong> Nêu lý do viết thư đăng ký tham dự hội nghị và gửi kèm tóm tắt báo cáo.</li>
                <li><strong>Đoạn 2 (Lý do & Kinh nghiệm):</strong> Tóm tắt chuyên khoa Cơ xương khớp, kinh nghiệm can thiệp siêu âm và lý do đề tài phù hợp với hội nghị.</li>
                <li><strong>Đoạn 3 (Yêu cầu cụ thể):</strong> Hỏi về thời hạn nộp abstract và thủ tục cấp giấy mời/đăng ký cho đại biểu quốc tế.</li>
                <li><strong>Kết thư:</strong> &ldquo;Sincerely,&rdquo; hoặc &ldquo;Best regards,&rdquo; kèm tên bạn.</li>
              </ul>
              <div style={{ fontSize: "0.75rem", color: "#b45309", fontStyle: "italic" }}>
                * Bài làm này sẽ được gắn nhãn &ldquo;Có hỗ trợ&rdquo; khi nộp.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* So sánh Bản 1 cũ nếu đang viết bản sửa */}
      {parentData && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #fed7aa",
            borderRadius: "14px",
            marginBottom: "16px",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setShowParentRef(!showParentRef)}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "#fff7ed",
              border: "none",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "#c2410c",
            }}
          >
            <span>📖 Đối chiếu Bản 1 và các lỗi cần sửa ({showParentRef ? "Thu gọn" : "Mở rộng"})</span>
            <span>{showParentRef ? "▲" : "▼"}</span>
          </button>

          {showParentRef && (
            <div style={{ padding: "14px", fontSize: "0.875rem" }}>
              <div
                style={{
                  background: "#f8fafc",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "12px",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  color: "#334155",
                }}
              >
                {parentData.submission.body}
              </div>

              {parentData.feedback?.observations && parentData.feedback.observations.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, color: "#9a3412", marginBottom: "6px" }}>
                    Các điểm cần tập trung sửa từ bản 1:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {parentData.feedback.observations.map((obs, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "#fffbeb",
                          border: "1px solid #fef3c7",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          fontSize: "0.8125rem",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "#b45309" }}>{obs.location}:</span>{" "}
                        <span style={{ color: "#78350f" }}>{obs.issue}</span> →{" "}
                        <span style={{ color: "#047857", fontWeight: 500 }}>{obs.suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Khung soạn thảo văn bản */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <label
            htmlFor="essay-editor"
            style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#0f172a" }}
          >
            Bài viết của bạn:
          </label>
          <span
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: wordCount >= 120 && wordCount <= 150 ? "#16a34a" : "#64748b",
            }}
          >
            {wordCount} từ (khuyến nghị: 120–150)
          </span>
        </div>

        <textarea
          id="essay-editor"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Viết email của bạn tại đây bằng tiếng Anh..."
          rows={12}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            fontSize: "1rem",
            lineHeight: 1.6,
            color: "#0f172a",
            fontFamily: "inherit",
            resize: "vertical",
            boxSizing: "border-box",
            outline: "none",
          }}
        />

        {submitError && (
          <div
            style={{
              marginTop: "8px",
              padding: "10px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#b91c1c",
              fontSize: "0.875rem",
            }}
          >
            {submitError}
          </div>
        )}

        {/* Thanh nút bấm hành động */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "16px",
            gap: "12px",
          }}
        >
          <button
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isSubmitting}
            style={{
              minHeight: "44px",
              padding: "10px 18px",
              background: "#f1f5f9",
              color: "#334155",
              border: "none",
              borderRadius: "10px",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isSavingDraft ? "Đang lưu..." : "💾 Lưu nháp"}
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !text.trim()}
            style={{
              minHeight: "48px",
              flex: 1,
              padding: "12px 24px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: isSubmitting || !text.trim() ? "not-allowed" : "pointer",
              boxShadow: "0 2px 4px rgba(37,99,235,0.25)",
              opacity: isSubmitting || !text.trim() ? 0.6 : 1,
            }}
          >
            {isSubmitting ? "Đang gửi bài..." : "🚀 Nộp bài cho Gemini chấm"}
          </button>
        </div>
      </div>
    </div>
  );
}
