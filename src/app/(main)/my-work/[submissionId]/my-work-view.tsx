"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WritingFeedback } from "@/server/providers/gemini";

interface MyWorkViewProps {
  submission: {
    id: string;
    sessionId: string;
    revision: number;
    body: string | null;
    assisted: boolean;
    submittedAt: Date;
  };
  activity: {
    id: string;
    slot: string | null;
    title: string;
    mode: string;
    promptText: string | null;
  };
  assessment: {
    id: string;
    status: string;
    resultRef: string | null;
  } | null;
  feedback: WritingFeedback | null;
  parent: {
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

export function MyWorkView({
  submission,
  activity,
  assessment,
  feedback,
  parent,
}: MyWorkViewProps) {
  const router = useRouter();
  const [isCreatingRevision, setIsCreatingRevision] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"current" | "compare">("current");

  // Format date
  const submittedDate = new Date(submission.submittedAt);
  const formattedDate = `${submittedDate.getHours().toString().padStart(2, "0")}:${submittedDate
    .getMinutes()
    .toString()
    .padStart(2, "0")} ngày ${submittedDate.toLocaleDateString("vi-VN")}`;

  // Start revision 2
  async function handleStartRevision() {
    try {
      setIsCreatingRevision(true);
      const res = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: activity.id,
          targetMinutes: 30,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể tạo phiên sửa bài");
      }

      router.push(`/learn/${data.sessionId}?parentId=${submission.id}`);
    } catch (err) {
      console.error("Lỗi khi mở bản sửa:", err);
      setIsCreatingRevision(false);
    }
  }

  // Retry failed assessment
  async function handleRetry() {
    if (!assessment) return;
    try {
      setIsRetrying(true);
      setRetryError(null);
      const res = await fetch(`/api/v1/assessments/${assessment.id}/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Chấm lại thất bại");
      }
      router.refresh();
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Chấm lại thất bại");
    } finally {
      setIsRetrying(false);
    }
  }

  function renderSubmissionContent(body: string | null) {
    if (!body) return "(Không có nội dung)";
    try {
      const parsed = JSON.parse(body);
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed.translation || parsed.mainIdea || parsed.keyTerms)
      ) {
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {parsed.mainIdea && (
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#475569", marginBottom: "4px" }}>
                  🎯 1. Ý chính của đoạn:
                </div>
                <div style={{ color: "#334155", background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  {parsed.mainIdea}
                </div>
              </div>
            )}
            {parsed.translation && (
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#475569", marginBottom: "4px" }}>
                  🇻🇳 2. Bản dịch tiếng Việt:
                </div>
                <div style={{ color: "#0f172a", background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap" }}>
                  {parsed.translation}
                </div>
              </div>
            )}
            {parsed.keyTerms && (
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#475569", marginBottom: "4px" }}>
                  🔬 3. Ba thuật ngữ tự giải thích:
                </div>
                <div style={{ color: "#334155", background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap" }}>
                  {parsed.keyTerms}
                </div>
              </div>
            )}
          </div>
        );
      }
    } catch {
      // not JSON
    }
    return <div style={{ whiteSpace: "pre-wrap" }}>{body}</div>;
  }

  return (
    <div
      style={{
        maxWidth: "768px",
        margin: "0 auto",
        padding: "16px 16px 40px",
      }}
    >
      {/* Nút quay lại */}
      <div style={{ marginBottom: "14px" }}>
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
          ← Về Thư viện bài học
        </Link>
      </div>

      {/* Header bài làm */}
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "6px",
                background: "#eef2ff",
                color: "#4338ca",
              }}
            >
              {activity.slot || activity.id} · Bản {submission.revision}
            </span>

            {submission.assisted ? (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "#fef3c7",
                  color: "#b45309",
                  border: "1px solid #fde68a",
                }}
              >
                💡 Có hỗ trợ (Assisted)
              </span>
            ) : (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "#f0fdf4",
                  color: "#15803d",
                  border: "1px solid #bbf7d0",
                }}
              >
                ⭐ Tự làm độc lập
              </span>
            )}
          </div>

          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            Nộp lúc {formattedDate}
          </span>
        </div>

        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 12px",
            lineHeight: 1.35,
          }}
        >
          {activity.title}
        </h1>

        {/* Nút Viết bản sửa */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={handleStartRevision}
            disabled={isCreatingRevision}
            style={{
              padding: "10px 18px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: isCreatingRevision ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              minHeight: "44px",
              boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
            }}
          >
            <span>✍️</span>
            <span>
              {isCreatingRevision ? "Đang mở editor..." : `Viết bản sửa (Bản ${submission.revision + 1})`}
            </span>
          </button>

          {parent && (
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => setActiveTab("current")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: activeTab === "current" ? "#0f172a" : "#f1f5f9",
                  color: activeTab === "current" ? "#ffffff" : "#475569",
                  minHeight: "44px",
                }}
              >
                Bản {submission.revision}
              </button>
              <button
                onClick={() => setActiveTab("compare")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: activeTab === "compare" ? "#0f172a" : "#f1f5f9",
                  color: activeTab === "compare" ? "#ffffff" : "#475569",
                  minHeight: "44px",
                }}
              >
                So sánh Bản 1 & 2
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trường hợp assessment failed */}
      {assessment?.status === "failed" && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: "4px" }}>
            ❌ Không thể hoàn tất chấm điểm với Gemini
          </div>
          <p style={{ fontSize: "0.875rem", color: "#b91c1c", margin: "0 0 12px" }}>
            {assessment.resultRef || "Quá thời gian kết nối hoặc Gemini phản hồi không hợp lệ."}
          </p>
          {retryError && (
            <div style={{ fontSize: "0.8125rem", color: "#dc2626", marginBottom: "8px" }}>
              Lỗi: {retryError}
            </div>
          )}
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            style={{
              padding: "8px 16px",
              background: "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: isRetrying ? "not-allowed" : "pointer",
              minHeight: "44px",
            }}
          >
            {isRetrying ? "Đang chấm lại..." : "🔄 Chấm lại ngay"}
          </button>
        </div>
      )}

      {/* Tab so sánh Bản 1 & Bản 2 cạnh nhau */}
      {activeTab === "compare" && parent ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* Cột Bản 1 */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "14px",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  color: "#64748b",
                  marginBottom: "8px",
                  paddingBottom: "6px",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                Bản 1 (Gốc)
              </div>
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
            </div>

            {/* Cột Bản 2 */}
            <div
              style={{
                background: "#ffffff",
                border: "2px solid #2563eb",
                borderRadius: "14px",
                padding: "14px",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  color: "#2563eb",
                  marginBottom: "8px",
                  paddingBottom: "6px",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                Bản 2 (Đã sửa)
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  lineHeight: 1.6,
                  color: "#0f172a",
                  whiteSpace: "pre-wrap",
                }}
              >
                {renderSubmissionContent(submission.body)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab hiển thị bài làm hiện tại */
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
            📄 Nội dung bài nộp:
          </div>
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
            {renderSubmissionContent(submission.body)}
          </div>
        </div>
      )}

      {/* Đánh giá và Feedback từ Gemini */}
      {feedback && (
        <div>
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

          {/* Danh sách Observations (Góp ý có vị trí) */}
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
                {feedback.observations.map((obs, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      padding: "16px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    }}
                  >
                    {/* Vị trí */}
                    <div
                      style={{
                        display: "inline-block",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: "#fef3c7",
                        color: "#92400e",
                        marginBottom: "8px",
                      }}
                    >
                      📍 {obs.location}
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
                      {`"${obs.original}"`}
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
                      <strong>Câu mẫu đề xuất:</strong> {`"${obs.example}"`}
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
                ))}
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
      )}
    </div>
  );
}
