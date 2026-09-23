"use client";

import { useState } from "react";
import Link from "next/link";
import { ActivityListItem } from "@/server/library/service";

const MODE_CONFIG: Record<
  string,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  writing: {
    label: "Viết",
    icon: "✍️",
    bg: "#eef2ff",
    text: "#4338ca",
    border: "#c7d2fe",
  },
  reading: {
    label: "Đọc–dịch",
    icon: "📖",
    bg: "#ecfdf5",
    text: "#047857",
    border: "#a7f3d0",
  },
  speaking: {
    label: "Nói",
    icon: "🎙️",
    bg: "#fffbeb",
    text: "#b45309",
    border: "#fde68a",
  },
  listening: {
    label: "Nghe",
    icon: "🎧",
    bg: "#f0f9ff",
    text: "#0369a1",
    border: "#bae6fd",
  },
  "ielts-writing": {
    label: "IELTS Viết",
    icon: "📝",
    bg: "#faf5ff",
    text: "#7e22ce",
    border: "#e9d5ff",
  },
  "ielts-reading": {
    label: "IELTS Đọc",
    icon: "📑",
    bg: "#f0fdf4",
    text: "#15803d",
    border: "#bbf7d0",
  },
  "ielts-speaking": {
    label: "IELTS Nói",
    icon: "🗣️",
    bg: "#fff7ed",
    text: "#c2410c",
    border: "#fed7aa",
  },
  "ielts-listening": {
    label: "IELTS Nghe",
    icon: "🎵",
    bg: "#eff6ff",
    text: "#1d4ed8",
    border: "#bfdbfe",
  },
};

const FILTER_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "writing", label: "Viết" },
  { id: "reading", label: "Đọc–dịch" },
  { id: "speaking", label: "Nói" },
  { id: "listening", label: "Nghe" },
];

export function ActivityList({
  activities,
}: {
  activities: ActivityListItem[];
}) {
  const [selectedMode, setSelectedMode] = useState<string>("all");

  const filteredActivities =
    selectedMode === "all"
      ? activities
      : activities.filter((act) => act.mode === selectedMode);

  return (
    <div>
      {/* Thanh bộ lọc Mode */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "12px",
          marginBottom: "16px",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = selectedMode === tab.id;
          const count =
            tab.id === "all"
              ? activities.length
              : activities.filter((a) => a.mode === tab.id).length;

          return (
            <button
              key={tab.id}
              onClick={() => setSelectedMode(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "20px",
                fontSize: "0.875rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#ffffff" : "#475569",
                background: isActive ? "#2563eb" : "#f1f5f9",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                minHeight: "44px",
                transition: "all 0.15s ease",
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  background: isActive ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                  color: isActive ? "#ffffff" : "#64748b",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Danh sách thẻ bài học */}
      {filteredActivities.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            border: "1px dashed #cbd5e1",
            borderRadius: "16px",
            padding: "48px 24px",
            textAlign: "center",
            marginTop: "16px",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📭</div>
          <p style={{ fontWeight: 600, color: "#1e293b", margin: "0 0 4px" }}>
            Chưa có bài học nào trong mục này
          </p>
          <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0 }}>
            Nội dung đang được biên soạn hoặc chưa chuyển sang trạng thái đã duyệt (approved).
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredActivities.map((act) => {
            const config = MODE_CONFIG[act.mode] || {
              label: act.mode,
              icon: "📌",
              bg: "#f8fafc",
              text: "#334155",
              border: "#e2e8f0",
            };

            return (
              <Link
                key={act.id}
                href={`/library/${act.id}`}
                style={{
                  display: "block",
                  textDecoration: "none",
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  padding: "16px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  transition: "transform 0.1s ease, border-color 0.15s ease",
                }}
              >
                {/* Header card: Slot, Mode badge, duration */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: config.bg,
                        color: config.text,
                        border: `1px solid ${config.border}`,
                      }}
                    >
                      {act.slot || act.id} · {config.label}
                    </span>
                    {act.difficulty === "trial" && (
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 500,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "#f1f5f9",
                          color: "#64748b",
                        }}
                      >
                        Thử nghiệm
                      </span>
                    )}
                  </div>
                  {act.durationMinutes && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        color: "#64748b",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      ⏱️ {act.durationMinutes} phút
                    </span>
                  )}
                </div>

                {/* Tiêu đề bài học */}
                <h3
                  style={{
                    fontSize: "1.0625rem",
                    fontWeight: 600,
                    color: "#0f172a",
                    margin: "0 0 6px",
                    lineHeight: 1.35,
                  }}
                >
                  {act.title}
                </h3>

                {/* Mục tiêu cô đọng */}
                {act.objective && (
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#475569",
                      margin: "0 0 12px",
                      lineHeight: 1.45,
                    }}
                  >
                    {act.objective}
                  </p>
                )}

                {/* Footer card */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "10px",
                    borderTop: "1px solid #f1f5f9",
                    fontSize: "0.75rem",
                    color: "#64748b",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>
                      {act.output === "audio" ? "🎙️ Ghi âm giọng nói" : "✍️ Soạn thảo văn bản"}
                    </span>
                    {act.purpose && (
                      <span>• {act.purpose === "baseline" ? "Khảo sát đầu vào" : "Luyện tập"}</span>
                    )}
                  </div>
                  <span
                    style={{
                      color: "#2563eb",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    Xem chi tiết →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
