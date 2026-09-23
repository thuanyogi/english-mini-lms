import { NextResponse } from "next/server";
import { eq, isNull, desc, and } from "drizzle-orm";
import { getCurrentLearner } from "@/server/auth";
import { db } from "@/db";
import { learners, submissions, activities, learningSessions } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json(
        { error: "Unauthorized — Vui lòng đăng nhập" },
        { status: 401 }
      );
    }

    // 1. Lấy thông tin learner
    const [profile] = await db
      .select({
        id: learners.id,
        displayName: learners.displayName,
        role: learners.role,
        preferences: learners.preferences,
        timezone: learners.timezone,
        createdAt: learners.createdAt,
      })
      .from(learners)
      .where(eq(learners.id, learner.id))
      .limit(1);

    // 2. Lấy danh sách bài nộp gần đây (chưa bị xóa) để người dùng có thể quản lý và xóa theo yêu cầu
    const recentSubmissions = await db
      .select({
        id: submissions.id,
        revision: submissions.revision,
        createdAt: submissions.createdAt,
        mediaId: submissions.mediaId,
        activityId: activities.id,
        activityTitle: activities.title,
        activityMode: activities.mode,
      })
      .from(submissions)
      .innerJoin(learningSessions, eq(submissions.sessionId, learningSessions.id))
      .innerJoin(activities, eq(learningSessions.activityId, activities.id))
      .where(
        and(
          eq(submissions.learnerId, learner.id),
          isNull(submissions.deletedAt)
        )
      )
      .orderBy(desc(submissions.createdAt))
      .limit(50);

    return NextResponse.json({
      learner: profile,
      submissions: recentSubmissions,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/v1/settings error:", errorMsg);
    return NextResponse.json(
      { error: "Lỗi tải thông tin cài đặt: " + errorMsg },
      { status: 500 }
    );
  }
}
