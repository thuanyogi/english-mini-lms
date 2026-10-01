"use client";

import { WritingFeedback } from "@/server/providers/gemini";

interface MyWorkCompareProps {
  currentSubmission: {
    revision: number;
    body: string | null;
    audioUrl?: string | null;
  };
  currentFeedback: (WritingFeedback & {
    pronunciation?: { status: "assessed" | "not_assessable"; notes: string } | null;
  }) | null;
  parent: {
    submission: {
      revision: number;
      body: string | null;
      audioUrl?: string | null;
    };
    feedback: (WritingFeedback & {
      pronunciation?: { status: "assessed" | "not_assessable"; notes: string } | null;
    }) | null;
  };
  renderSubmissionContent: (body: string | null) => React.ReactNode;
}

export function MyWorkCompare({
  currentSubmission,
  currentFeedback,
  parent,
  renderSubmissionContent,
}: MyWorkCompareProps) {
  const parentObservations = parent.feedback?.observations || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {/* Cột Bản 1 (Gốc) */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.875rem",
              color: "#64748b",
              paddingBottom: "6px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            Bản {parent.submission.revision} (Gốc)
          </div>

          {/* Âm thanh Bản 1 nếu có */}
          {parent.submission.audioUrl && (
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>
                🔊 Ghi âm Bản 1 (Signed URL 10 phút):
              </div>
              <audio
                controls
                src={parent.submission.audioUrl}
                style={{ width: "100%", height: "36px" }}
              />
            </div>
          )}

          {/* Nhận xét phát âm Bản 1 nếu có */}
          {parent.feedback?.pronunciation && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                padding: "8px 10px",
                fontSize: "0.75rem",
                color: "#166534",
              }}
            >
              <strong>🗣️ Phát âm Bản 1:</strong> {parent.feedback.pronunciation.notes}
            </div>
          )}

          {/* Bài làm Bản 1 */}
          <div
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "#334155",
              whiteSpace: "pre-wrap",
            }}
          >
            {renderSubmissionContent(parent.submission.body)}
          </div>

          {/* OBSERVATIONS CỦA BẢN 1 (Góp ý để đối chiếu) */}
          {parentObservations.length > 0 && (
            <div
              style={{
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px dashed #cbd5e1",
              }}
            >
              <div
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "#92400e",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>🔍</span>
                <span>Góp ý cần sửa từ Bản 1 ({parentObservations.length}):</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {parentObservations.map((obs, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#fffbeb",
                      border: "1px solid #fef3c7",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      fontSize: "0.75rem",
                      color: "#78350f",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: "2px" }}>
                      📍 {obs.location} ({obs.category || "ngữ pháp"}):
                    </div>
                    <div style={{ color: "#9f1239", fontStyle: "italic", marginBottom: "4px" }}>
                      &quot;{obs.original}&quot;
                    </div>
                    <div>
                      <strong>Cách sửa:</strong> {obs.suggestion}
                    </div>
                    {obs.example && (
                      <div style={{ color: "#065f46", marginTop: "2px" }}>
                        <strong>Mẫu:</strong> &quot;{obs.example}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cột Bản 2 (Đã sửa) */}
        <div
          style={{
            background: "#ffffff",
            border: "2px solid #2563eb",
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.875rem",
              color: "#2563eb",
              paddingBottom: "6px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            Bản {currentSubmission.revision} (Đã sửa)
          </div>

          {/* Âm thanh Bản 2 nếu có */}
          {currentSubmission.audioUrl && (
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#2563eb", marginBottom: "4px" }}>
                🔊 Ghi âm Bản 2 (Signed URL 10 phút):
              </div>
              <audio
                controls
                src={currentSubmission.audioUrl}
                style={{ width: "100%", height: "36px" }}
              />
            </div>
          )}

          {/* Nhận xét phát âm Bản 2 nếu có */}
          {currentFeedback?.pronunciation && (
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "8px",
                padding: "8px 10px",
                fontSize: "0.75rem",
                color: "#1e40af",
              }}
            >
              <strong>🗣️ Phát âm Bản 2:</strong> {currentFeedback.pronunciation.notes}
            </div>
          )}

          {/* Bài làm Bản 2 */}
          <div
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "#0f172a",
              whiteSpace: "pre-wrap",
            }}
          >
            {renderSubmissionContent(currentSubmission.body)}
          </div>
        </div>
      </div>
    </div>
  );
}
