"use client";

import Link from "next/link";

interface MyWorkHeaderProps {
  activity: {
    id: string;
    slot: string | null;
    title: string;
    mode: string;
  };
  submission: {
    revision: number;
    assisted: boolean;
    submittedAt: Date;
  };
  hasParent: boolean;
  activeTab: "current" | "compare";
  onTabChange: (tab: "current" | "compare") => void;
  onStartRevision: () => void;
  isCreatingRevision: boolean;
}

export function MyWorkHeader({
  activity,
  submission,
  hasParent,
  activeTab,
  onTabChange,
  onStartRevision,
  isCreatingRevision,
}: MyWorkHeaderProps) {
  const submittedDate = new Date(submission.submittedAt);
  const formattedDate = `${submittedDate.getHours().toString().padStart(2, "0")}:${submittedDate
    .getMinutes()
    .toString()
    .padStart(2, "0")} ngày ${submittedDate.toLocaleDateString("vi-VN")}`;

  return (
    <>
      {/* Nút quay lại & Bài tiếp theo */}
      <div style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/my-work"
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
            ← Bài của tôi
          </Link>
          <span style={{ color: "#cbd5e1" }}>·</span>
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
            Thư viện
          </Link>
        </div>

        <Link
          href="/today"
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#2563eb",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 14px",
            borderRadius: "8px",
            background: "#eff6ff",
            border: "1px solid #dbeafe",
            minHeight: "40px",
          }}
        >
          <span>Bài tiếp theo</span>
          <span>→</span>
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

        {/* Nút Viết bản sửa hoặc Nói lại */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={onStartRevision}
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
            <span>{activity.mode === "speaking" ? "🎙️" : "✍️"}</span>
            <span>
              {isCreatingRevision
                ? activity.mode === "speaking"
                  ? "Đang mở phiên nói lại..."
                  : "Đang mở editor..."
                : activity.mode === "speaking"
                ? `Nói lại (Bản ${submission.revision + 1})`
                : `Viết bản sửa (Bản ${submission.revision + 1})`}
            </span>
          </button>

          <Link
            href="/today"
            style={{
              padding: "10px 18px",
              background: "#0f172a",
              color: "#ffffff",
              borderRadius: "10px",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              minHeight: "44px",
              boxShadow: "0 2px 4px rgba(15,23,42,0.15)",
            }}
          >
            <span>Bài tiếp theo</span>
            <span>→</span>
          </Link>

          {hasParent && (
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => onTabChange("current")}
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
                onClick={() => onTabChange("compare")}
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
    </>
  );
}
