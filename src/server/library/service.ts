import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { activities, sources, sourceSegments } from "@/db/schema";

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
 */
export async function getApprovedActivities(
  modeFilter?: string
): Promise<ActivityListItem[]> {
  const query = db
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
    })
    .from(activities)
    .where(
      modeFilter && modeFilter !== "all"
        ? and(
            eq(activities.reviewState, "approved"),
            eq(activities.mode, modeFilter as (typeof activities.$inferSelect)["mode"])
          )
        : eq(activities.reviewState, "approved")
    )
    .orderBy(activities.slot, activities.id);

  return await query;
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
    promptText: act.promptText,
    feedbackGuide: act.feedbackGuide,
    sourceContext,
  };
}
