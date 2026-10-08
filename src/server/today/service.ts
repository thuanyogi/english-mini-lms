import { eq, and, lte, inArray, desc } from "drizzle-orm";
import { db } from "@/db";
import { activities, vocabularyVault, learners, learningSessions } from "@/db/schema";
import {
  getLearnerPracticeContext,
  pickRecommendedActivity,
  SKILL_NAMES_VI,
  type RecommendedActivity,
} from "./pick-activity";

export interface InProgressSessionInfo {
  sessionId: string;
  activityId: string;
  targetMinutes: number;
  status: "active" | "paused";
  title: string;
  mode: string;
  slot: string | null;
}

export interface TodayRecommendation {
  learnerName: string;
  baselineStatus: string;
  targetMinutes: 30 | 45;
  reason: string;
  recommendedActivity: RecommendedActivity | null;
  alternateActivities: Array<{
    id: string;
    slot: string | null;
    title: string;
    mode: string;
    objective: string | null;
    durationMinutes: number;
    reason: string;
  }>;
  dueVocabCount: number;
  leastPracticedSkill: string;
  streakDays: number;
  inProgressSession: InProgressSessionInfo | null;
}

function computeStreakDays(completedDates: Date[], timeZone = "Asia/Ho_Chi_Minh"): number {
  if (completedDates.length === 0) return 0;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const uniqueDays = Array.from(
    new Set(completedDates.map((d) => formatter.format(d)))
  ).sort().reverse();

  if (uniqueDays.length === 0) return 0;

  const today = new Date();
  const todayStr = formatter.format(today);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterdayStr = formatter.format(yesterday);

  // Nếu ngày gần nhất không phải hôm nay và cũng không phải hôm qua thì chuỗi đã đứt
  const mostRecent = uniqueDays[0];
  if (mostRecent !== todayStr && mostRecent !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let cursor = new Date(mostRecent === todayStr ? today : yesterday);

  for (const dayStr of uniqueDays) {
    const expectedStr = formatter.format(cursor);
    if (dayStr === expectedStr) {
      streak++;
      cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
    } else if (dayStr < expectedStr) {
      break;
    }
  }

  return streak;
}

export async function getTodayRecommendation(
  learnerId: string,
  targetMinutes: 30 | 45 = 30
): Promise<TodayRecommendation> {
  // 1. Lấy thông tin người học
  const [learner] = await db
    .select({
      displayName: learners.displayName,
      baselineStatus: learners.baselineStatus,
    })
    .from(learners)
    .where(eq(learners.id, learnerId))
    .limit(1);

  const learnerName = learner?.displayName || "Bác sĩ Minh";
  const baselineStatus = learner?.baselineStatus || "pending";

  // 2. Kiểm tra số từ vựng đến hạn ôn tập (Spaced Repetition)
  const now = new Date();
  const dueVocab = await db
    .select({ id: vocabularyVault.id })
    .from(vocabularyVault)
    .where(and(eq(vocabularyVault.learnerId, learnerId), lte(vocabularyVault.dueAt, now)));
  const dueVocabCount = dueVocab.length;

  // 3. Ngữ cảnh luyện tập: nháp dở, bài cần sửa, cân bằng 4 kỹ năng (module dùng chung)
  const ctx = await getLearnerPracticeContext(learnerId);
  const leastPracticedMode = ctx.leastPracticedMode;

  // 4. Lấy danh sách các hoạt động đã được phê duyệt (approved)
  const approvedActs = await db
    .select({
      id: activities.id,
      slot: activities.slot,
      title: activities.title,
      mode: activities.mode,
      objective: activities.objective,
      durationMinutes: activities.durationMinutes,
    })
    .from(activities)
    .where(eq(activities.reviewState, "approved"));

  // 5. Lựa chọn bài tập chính được đề xuất (luật rule-based dùng chung với /library)
  const recommended = pickRecommendedActivity(approvedActs, ctx, targetMinutes);

  // Danh sách các bài tập thay thế khi bấm "Đổi bài khác"
  const alternateActivities = approvedActs
    .filter((a) => !recommended || a.id !== recommended.id)
    .map((a) => {
      let altReason = `Bài luyện kỹ năng ${SKILL_NAMES_VI[a.mode] || a.mode} phù hợp với quỹ thời gian ${targetMinutes} phút.`;
      if (a.mode === leastPracticedMode) {
        altReason = `Lựa chọn thay thế giúp rèn luyện kỹ năng ${SKILL_NAMES_VI[a.mode]} đang cần bổ sung.`;
      }
      return {
        id: a.id,
        slot: a.slot,
        title: a.title,
        mode: a.mode,
        objective: a.objective,
        durationMinutes: a.durationMinutes || 15,
        reason: altReason,
      };
    });

  // 6. Tính số ngày học liên tiếp (Streak) từ learning_sessions có status = 'completed'
  const completedSessions = await db
    .select({
      updatedAt: learningSessions.updatedAt,
    })
    .from(learningSessions)
    .where(
      and(
        eq(learningSessions.learnerId, learnerId),
        eq(learningSessions.status, "completed")
      )
    )
    .orderBy(desc(learningSessions.updatedAt));

  const streakDays = computeStreakDays(completedSessions.map((s) => s.updatedAt));

  // 7. Tìm phiên học đang dở (active hoặc paused) gần nhất
  const [inProgress] = await db
    .select({
      sessionId: learningSessions.id,
      activityId: learningSessions.activityId,
      targetMinutes: learningSessions.targetMinutes,
      status: learningSessions.status,
      activityTitle: activities.title,
      activityMode: activities.mode,
      activitySlot: activities.slot,
    })
    .from(learningSessions)
    .innerJoin(activities, eq(learningSessions.activityId, activities.id))
    .where(
      and(
        eq(learningSessions.learnerId, learnerId),
        inArray(learningSessions.status, ["active", "paused"])
      )
    )
    .orderBy(desc(learningSessions.updatedAt))
    .limit(1);

  const inProgressSession: InProgressSessionInfo | null = inProgress
    ? {
        sessionId: inProgress.sessionId,
        activityId: inProgress.activityId,
        targetMinutes: inProgress.targetMinutes,
        status: inProgress.status as "active" | "paused",
        title: inProgress.activityTitle,
        mode: inProgress.activityMode,
        slot: inProgress.activitySlot,
      }
    : null;

  return {
    learnerName,
    baselineStatus,
    targetMinutes,
    reason: recommended?.reason || "",
    recommendedActivity: recommended,
    alternateActivities,
    dueVocabCount,
    leastPracticedSkill: SKILL_NAMES_VI[leastPracticedMode] || leastPracticedMode,
    streakDays,
    inProgressSession,
  };
}
