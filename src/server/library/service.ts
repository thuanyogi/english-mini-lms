import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { activities, sources, sourceSegments } from "@/db/schema";
import { UNCATEGORIZED_TOPIC, compareTopicKeys } from "@/lib/topics";

export interface ActivityListItem {
  id: string;
  slot: string | null;
  mode: (typeof activities.$inferSelect)["mode"];
  title: string;
  objective: string | null;
  durationMinutes: number | null;
  difficulty: (typeof activities.$inferSelect)["difficulty"];
  purpose: string | null;
  output: string | null;
  topic: string | null;
  /** Trạng thái học tập của learner với bài này */
  learningStatus?: "not_started" | "in_progress" | "completed";
  /** Số lần learner đã nộp bài (>= 1 submission chưa xoá) */
  submissionCount?: number;
}

export interface TopicSummary {
  /** null = nhóm "Chưa phân loại" */
  topic: string | null;
  activityCount: number;
  /** Số bài learner đã nộp ít nhất 1 lần (0 nếu không truyền learnerId) */
  learnedCount: number;
}

export interface ActivityDetail {
  id: string;
  slot: string | null;
  mode: (typeof activities.$inferSelect)["mode"];
  title: string;
  objective: string | null;
  durationMinutes: number | null;
  difficulty: (typeof activities.$inferSelect)["difficulty"];
  purpose: string | null;
  output: string | null;
  topic: string | null;
  promptText: string | null;
  feedbackGuide: string | null;
  sourceContext?: {
    sourceTitle: string;
    page: number | null;
    excerpt?: string | null;
  } | null;
}

/**
 * Lấy danh sách activity đã approved để hiển thị trên /library.
 * ĐẢM BẢO AN TOÀN TUYỆT ĐỐI:
 * - Chỉ nạp review_state = approved (bỏ qua draft, reviewing, rejected, retired).
 * - Tuyệt đối không chọn questions_file, rubric_json, đáp án ra ngoài client.
 *
 * topicFilter: undefined/"all" = không lọc; "uncategorized" = bài chưa có topic;
 * giá trị khác = đúng chủ đề đó.
 *
 * learnerId (tùy chọn): nếu truyền sẽ join tính trạng thái học gộp (Đang học dở / Đã nộp N lần / Chưa học).
 */
export async function getApprovedActivities(
  modeFilter?: string,
  topicFilter?: string,
  learnerId?: string
): Promise<ActivityListItem[]> {
  const conditions = [eq(activities.reviewState, "approved")];

  if (modeFilter && modeFilter !== "all") {
    conditions.push(
      eq(activities.mode, modeFilter as (typeof activities.$inferSelect)["mode"])
    );
  }

  if (topicFilter && topicFilter !== "all") {
    conditions.push(
      topicFilter === UNCATEGORIZED_TOPIC
        ? isNull(activities.topic)
        : eq(activities.topic, topicFilter)
    );
  }

  const inProgressExpr = learnerId
    ? sql<boolean>`exists (
        select 1 from learning_sessions ls
        where ls.activity_id = activities.id
          and ls.learner_id = ${learnerId}
          and ls.status in ('active', 'paused')
      )`
    : sql<boolean>`false`;

  const submissionCountExpr = learnerId
    ? sql<number>`coalesce((
        select count(s.id)::int from submissions s
        inner join learning_sessions ls on s.session_id = ls.id
        where ls.activity_id = activities.id
          and s.learner_id = ${learnerId}
          and s.deleted_at is null
      ), 0)`
    : sql<number>`0`;

  const rows = await db
    .select({
      id: activities.id,
      slot: activities.slot,
      mode: activities.mode,
      title: activities.title,
      objective: activities.objective,
      durationMinutes: activities.durationMinutes,
      difficulty: activities.difficulty,
      purpose: activities.purpose,
      output: activities.output,
      topic: activities.topic,
      hasInProgress: inProgressExpr,
      submissionCount: submissionCountExpr,
    })
    .from(activities)
    .where(and(...conditions))
    .orderBy(activities.slot, activities.id);

  return rows.map((r) => {
    const subCount = Number(r.submissionCount || 0);
    let learningStatus: "not_started" | "in_progress" | "completed" = "not_started";
    if (r.hasInProgress) {
      learningStatus = "in_progress";
    } else if (subCount > 0) {
      learningStatus = "completed";
    }

    return {
      id: r.id,
      slot: r.slot,
      mode: r.mode,
      title: r.title,
      objective: r.objective,
      durationMinutes: r.durationMinutes,
      difficulty: r.difficulty,
      purpose: r.purpose,
      output: r.output,
      topic: r.topic,
      learningStatus,
      submissionCount: subCount,
    };
  });
}

