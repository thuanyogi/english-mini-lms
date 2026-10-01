"use client";

import { useState } from "react";
import { WritingFeedback } from "@/server/providers/gemini";

export interface FeedbackObservation {
  category?: string;
  location?: string;
  original: string;
  issue: string;
  suggestion: string;
  example?: string;
  retry_prompt?: string;
  flagged?: boolean;
}

interface FeedbackProps {
  feedback: (Omit<WritingFeedback, "observations"> & {
    id?: string;
    reviewState?: string;
    pronunciation?: { status: "assessed" | "not_assessable"; notes: string } | null;
    observations: FeedbackObservation[];
  }) | null;
}

export function MyWorkFeedback({ feedback }: FeedbackProps) {
  // Quản lý trạng thái các observation đã gắn cờ: { [index]: true }
  const [flaggedIndexes, setFlaggedIndexes] = useState<Record<number, boolean>>({});
  const [flaggingIndex, setFlaggingIndex] = useState<number | null>(null);

  if (!feedback) return null;

  async function handleFlagObservation(idx: number) {
    if (!feedback?.id) {
      alert("Không tìm thấy mã nhận xét để gắn cờ.");
      return;
    }

    const reason = prompt(
      "Vui lòng cho biết lý do bạn không đồng ý với nhận xét này (hoặc bấm OK để tiếp tục):",
      "Nhận xét AI chưa chuẩn xác hoặc máy móc"
    );
    if (reason === null) return; // Người dùng bấm Cancel

    try {
      setFlaggingIndex(idx);
      const res = await fetch(`/api/v1/feedback/${feedback.id}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observationIndex: idx,
          reason,
        }),
      });

      if (!res.ok) {
        throw new Error("Không thể gửi phản ánh");
      }

      setFlaggedIndexes((prev) => ({ ...prev, [idx]: true }));
    } catch (err) {
      alert("Lỗi khi gửi phản ánh: " + (err instanceof Error ? err.message : ""));
    } finally {
      setFlaggingIndex(null);
    }
  }

  const isUnderReview = feedback.reviewState === "under_review";

  return (
    <div>
      {/* Banner thông báo nếu cả bài đang under_review */}
      {isUnderReview && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "16px",
            fontSize: "0.8125rem",
            color: "#92400e",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>🚩</span>
          <span>
            Bài nộp này có nhận xét đang được gắn cờ <strong>Under Review</strong> để quản trị viên rà soát lại.
          </span>
        </div>
      )}

      {/* Đánh giá phát âm (Pronunciation Assessment) */}
      {feedback.pronunciation && (
        <div
          style={{
            background: feedback.pronunciation.status === "assessed" ? "#ecfdf5" : "#fef2f2",
            border: feedback.pronunciation.status === "assessed" ? "1px solid #a7f3d0" : "1px solid #fecaca",
            borderRadius: "14px",
            padding: "16px 20px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "6px",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.9375rem",
                color: feedback.pronunciation.status === "assessed" ? "#065f46" : "#991b1b",
              }}
            >
              🗣️ Đánh giá phát âm (Pronunciation Assessment)
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "6px",
                background: feedback.pronunciation.status === "assessed" ? "#d1fae5" : "#fee2e2",
                color: feedback.pronunciation.status === "assessed" ? "#065f46" : "#991b1b",
              }}
            >
              {feedback.pronunciation.status === "assessed"
                ? "Đã phân tích âm thanh"
                : "Không thể đánh giá âm thanh"}
            </span>
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: feedback.pronunciation.status === "assessed" ? "#047857" : "#b91c1c",
              lineHeight: 1.5,
            }}
          >
            {feedback.pronunciation.notes}
          </div>
        </div>
      )}

      {/* Điểm ước tính luyện tập (practice_estimate) */}
      {feedback.scores && feedback.scores.length > 0 && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "16px 20px",
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
              marginBottom: "12px",
            }}
          >
            📊 Điểm ước tính luyện tập (Practice Estimates):
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "10px",
            }}
          >
            {feedback.scores.map((sc, i) => (
              <div
                key={i}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#334155" }}>
                    {sc.dimension}
                  </span>
                  <span
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 800,
                      color: sc.value >= 7 ? "#16a34a" : "#2563eb",
                    }}
                  >
                    {sc.value}/10
                  </span>
                </div>
                {sc.note && (
                  <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "4px 0 0" }}>
                    {sc.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Điểm sáng đã làm tốt */}
      {feedback.strengths && feedback.strengths.length > 0 && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "14px",
            padding: "16px 20px",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#166534", marginBottom: "8px" }}>
            🌟 Điểm sáng đã làm tốt:
          </div>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.875rem", color: "#15803d", lineHeight: 1.5 }}>
            {feedback.strengths.map((str, idx) => (
              <li key={idx} style={{ marginBottom: "4px" }}>
                {str}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Danh sách Observations (Góp ý chi tiết kèm nút 'Tôi không đồng ý') */}
      {feedback.observations && feedback.observations.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <h2
            style={{
              fontSize: "1.0625rem",
              fontWeight: 700,
              color: "#0f172a",
              margin: "0 0 12px",
            }}
          >
            🔍 Chi tiết các vị trí cần hoàn thiện ({feedback.observations.length} điểm):
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {feedback.observations.map((obs, idx) => {
              const isFlagged = flaggedIndexes[idx] || obs.flagged;

              return (
                <div
                  key={idx}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    border: isFlagged ? "1px solid #fde68a" : "1px solid #e2e8f0",
                    padding: "16px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      flexWrap: "wrap",
                      gap: "6px",
                    }}
                  >
                    {/* Vị trí & Category */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: "#fef3c7",
                          color: "#92400e",
                        }}
                      >
                        📍 {obs.location}
                      </span>
                      {obs.category && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: "#e0e7ff",
                            color: "#3730a3",
                          }}
                        >
                          {obs.category}
                        </span>
                      )}
                    </div>

                    {/* Nút Tôi không đồng ý / Trạng thái đã gắn cờ */}
                    {isFlagged ? (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "#b45309",
                          background: "#fffbeb",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          border: "1px solid #fef3c7",
                        }}
                      >
                        ⚠️ Đã gắn cờ để rà soát
                      </span>
                    ) : (
                      <button
                        onClick={() => handleFlagObservation(idx)}
                        disabled={flaggingIndex === idx}
                        style={{
                          fontSize: "0.75rem",
                          color: "#64748b",
                          background: "transparent",
                          border: "1px dashed #cbd5e1",
                          borderRadius: "6px",
                          padding: "3px 8px",
                          cursor: flaggingIndex === idx ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        title="Bấm nếu bạn thấy nhận xét của AI chưa chuẩn xác hoặc máy móc"
                      >
                        <span>🚩</span>
                        <span>{flaggingIndex === idx ? "Đang gửi..." : "Tôi không đồng ý"}</span>
                      </button>
                    )}
                  </div>

                  {/* Câu gốc */}
                  <div
                    style={{
                      background: "#fff1f2",
                      borderLeft: "3px solid #f43f5e",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      color: "#9f1239",
                      marginBottom: "10px",
                      fontStyle: "italic",
                    }}
                  >
                    &quot;{obs.original}&quot;
                  </div>

                  {/* Vấn đề */}
                  <div style={{ fontSize: "0.875rem", color: "#334155", marginBottom: "8px" }}>
                    <strong>Vấn đề:</strong> {obs.issue}
                  </div>

                  {/* Đề xuất sửa */}
                  <div style={{ fontSize: "0.875rem", color: "#047857", marginBottom: "8px" }}>
                    <strong>Cách sửa:</strong> {obs.suggestion}
                  </div>

                  {/* Ví dụ mẫu */}
                  <div
                    style={{
                      background: "#ecfdf5",
                      borderLeft: "3px solid #10b981",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      color: "#065f46",
                      marginBottom: "10px",
                    }}
                  >
                    <strong>Câu mẫu đề xuất:</strong> &quot;{obs.example}&quot;
                  </div>

                  {/* Thử thách tự viết lại */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px dashed #cbd5e1",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "0.8125rem",
                      color: "#475569",
                    }}
                  >
                    🎯 <strong>Thử thách bản sửa:</strong> {obs.retry_prompt}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hành động tiếp theo */}
      {feedback.next_action && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "14px",
            padding: "14px 18px",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1e40af", marginBottom: "4px" }}>
            🚀 Hành động trọng tâm cho Bản 2:
          </div>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#1d4ed8", lineHeight: 1.5 }}>
            {feedback.next_action}
          </p>
        </div>
      )}

      {/* Giới hạn đánh giá */}
      {feedback.limitations && (
        <div
          style={{
            padding: "12px 14px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            fontSize: "0.75rem",
            color: "#64748b",
            lineHeight: 1.45,
          }}
        >
          ⚠️ <strong>Lưu ý:</strong> {feedback.limitations}
        </div>
      )}
    </div>
  );
}
