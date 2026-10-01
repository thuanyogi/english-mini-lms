"use client";

import { useState } from "react";

interface MyWorkSubmissionBodyProps {
  submissionId: string;
  activityMode: string;
  body: string | null;
  confirmedTranscript?: string | null;
  audioUrl?: string | null;
  renderSubmissionContent: (body: string | null) => React.ReactNode;
}

export function MyWorkSubmissionBody({
  submissionId,
  activityMode,
  body,
  confirmedTranscript,
  audioUrl,
  renderSubmissionContent,
}: MyWorkSubmissionBodyProps) {
  const initialText = confirmedTranscript || body || "";
  const [transcriptText, setTranscriptText] = useState(initialText);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [isSavingTranscript, setIsSavingTranscript] = useState(false);
  const [transcriptSaveSuccess, setTranscriptSaveSuccess] = useState(false);

  async function handleSaveTranscript() {
    try {
      setIsSavingTranscript(true);
      const res = await fetch(`/api/v1/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed_transcript: transcriptText }),
      });
      if (!res.ok) {
        throw new Error("Không thể lưu transcript");
      }
      setIsEditingTranscript(false);
      setTranscriptSaveSuccess(true);
      setTimeout(() => setTranscriptSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Lỗi lưu transcript:", e);
      alert("Không thể lưu transcript đã xác nhận.");
    } finally {
      setIsSavingTranscript(false);
    }
  }

  return (
    <div>
      {/* Trình phát âm thanh nếu bài nộp có file ghi âm */}
      {audioUrl && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "16px 20px",
            marginBottom: "16px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
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
            <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#334155" }}>
              🔊 Bản ghi âm của bạn:
            </div>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Bảo mật · Signed URL (10 phút)
            </span>
          </div>
          <audio controls src={audioUrl} style={{ width: "100%", height: "40px" }} />
        </div>
      )}

      {/* Thẻ nội dung / transcript */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "18px 20px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            fontSize: "0.8125rem",
            fontWeight: 700,
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "10px",
          }}
        >
          {activityMode === "speaking" ? "📝 Transcript bài nói:" : "📄 Nội dung bài nộp:"}
        </div>

        {/* Chế độ sửa/xác nhận transcript đối với Speaking */}
        {activityMode === "speaking" && isEditingTranscript ? (
          <div>
            <textarea
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #2563eb",
                fontSize: "0.875rem",
                lineHeight: 1.6,
                color: "#0f172a",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                onClick={() => {
                  setTranscriptText(initialText);
                  setIsEditingTranscript(false);
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#f1f5f9",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                }}
              >
                Huỷ
              </button>
              <button
                onClick={handleSaveTranscript}
                disabled={isSavingTranscript}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#16a34a",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "0.8125rem",
                  cursor: isSavingTranscript ? "not-allowed" : "pointer",
                }}
              >
                {isSavingTranscript ? "Đang lưu..." : "✅ Lưu transcript đã xác nhận"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: "0.9375rem",
                lineHeight: 1.7,
                color: "#1e293b",
                whiteSpace: "pre-wrap",
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "10px",
                border: "1px solid #f1f5f9",
              }}
            >
              {renderSubmissionContent(transcriptText || body)}
            </div>

            {activityMode === "speaking" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "10px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {transcriptSaveSuccess ? (
                  <span style={{ fontSize: "0.8125rem", color: "#16a34a", fontWeight: 600 }}>
                    ✓ Đã cập nhật transcript làm bằng chứng học tập!
                  </span>
                ) : (
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Bác sĩ có thể chỉnh sửa các thuật ngữ chuyên ngành AI nhận diện chưa chuẩn.
                  </span>
                )}
                <button
                  onClick={() => setIsEditingTranscript(true)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "0.8125rem",
                    color: "#2563eb",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ✏️ Chỉnh sửa / Xác nhận
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
