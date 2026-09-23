import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  learningSessions,
  submissions,
  drafts,
  vocabularyVault,
  learners,
} from "@/db/schema";

export interface TodayRecommendation {
  learnerName: string;
  baselineStatus: string;
  targetMinutes: 30 | 45;
  reason: string;
  recommendedActivity: {
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
  } | null;
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

  // 3. Quy tắc (a): Kiểm tra bản nháp dở hoặc bài cần sửa (Revision 2)
  // 3.1 Nháp dở chưa nộp
  const [latestDraft] = await db
    .select({
      draftId: drafts.id,
      sessionId: drafts.sessionId,
      content: drafts.content,
      activityId: learningSessions.activityId,
      sessionStatus: learningSessions.status,
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

  // 3.2 Bài tập Bản 1 cần sửa (chưa có bản revision 2)
  const recentSubmissions = await db
    .select({
      id: submissions.id,
      revision: submissions.revision,
      sessionId: submissions.sessionId,
      activityId: learningSessions.activityId,
      parentId: submissions.parentId,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .innerJoin(learningSessions, eq(submissions.sessionId, learningSessions.id))
    .where(eq(submissions.learnerId, learnerId))
    .orderBy(desc(submissions.submittedAt))
    .limit(20);

  const parentIds = new Set(recentSubmissions.map((s) => s.parentId).filter(Boolean));
  const unrevisedSubmission = recentSubmissions.find(
    (s) => s.revision === 1 && !parentIds.has(s.id)
  );

  // 4. Quy tắc (c): Phân tích cân bằng 4 kỹ năng trong 7 ngày qua
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklySubmissions = await db
    .select({
      mode: activities.mode,
    })
    .from(submissions)
    .innerJoin(learningSessions, eq(submissions.sessionId, learningSessions.id))
    .innerJoin(activities, eq(learningSessions.activityId, activities.id))
    .where(
      and(eq(submissions.learnerId, learnerId), gte(submissions.submittedAt, sevenDaysAgo))
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

  // Sắp xếp kỹ năng ít luyện nhất lên đầu
  const sortedSkills = Object.entries(skillCounts).sort((a, b) => a[1] - b[1]);
  const leastPracticedMode = sortedSkills[0][0]; // "speaking", "listening", "writing", or "reading"

  const skillNamesVi: Record<string, string> = {
    writing: "Viết",
    reading: "Đọc - Dịch y khoa",
    speaking: "Nói",
    listening: "Nghe & Shadowing",
  };

  // 5. Lấy danh sách các hoạt động đã được phê duyệt (approved)
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

  // Lựa chọn bài tập chính được đề xuất
  let recommended: TodayRecommendation["recommendedActivity"] | null = null;

  if (latestDraft && latestDraft.activityId) {
    const act = approvedActs.find((a) => a.id === latestDraft.activityId);
    if (act) {
      recommended = {
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

  if (!recommended && unrevisedSubmission && unrevisedSubmission.activityId) {
    const act = approvedActs.find((a) => a.id === unrevisedSubmission.activityId);
    if (act) {
      recommended = {
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

  if (!recommended) {
    // Ưu tiên bài tập thuộc kỹ năng ít luyện nhất và khớp thời lượng
    const matchingSkillActs = approvedActs.filter((a) => a.mode === leastPracticedMode);
    const chosenAct =
      matchingSkillActs.length > 0
        ? matchingSkillActs[0]
        : approvedActs.find((a) => a.mode === "speaking") || approvedActs[0];

    const leastCount = skillCounts[leastPracticedMode] || 0;
    const reasonText =
      leastCount === 0
        ? `Quy tắc (c): Kỹ năng ${skillNamesVi[leastPracticedMode] || leastPracticedMode} chưa được luyện bài nào trong 7 ngày qua. Hãy thực hành để cân bằng cả 4 kỹ năng!`
        : `Quy tắc (c) & (d): Kỹ năng ${skillNamesVi[leastPracticedMode] || leastPracticedMode} ít được luyện nhất tuần này (${leastCount} bài). Thời lượng ${targetMinutes} phút phù hợp để hoàn thành bài này.`;

    recommended = {
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

  // Danh sách các bài tập thay thế khi bấm "Đổi bài khác"
  const alternateActivities = approvedActs
    .filter((a) => a.id !== recommended.id)
    .map((a) => {
      let altReason = `Bài luyện kỹ năng ${skillNamesVi[a.mode] || a.mode} phù hợp với quỹ thời gian ${targetMinutes} phút.`;
      if (a.mode === leastPracticedMode) {
        altReason = `Lựa chọn thay thế giúp rèn luyện kỹ năng ${skillNamesVi[a.mode]} đang cần bổ sung.`;
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

  return {
    learnerName,
    baselineStatus,
    targetMinutes,
    reason: recommended?.reason || "",
    recommendedActivity: recommended,
    alternateActivities,
    dueVocabCount,
    leastPracticedSkill: skillNamesVi[leastPracticedMode] || leastPracticedMode,
  };
}
