"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StartSessionButtons({ activityId }: { activityId: string }) {
  const router = useRouter();
  const [loadingMinutes, setLoadingMinutes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStartSession(minutes: number) {
    try {
      setLoadingMinutes(minutes);
      setError(null);

      const res = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId,
          targetMinutes: minutes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể tạo phiên học");
      }

      router.push(`/learn/${data.sessionId}`);
    } catch (err) {
      console.error("Lỗi bắt đầu phiên học:", err);
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
      setLoadingMinutes(null);
    }
  }

  return (
    <div style={{ marginTop: "24px" }}>
      {error && (
        <div
          style={{
            marginBottom: "12px",
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            color: "#b91c1c",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <button
          onClick={() => handleStartSession(30)}
          disabled={loadingMinutes !== null}
          style={{
            minHeight: "48px",
            padding: "12px 16px",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loadingMinutes !== null ? "not-allowed" : "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
            opacity: loadingMinutes !== null ? 0.7 : 1,
            transition: "all 0.15s ease",
          }}
        >
          <span>{loadingMinutes === 30 ? "Đang tạo phiên..." : "Bắt đầu 30 phút"}</span>
          <span style={{ fontSize: "0.6875rem", opacity: 0.85, fontWeight: 400 }}>
            Tiêu chuẩn mỗi ngày
          </span>
        </button>

        <button
          onClick={() => handleStartSession(45)}
          disabled={loadingMinutes !== null}
          style={{
            minHeight: "48px",
            padding: "12px 16px",
            background: "#0f172a",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loadingMinutes !== null ? "not-allowed" : "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            boxShadow: "0 2px 4px rgba(15,23,42,0.15)",
            opacity: loadingMinutes !== null ? 0.7 : 1,
            transition: "all 0.15s ease",
          }}
        >
          <span>{loadingMinutes === 45 ? "Đang tạo phiên..." : "Bắt đầu 45 phút"}</span>
          <span style={{ fontSize: "0.6875rem", opacity: 0.85, fontWeight: 400 }}>
            Chuyên sâu / sửa bài
          </span>
        </button>
      </div>
    </div>
  );
}