/**
 * Danh sách chủ đề (distinct) của các bài đã approved, kèm số bài.
 * Nếu truyền learnerId: kèm số bài learner đã nộp (≥1 submission chưa xoá).
 * Thứ tự: chủ đề đã chốt → chủ đề lạ (ABC) → "Chưa phân loại" cuối.
 */
export async function getTopics(learnerId?: string): Promise<TopicSummary[]> {
  // Lưu ý: Drizzle bỏ tiền tố bảng cho cột trong truy vấn 1 bảng → dùng alias SQL tường minh
  // trong subquery để không bị "ambiguous column id".
  const learnedExpr = learnerId
    ? sql<string>`count(*) filter (where exists (
        select 1 from submissions s
        inner join learning_sessions ls on s.session_id = ls.id
        where ls.activity_id = activities.id
          and s.learner_id = ${learnerId}
          and s.deleted_at is null
      ))`
    : sql<string>`0`;

  const rows = await db
    .select({
      topic: activities.topic,
      activityCount: sql<string>`count(*)`,
      learnedCount: learnedExpr,
    })
    .from(activities)
    .where(eq(activities.reviewState, "approved"))
    .groupBy(activities.topic);

  return rows
    .map((r) => ({
      topic: r.topic,
      activityCount: Number(r.activityCount),
      learnedCount: Number(r.learnedCount),
    }))
    .sort((a, b) => compareTopicKeys(a.topic, b.topic));
}

/**
 * Lấy thông tin chi tiết một activity đã duyệt để hiển thị trên /library/[id].
 * Nếu không tồn tại hoặc chưa approved, trả về null.
 */
export async function getActivityDetail(
  id: string
): Promise<ActivityDetail | null> {
  const [act] = await db
    .select({
      id: activities.id,
      slot: activities.slot,
      mode: activities.mode,
      title: activities.title,
      objective: activities.objective,
      durationMinutes: activities.durationMinutes,
      difficulty: activities.difficulty,
      purpose: activities.purpose,
      output: activities.output,
      topic: activities.topic,
      promptText: activities.promptText,
      feedbackGuide: activities.feedbackGuide,
      segmentIds: activities.segmentIds,
    })
    .from(activities)
    .where(
      and(
        eq(activities.id, id),
        eq(activities.reviewState, "approved")
      )
    )
    .limit(1);

  if (!act) {
    return null;
  }

  let sourceContext: ActivityDetail["sourceContext"] = null;

  // Nếu là bài reading và có segment_ids, nạp thông tin nguồn sách/trang
  if (act.mode === "reading" && act.segmentIds && act.segmentIds.length > 0) {
    const firstSegmentId = act.segmentIds[0];
    const segmentResult = await db
      .select({
        page: sourceSegments.page,
        sourceId: sourceSegments.sourceId,
        sourceTitle: sources.title,
      })
      .from(sourceSegments)
      .innerJoin(sources, eq(sourceSegments.sourceId, sources.id))
      .where(eq(sourceSegments.id, firstSegmentId))
      .limit(1);

    if (segmentResult.length > 0) {
      sourceContext = {
        sourceTitle: segmentResult[0].sourceTitle,
        page: segmentResult[0].page,
      };
    }
  }

  return {
    id: act.id,
    slot: act.slot,
    mode: act.mode,
    title: act.title,
    objective: act.objective,
    durationMinutes: act.durationMinutes,
    difficulty: act.difficulty,
    purpose: act.purpose,
    output: act.output,
    topic: act.topic,
    promptText: act.promptText,
    feedbackGuide: act.feedbackGuide,
    sourceContext,
  };
}
