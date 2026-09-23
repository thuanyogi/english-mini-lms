import { eq, desc, and, isNull, gte } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  assessments,
  submissions,
  learningSessions,
  learners,
  usageEvents,
} from "@/db/schema";

export interface AdminActivityItem {
  id: string;
  title: string;
  mode: string;
  durationMinutes: number | null;
  difficulty: string | null;
  reviewState: string;
  updatedAt: Date;
}

export interface AdminFailedAssessmentItem {
  id: string;
  submissionId: string;
  learnerId: string;
  learnerName: string | null;
  activityTitle: string;
  activityMode: string;
  runVersion: number;
  status: string;
  createdAt: Date;
  submissionBodySnippet: string | null;
}

export interface MonthlyUsageSummary {
  month: string;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCostUsd: number;
  actionBreakdown: Array<{
    action: string;
    count: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  }>;
}

export interface AdminDashboardData {
  activities: AdminActivityItem[];
  failedAssessments: AdminFailedAssessmentItem[];
  usage: MonthlyUsageSummary;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  // 1. Danh sách activity + review_state
  const allActivities = await db
    .select({
      id: activities.id,
      title: activities.title,
      mode: activities.mode,
      durationMinutes: activities.durationMinutes,
      difficulty: activities.difficulty,
      reviewState: activities.reviewState,
      updatedAt: activities.updatedAt,
    })
    .from(activities)
    .orderBy(desc(activities.updatedAt));

  // 2. Danh sách assessments failed
  const failedList = await db
    .select({
      id: assessments.id,
      submissionId: assessments.submissionId,
      learnerId: assessments.learnerId,
      learnerName: learners.displayName,
      activityTitle: activities.title,
      activityMode: activities.mode,
      runVersion: assessments.runVersion,
      status: assessments.status,
      createdAt: assessments.createdAt,
      submissionBody: submissions.body,
    })
    .from(assessments)
    .innerJoin(submissions, eq(assessments.submissionId, submissions.id))
    .innerJoin(learningSessions, eq(submissions.sessionId, learningSessions.id))
    .innerJoin(activities, eq(learningSessions.activityId, activities.id))
    .leftJoin(learners, eq(assessments.learnerId, learners.id))
    .where(
      and(
        eq(assessments.status, "failed"),
        isNull(submissions.deletedAt)
      )
    )
    .orderBy(desc(assessments.createdAt))
    .limit(50);

  const formattedFailed = failedList.map((item) => ({
    ...item,
    submissionBodySnippet: item.submissionBody
      ? item.submissionBody.slice(0, 120) + (item.submissionBody.length > 120 ? "..." : "")
      : null,
  }));

  // 3. Tổng token tháng từ usage_events
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usageRecords = await db
    .select()
    .from(usageEvents)
    .where(gte(usageEvents.createdAt, startOfMonth));

  const totalRequests = usageRecords.length;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalEstimatedCostUsd = 0;

  const actionMap = new Map<
    string,
    { count: number; inputTokens: number; outputTokens: number; cost: number }
  >();

  for (const record of usageRecords) {
    const input = record.tokenInput || 0;
    const output = record.tokenOutput || 0;
    const cost = record.costEstimate || 0;

    totalInputTokens += input;
    totalOutputTokens += output;
    totalEstimatedCostUsd += cost;

    const action = record.action || "other";
    const existing = actionMap.get(action) || {
      count: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
    existing.count += 1;
    existing.inputTokens += input;
    existing.outputTokens += output;
    existing.cost += cost;
    actionMap.set(action, existing);
  }

  const actionBreakdown = Array.from(actionMap.entries()).map(([action, data]) => ({
    action,
    count: data.count,
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    estimatedCostUsd: Number(data.cost.toFixed(4)),
  }));

  const currentMonthStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, "0")}`;

  return {
    activities: allActivities,
    failedAssessments: formattedFailed,
    usage: {
      month: currentMonthStr,
      totalRequests,
      totalInputTokens,
      totalOutputTokens,
      totalEstimatedCostUsd: Number(totalEstimatedCostUsd.toFixed(4)),
      actionBreakdown,
    },
  };
}
