"use client";

import { useState } from "react";

export function StartSessionButtons({ activityId }: { activityId: string }) {
  const [showNotice, setShowNotice] = useState<number | null>(null);

  return (
    <div style={{ marginTop: "24px" }}>
      {showNotice && (
        <div
          style={{
            marginBottom: "12px",
            padding: "12px 16px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "12px",
            color: "#1e40af",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <strong>⏱️ Phiên học {showNotice} phút ({activityId}):</strong>
            <div style={{ fontSize: "0.8125rem", color: "#3b82f6", marginTop: "2px" }}>
              Luồng bấm giờ, soạn bài và nộp cho Gemini chấm sẽ chính thức hoạt động ở <strong>Bước 3</strong>.
            </div>
          </div>
          <button
            onClick={() => setShowNotice(null)}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              fontSize: "1.25rem",
              padding: "4px",
              marginLeft: "8px",
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <button
          onClick={() => setShowNotice(30)}
          style={{
            minHeight: "48px",
            padding: "12px 16px",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
            transition: "all 0.15s ease",
          }}
        >
          <span>Bắt đầu 30 phút</span>
          <span style={{ fontSize: "0.6875rem", opacity: 0.85, fontWeight: 400 }}>
            Tiêu chuẩn mỗi ngày
          </span>
        </button>

        <button
          onClick={() => setShowNotice(45)}
          style={{
            minHeight: "48px",
            padding: "12px 16px",
            background: "#0f172a",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            boxShadow: "0 2px 4px rgba(15,23,42,0.15)",
            transition: "all 0.15s ease",
          }}
        >
          <span>Bắt đầu 45 phút</span>
          <span style={{ fontSize: "0.6875rem", opacity: 0.85, fontWeight: 400 }}>
            Chuyên sâu / sửa bài
          </span>
        </button>
      </div>
    </div>
  );
}
