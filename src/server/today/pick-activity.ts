import { eq, and, desc, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { activities, learningSessions, submissions, drafts } from "@/db/schema";

/**
 * Module chọn bài rule-based dùng chung cho /today và /library (gợi ý trong chủ đề).
 * - getLearnerPracticeContext: đọc DB (nháp dở, bài Bản 1 chưa viết lại, cân bằng 4 kỹ năng 7 ngày).
 * - pickRecommendedActivity: hàm THUẦN, chọn 1 bài từ danh sách ứng viên theo luật (a)/(c)/(d).
 */

export interface RecommendedActivity {
  id: string;
  slot: string | null;
  title: string;
  mode: string;
  objective: string | null;
  durationMinutes: number;
  reason: string;
  actionType: "continue_draft" | "start_revision" | "new_session";
  sessionId?: string;
  parentId?: string;
}

export interface CandidateActivity {
  id: string;
  slot: string | null;
  title: string;
  mode: string;
  objective: string | null;
  durationMinutes: number | null;
}

export interface PracticeContext {
  /** Nháp dở (>20 ký tự) của phiên đang active gần nhất */
  latestDraft: { sessionId: string; activityId: string } | null;
  /** Bài nộp Bản 1 chưa có Bản 2 */
  unrevisedSubmission: { id: string; activityId: string } | null;
  /** Số bài nộp trong 7 ngày qua theo kỹ năng */
  skillCounts: Record<string, number>;
  /** Kỹ năng ít luyện nhất trong 7 ngày qua */
  leastPracticedMode: string;
}

export const SKILL_NAMES_VI: Record<string, string> = {
  writing: "Viết",
  reading: "Đọc - Dịch y khoa",
  speaking: "Nói",
  listening: "Nghe & Shadowing",
};

export async function getLearnerPracticeContext(
  learnerId: string
): Promise<PracticeContext> {
  // Quy tắc (a): nháp dở chưa nộp
  const [latestDraft] = await db
    .select({
      sessionId: drafts.sessionId,
      activityId: learningSessions.activityId,
    })
    .from(drafts)
    .innerJoin(learningSessions, eq(drafts.sessionId, learningSessions.id))
    .where(
      and(
        eq(drafts.learnerId, learnerId),
        eq(learningSessions.status, "active"),
        sql`length(coalesce(${drafts.content}, '')) > 20`
      )
    )
    .orderBy(desc(drafts.updatedAt))
    .limit(1);

  // Quy tắc (a): bài Bản 1 cần sửa (chưa có Bản 2)
  const recentSubmissions = await db
    .select({
      id: submissions.id,
      revision: submissions.revision,
      activityId: learningSessions.activityId,
      parentId: submissions.parentId,
    })
    .from(submissions)
    .innerJoin(learningSessions, eq(submissions.sessionId, learningSessions.id))
    .where(
      and(eq(submissions.learnerId, learnerId), isNull(submissions.deletedAt))
    )
    .orderBy(desc(submissions.submittedAt))
    .limit(20);

  const parentIds = new Set(
    recentSubmissions.map((s) => s.parentId).filter(Boolean)
  );
  const unrevised = recentSubmissions.find(
    (s) => s.revision === 1 && !parentIds.has(s.id)
  );

  // Quy tắc (c): cân bằng 4 kỹ năng trong 7 ngày qua
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklySubmissions = await db
    .select({ mode: activities.mode })
    .from(submissions)
    .innerJoin(learningSessions, eq(submissions.sessionId, learningSessions.id))
    .innerJoin(activities, eq(learningSessions.activityId, activities.id))
    .where(
      and(
        eq(submissions.learnerId, learnerId),
        isNull(submissions.deletedAt),
        gte(submissions.submittedAt, sevenDaysAgo)
      )
    );

  const skillCounts: Record<string, number> = {
    writing: 0,
    reading: 0,
    speaking: 0,
    listening: 0,
  };
  for (const s of weeklySubmissions) {
    if (s.mode && skillCounts[s.mode] !== undefined) {
      skillCounts[s.mode]++;
    }
  }

  // Kỹ năng ít luyện nhất lên đầu
  const sortedSkills = Object.entries(skillCounts).sort((a, b) => a[1] - b[1]);

  return {
    latestDraft:
      latestDraft && latestDraft.activityId
        ? { sessionId: latestDraft.sessionId, activityId: latestDraft.activityId }
        : null,
    unrevisedSubmission:
      unrevised && unrevised.activityId
        ? { id: unrevised.id, activityId: unrevised.activityId }
        : null,
    skillCounts,
    leastPracticedMode: sortedSkills[0][0],
  };
}

/**
 * Chọn 1 bài từ `candidates` theo luật rule-based (hàm thuần, không đụng DB):
 * (a) nháp dở → (a) viết lại Bản 2 → (c)(d) kỹ năng ít luyện nhất.
 * Chỉ chọn trong `candidates`; danh sách rỗng → null.
 */
export function pickRecommendedActivity(
  candidates: CandidateActivity[],
  ctx: PracticeContext,
  targetMinutes: 30 | 45
): RecommendedActivity | null {
  const { latestDraft, unrevisedSubmission, skillCounts, leastPracticedMode } =
    ctx;

  if (latestDraft) {
    const act = candidates.find((a) => a.id === latestDraft.activityId);
    if (act) {
      return {
        id: act.id,
        slot: act.slot,
        title: act.title,
        mode: act.mode,
        objective: act.objective,
        durationMinutes: act.durationMinutes || 15,
        reason: `Quy tắc (a): Bạn có một bản nháp đang viết dở cho bài học này. Hãy tiếp tục để hoàn thiện.`,
        actionType: "continue_draft",
        sessionId: latestDraft.sessionId,
      };
    }
  }

  if (unrevisedSubmission) {
    const act = candidates.find((a) => a.id === unrevisedSubmission.activityId);
    if (act) {
      return {
        id: act.id,
        slot: act.slot,
        title: act.title,
        mode: act.mode,
        objective: act.objective,
        durationMinutes: act.durationMinutes || 15,
        reason: `Quy tắc (a): Bạn đã có bài nộp Bản 1 kèm nhận xét từ AI. Hãy thực hiện Bản 2 (nói/viết lại) để khắc phục các lỗi ưu tiên.`,
        actionType: "start_revision",
        parentId: unrevisedSubmission.id,
      };
    }
  }

  if (candidates.length === 0) return null;

  // Ưu tiên bài thuộc kỹ năng ít luyện nhất
  const matchingSkillActs = candidates.filter(
    (a) => a.mode === leastPracticedMode
  );
  const chosenAct =
    matchingSkillActs.length > 0
      ? matchingSkillActs[0]
      : candidates.find((a) => a.mode === "speaking") || candidates[0];

  const skillName = SKILL_NAMES_VI[leastPracticedMode] || leastPracticedMode;
  const leastCount = skillCounts[leastPracticedMode] || 0;
  const reasonText =
    leastCount === 0
      ? `Quy tắc (c): Kỹ năng ${skillName} chưa được luyện bài nào trong 7 ngày qua. Hãy thực hành để cân bằng cả 4 kỹ năng!`
      : `Quy tắc (c) & (d): Kỹ năng ${skillName} ít được luyện nhất tuần này (${leastCount} bài). Thời lượng ${targetMinutes} phút phù hợp để hoàn thành bài này.`;

  return {
    id: chosenAct.id,
    slot: chosenAct.slot,
    title: chosenAct.title,
    mode: chosenAct.mode,
    objective: chosenAct.objective,
    durationMinutes: chosenAct.durationMinutes || 15,
    reason: reasonText,
    actionType: "new_session",
  };
}
