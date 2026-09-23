import { db } from "@/db";
import {
  activities,
  errorObservations,
  learningSessions,
  submissions,
  vocabularyVault,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export interface SkillCount {
  skill: "writing" | "reading" | "speaking" | "listening";
  total: number;
  independent: number;
  assisted: number;
}

export interface RecurringErrorCategory {
  category: string;
  count: number;
  samples: string[];
}

export interface RevisionComparisonItem {
  activityId: string;
  activityTitle: string;
  mode: string;
  originalSubmissionId: string;
  revisedSubmissionId: string;
  originalDate: Date;
  revisedDate: Date;
  originalAssisted: boolean;
  revisedAssisted: boolean;
  originalExcerpt: string;
  revisedExcerpt: string;
}

export interface ProgressSummary {
  sessionsThisWeek: number;
  actualStudyMinutes: number;
  totalSubmissions: number;
  hasSufficientData: boolean;
  insufficientDataMessage?: string;
  skillBreakdown: SkillCount[];
  independentCount: number;
  assistedCount: number;
  recurringErrors: RecurringErrorCategory[];
  masteredVocabCount: number;
  totalVocabCount: number;
  revisionComparisons: RevisionComparisonItem[];
}

export async function getProgressSummary(learnerId: string): Promise<ProgressSummary> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 1. Số phiên học trong tuần & phút thực học (tính từ activeSeconds)
  const allSessions = await db
    .select({
      id: learningSessions.id,
      activeSeconds: learningSessions.activeSeconds,
      startedAt: learningSessions.createdAt,
    })
    .from(learningSessions)
    .where(eq(learningSessions.learnerId, learnerId));

  const sessionsThisWeek = allSessions.filter(
    (s) => s.startedAt && new Date(s.startedAt) >= oneWeekAgo
  ).length;

  const totalActiveSeconds = allSessions.reduce(
    (acc, s) => acc + (s.activeSeconds || 0),
    0
  );
  const actualStudyMinutes = Math.round(totalActiveSeconds / 60);

  // 2. Lấy toàn bộ submissions của người học để thống kê kỹ năng & tách độc lập / có hỗ trợ
  const allSubmissions = await db
    .select({
      id: submissions.id,
      sessionId: submissions.sessionId,
      revision: submissions.revision,
      parentId: submissions.parentId,
      body: submissions.body,
      assisted: submissions.assisted,
      submittedAt: submissions.submittedAt,
      activityId: learningSessions.activityId,
      activityTitle: activities.title,
      activityMode: activities.mode,
    })
    .from(submissions)
    .innerJoin(learningSessions, eq(submissions.sessionId, learningSessions.id))
    .innerJoin(activities, eq(learningSessions.activityId, activities.id))
    .where(eq(submissions.learnerId, learnerId))
    .orderBy(desc(submissions.submittedAt));

  const totalSubmissions = allSubmissions.length;
  const hasSufficientData = totalSubmissions >= 3;
  const insufficientDataMessage = hasSufficientData
    ? undefined
    : "Chưa đủ bằng chứng để phân tích xu hướng học tập (cần tối thiểu 3 bài nộp).";

  // Thống kê theo kỹ năng và tách độc lập / có hỗ trợ
  const skillMap: Record<
    "writing" | "reading" | "speaking" | "listening",
    { total: number; independent: number; assisted: number }
  > = {
    writing: { total: 0, independent: 0, assisted: 0 },
    reading: { total: 0, independent: 0, assisted: 0 },
    speaking: { total: 0, independent: 0, assisted: 0 },
    listening: { total: 0, independent: 0, assisted: 0 },
  };

  let independentCount = 0;
  let assistedCount = 0;

  for (const sub of allSubmissions) {
    const mode = sub.activityMode as "writing" | "reading" | "speaking" | "listening";
    if (skillMap[mode]) {
      skillMap[mode].total += 1;
      if (sub.assisted) {
        skillMap[mode].assisted += 1;
        assistedCount += 1;
      } else {
        skillMap[mode].independent += 1;
        independentCount += 1;
      }
    }
  }

  const skillBreakdown: SkillCount[] = (
    ["writing", "reading", "speaking", "listening"] as const
  ).map((skill) => ({
    skill,
    total: skillMap[skill].total,
    independent: skillMap[skill].independent,
    assisted: skillMap[skill].assisted,
  }));

  // 3. Lỗi lặp: error_observations nhóm theo category
  const errors = await db
    .select({
      id: errorObservations.id,
      category: errorObservations.category,
      evidence: errorObservations.evidence,
      createdAt: errorObservations.createdAt,
    })
    .from(errorObservations)
    .where(eq(errorObservations.learnerId, learnerId))
    .orderBy(desc(errorObservations.createdAt));

  const errorCategoryMap: Record<string, { count: number; samples: string[] }> = {};
  for (const err of errors) {
    const cat = err.category || "khác";
    if (!errorCategoryMap[cat]) {
      errorCategoryMap[cat] = { count: 0, samples: [] };
    }
    errorCategoryMap[cat].count += 1;
    if (err.evidence && errorCategoryMap[cat].samples.length < 3) {
      errorCategoryMap[cat].samples.push(err.evidence);
    }
  }

  const recurringErrors: RecurringErrorCategory[] = Object.entries(errorCategoryMap)
    .map(([category, data]) => ({
      category,
      count: data.count,
      samples: data.samples,
    }))
    .sort((a, b) => b.count - a.count);

  // 4. Từ vựng trong Vault: tổng từ & từ đã thuộc (mastery_level >= 4)
  const vocabItems = await db
    .select({
      id: vocabularyVault.id,
      masteryLevel: vocabularyVault.masteryLevel,
    })
    .from(vocabularyVault)
    .where(eq(vocabularyVault.learnerId, learnerId));

  const totalVocabCount = vocabItems.length;
  const masteredVocabCount = vocabItems.filter((v) => v.masteryLevel >= 4).length;

  // 5. Danh sách bài có bản sửa để so sánh (revision >= 2 hoặc parentId != null)
  const revisions = allSubmissions.filter(
    (s) => s.parentId !== null || s.revision > 1
  );

  const revisionComparisons: RevisionComparisonItem[] = [];
  for (const rev of revisions) {
    // Tìm bài gốc tương ứng
    const original = allSubmissions.find(
      (s) => s.id === rev.parentId || (s.activityId === rev.activityId && s.revision === 1)
    );

    if (original && original.id !== rev.id) {
      // Tránh trùng lặp nếu có nhiều bản sửa
      const alreadyAdded = revisionComparisons.some(
        (rc) => rc.revisedSubmissionId === rev.id
      );
      if (!alreadyAdded) {
        revisionComparisons.push({
          activityId: rev.activityId,
          activityTitle: rev.activityTitle,
          mode: rev.activityMode,
          originalSubmissionId: original.id,
          revisedSubmissionId: rev.id,
          originalDate: original.submittedAt,
          revisedDate: rev.submittedAt,
          originalAssisted: original.assisted,
          revisedAssisted: rev.assisted,
          originalExcerpt: (original.body || "").slice(0, 150),
          revisedExcerpt: (rev.body || "").slice(0, 150),
        });
      }
    }
  }

  return {
    sessionsThisWeek,
    actualStudyMinutes,
    totalSubmissions,
    hasSufficientData,
    insufficientDataMessage,
    skillBreakdown,
    independentCount,
    assistedCount,
    recurringErrors,
    masteredVocabCount,
    totalVocabCount,
    revisionComparisons,
  };
}
