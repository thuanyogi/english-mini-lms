import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@/db";
import { submissions, learningSessions, activities, assessments } from "@/db/schema";
import { getCurrentLearner } from "@/server/auth";

export async function GET(req: NextRequest) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const modeFilter = searchParams.get("mode");

    const conditions = [
      eq(submissions.learnerId, learner.id),
      isNull(submissions.deletedAt),
    ];

    if (modeFilter && modeFilter !== "all") {
      conditions.push(
        eq(activities.mode, modeFilter as (typeof activities.$inferSelect)["mode"])
      );
    }

    const rows = await db
      .select({
        id: submissions.id,
        sessionId: submissions.sessionId,
        revision: submissions.revision,
        modality: submissions.modality,
        assisted: submissions.assisted,
        submittedAt: submissions.submittedAt,
        activityId: activities.id,
        activityTitle: activities.title,
        activityMode: activities.mode,
        activitySlot: activities.slot,
        assessmentId: assessments.id,
        assessmentStatus: assessments.status,
        assessmentRunVersion: assessments.runVersion,
      })
      .from(submissions)
      .innerJoin(learningSessions, eq(submissions.sessionId, learningSessions.id))
      .innerJoin(activities, eq(learningSessions.activityId, activities.id))
      .leftJoin(assessments, eq(assessments.submissionId, submissions.id))
      .where(and(...conditions))
      .orderBy(desc(submissions.submittedAt), desc(assessments.runVersion));

    // Deduplicate theo submission.id (chỉ lấy assessment run version mới nhất)
    const seen = new Set<string>();
    const deduplicatedSubmissions = [];

    for (const r of rows) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        deduplicatedSubmissions.push({
          id: r.id,
          sessionId: r.sessionId,
          revision: r.revision,
          modality: r.modality,
          assisted: r.assisted,
          submittedAt: r.submittedAt,
          activityId: r.activityId,
          activityTitle: r.activityTitle,
          activityMode: r.activityMode,
          activitySlot: r.activitySlot,
          assessmentStatus: r.assessmentStatus ?? "processing",
        });
      }
    }

    return NextResponse.json({
      submissions: deduplicatedSubmissions,
    });
  } catch (error) {
    console.error("Lỗi GET /api/v1/submissions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
