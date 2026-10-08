import Link from "next/link";
import {
  getApprovedActivities,
  getTopics,
} from "@/server/library/service";
import { getCurrentLearner } from "@/server/auth";
import {
  getLearnerPracticeContext,
  pickRecommendedActivity,
} from "@/server/today/pick-activity";
import { getTopicMeta, isValidTopicKey, UNCATEGORIZED_TOPIC } from "@/lib/topics";
import { ActivityList } from "./activity-list";
import { TopicGrid } from "./topic-grid";

export const dynamic = "force-dynamic";

interface LibraryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = await searchParams;
  const rawTopic = Array.isArray(params.topic) ? params.topic[0] : params.topic;
  const topicKey = rawTopic?.trim() ? rawTopic.trim() : null;

  const learner = await getCurrentLearner();

  // Màn đầu: lưới chủ đề. Màn chủ đề: danh sách bài của chủ đề đó.
  const topics = topicKey ? [] : await getTopics(learner?.id);
  const topicIsValid =
    topicKey !== null &&
    (topicKey === UNCATEGORIZED_TOPIC || isValidTopicKey(topicKey));
  const activities =
    topicKey && topicIsValid
      ? await getApprovedActivities(undefined, topicKey, learner?.id)
      : [];

  // 💡 Gợi ý: 1 bài đầu của chủ đề, dùng chung luật rule-based với /today
  let suggestedActivityId: string | null = null;
  if (learner && activities.length > 0) {
    const ctx = await getLearnerPracticeContext(learner.id);
    suggestedActivityId = pickRecommendedActivity(activities, ctx, 30)?.id ?? null;
  }

  const topicMeta = topicKey ? getTopicMeta(topicKey) : null;

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pt-4 pb-6 lg:max-w-[1100px]">
      {/* Header trang */}
      <div style={{ marginBottom: "16px" }}>
        <h1
          style={{
            fontSize: "1.375rem",
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 4px",
            letterSpacing: "-0.01em",
          }}
        >
          📖 Thư viện bài học
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#64748b",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {topicMeta
            ? "Chọn một bài trong chủ đề để xem đề và bắt đầu phiên học."
            : "Chọn một chủ đề để xem các bài học bên trong."}
        </p>
      </div>

      {topicMeta ? (
        <>
          {/* Quay lại danh sách chủ đề + tên chủ đề */}
          <div style={{ marginBottom: "12px" }}>
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
              ← Tất cả chủ đề
            </Link>
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "#0f172a",
                margin: "0 0 4px",
              }}
            >
              {topicMeta.icon} {topicMeta.name}
            </h2>
          </div>

          <ActivityList
            key={topicKey}
            activities={activities}
            suggestedActivityId={suggestedActivityId}
          />
        </>
      ) : (
        <TopicGrid topics={topics} />
      )}
    </div>
  );
}
