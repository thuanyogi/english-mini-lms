"use client";

import { useRouter } from "next/navigation";

interface MyWorkAssessmentStatusProps {
  assessment: {
    id: string;
    status: string;
    resultRef: string | null;
  } | null;
  isRetrying: boolean;
  retryError: string | null;
  onRetry: () => void;
}

export function MyWorkAssessmentStatus({
  assessment,
  isRetrying,
  retryError,
  onRetry,
}: MyWorkAssessmentStatusProps) {
  const router = useRouter();

  if (!assessment) return null;

  // 1. Trạng thái đang xếp hàng hoặc đang chấm (queued / processing)
  if (assessment.status === "queued" || assessment.status === "processing") {
    return (
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "14px",
          padding: "16px 20px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="animate-spin" style={{ fontSize: "1.25rem" }}>
            ⏳
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#166534", fontSize: "0.9375rem" }}>
              Đang chờ chấm điểm từ AI...
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#15803d", marginTop: "2px" }}>
              {assessment.status === "queued"
                ? "Bài nộp đã vào hàng đợi xử lý của hệ thống."
                : "Gemini đang phân tích bài làm và chấm điểm theo rubric."}
            </div>
          </div>
        </div>

        <button
          onClick={() => router.refresh()}
          style={{
            padding: "8px 14px",
            background: "#ffffff",
            border: "1px solid #86efac",
            borderRadius: "8px",
            fontSize: "0.8125rem",
            color: "#166534",
            fontWeight: 600,
            cursor: "pointer",
            minHeight: "40px",
          }}
        >
          🔄 Làm mới kết quả
        </button>
      </div>
    );
  }

  // 2. Trạng thái chấm thất bại (failed)
  if (assessment.status === "failed") {
    return (
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
          onClick={onRetry}
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
    );
  }

  return null;
}
