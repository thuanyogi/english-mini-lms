import Link from "next/link";
import type { TopicSummary } from "@/server/library/service";
import { getTopicMeta, UNCATEGORIZED_TOPIC } from "@/lib/topics";

/**
 * Màn đầu của /library: lưới thẻ chủ đề.
 * Mỗi thẻ là Link tới /library?topic=<key> nên deep-link và nút Back của trình duyệt đều chạy đúng.
 */
export function TopicGrid({ topics }: { topics: TopicSummary[] }) {
  if (topics.length === 0) {
    return (
      <div
        style={{
          background: "#ffffff",
          border: "1px dashed #cbd5e1",
          borderRadius: "16px",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📭</div>
        <p style={{ fontWeight: 600, color: "#1e293b", margin: "0 0 4px" }}>
          Chưa có bài học nào
        </p>
        <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0 }}>
          Nội dung đang được biên soạn hoặc chưa chuyển sang trạng thái đã duyệt (approved).
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((t, index) => {
        const meta = getTopicMeta(t.topic);
        const key = t.topic ?? UNCATEGORIZED_TOPIC;
        const progressPct =
          t.activityCount > 0
            ? Math.round((t.learnedCount / t.activityCount) * 100)
            : 0;

        return (
          <Link
            key={key}
            href={`/library?topic=${encodeURIComponent(key)}`}
            data-tour={index === 0 ? "library-card" : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              textDecoration: "none",
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              padding: "18px 16px",
              minHeight: "44px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              transition: "transform 0.1s ease, border-color 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                aria-hidden
                style={{
                  fontSize: "1.75rem",
                  width: "48px",
                  height: "48px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "12px",
                  background: "#f1f5f9",
                  flexShrink: 0,
                }}
              >
                {meta.icon}
              </span>
              <h2
                style={{
                  fontSize: "1.0625rem",
                  fontWeight: 600,
                  color: "#0f172a",
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {meta.name}
              </h2>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.875rem",
                color: "#475569",
              }}
            >
              <span>{t.activityCount} bài</span>
              <span style={{ color: "#64748b" }}>
                Đã học {t.learnedCount}/{t.activityCount}
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{
                height: "6px",
                borderRadius: "3px",
                background: "#e2e8f0",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPct}%`,
                  height: "100%",
                  background: "#2563eb",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
