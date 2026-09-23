import Link from "next/link";
import { notFound } from "next/navigation";
import { getActivityDetail } from "@/server/library/service";
import { StartSessionButtons } from "./start-session-buttons";

export const dynamic = "force-dynamic";

const MODE_LABELS: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  writing: { label: "Viết", icon: "✍️", color: "#4338ca", bg: "#eef2ff" },
  reading: { label: "Đọc–dịch", icon: "📖", color: "#047857", bg: "#ecfdf5" },
  speaking: { label: "Nói", icon: "🎙️", color: "#b45309", bg: "#fffbeb" },
  listening: { label: "Nghe", icon: "🎧", color: "#0369a1", bg: "#f0f9ff" },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ActivityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const activity = await getActivityDetail(id);

  if (!activity) {
    notFound();
  }

  const modeInfo = MODE_LABELS[activity.mode] || {
    label: activity.mode,
    icon: "📌",
    color: "#334155",
    bg: "#f8fafc",
  };

  return (
    <div
      style={{
        maxWidth: "640px",
        margin: "0 auto",
        padding: "16px 16px 32px",
      }}
    >
      {/* Nút quay lại */}
      <div style={{ marginBottom: "16px" }}>
        <Link
          href="/library"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#64748b",
            textDecoration: "none",
            minHeight: "44px",
          }}
        >
          <span>← Quay lại Thư viện</span>
        </Link>
      </div>

      {/* Card thông tin chính */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        {/* Badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "8px",
              background: modeInfo.bg,
              color: modeInfo.color,
            }}
          >
            {activity.slot || activity.id} · {modeInfo.label}
          </span>

          {activity.durationMinutes && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                padding: "4px 8px",
                borderRadius: "6px",
                background: "#f1f5f9",
                color: "#475569",
              }}
            >
              ⏱️ {activity.durationMinutes} phút
            </span>
          )}

          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 500,
              padding: "4px 8px",
              borderRadius: "6px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#64748b",
            }}
          >
            {activity.output === "audio" ? "🎙️ Ghi âm giọng nói" : "📝 Bài viết văn bản"}
          </span>
        </div>

        {/* Tiêu đề */}
        <h1
          style={{
            fontSize: "1.375rem",
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 12px",
            lineHeight: 1.3,
          }}
        >
          {activity.title}
        </h1>

        {/* Mục tiêu bài học */}
        {activity.objective && (
          <div
            style={{
              background: "#f8fafc",
              borderRadius: "12px",
              padding: "14px",
              marginBottom: "18px",
              borderLeft: "3px solid #2563eb",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#2563eb",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "4px",
              }}
            >
              🎯 Mục tiêu buổi học
            </div>
            <p
              style={{
                fontSize: "0.9375rem",
                color: "#1e293b",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {activity.objective}
            </p>
          </div>
        )}

        {/* Ngữ cảnh nguồn trích đoạn (dành cho Reading) */}
        {activity.sourceContext && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: "12px",
              padding: "14px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#047857",
                marginBottom: "4px",
              }}
            >
              📚 Tài liệu nguồn trích đoạn
            </div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#065f46" }}>
              {activity.sourceContext.sourceTitle}
            </div>
            {activity.sourceContext.page && (
              <div style={{ fontSize: "0.8125rem", color: "#047857", marginTop: "2px" }}>
                Số trang tham khảo: <strong>Trang {activity.sourceContext.page}</strong>
              </div>
            )}
          </div>
        )}

        {/* Nội dung đề bài / Yêu cầu chi tiết */}
        {activity.promptText && (
          <div style={{ marginBottom: "18px" }}>
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "#0f172a",
                margin: "0 0 8px",
              }}
            >
              📋 Đề bài & Hướng dẫn
            </h2>
            <div
              style={{
                background: "#fdfefe",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px",
                fontSize: "0.9375rem",
                color: "#334155",
                lineHeight: 1.6,
                whiteSpace: "pre-line",
              }}
            >
              {activity.promptText}
            </div>
          </div>
        )}

        {/* Hướng dẫn nhận xét */}
        {activity.feedbackGuide && (
          <div
            style={{
              background: "#fefce8",
              border: "1px solid #fef08a",
              borderRadius: "12px",
              padding: "12px 14px",
              fontSize: "0.8125rem",
              color: "#854d0e",
              lineHeight: 1.45,
            }}
          >
            <strong>💡 Trọng tâm góp ý của AI:</strong> {activity.feedbackGuide}
          </div>
        )}

        {/* Nút bắt đầu 30 phút / 45 phút */}
        <StartSessionButtons activityId={activity.id} />
      </div>
    </div>
  );
}
