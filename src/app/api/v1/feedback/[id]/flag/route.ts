import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { feedbackVersions } from "@/db/schema";
import { getCurrentLearner } from "@/server/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id: feedbackId } = await params;

    // Tìm feedbackVersion thuộc learner (hoặc learner là admin)
    const [fb] = await db
      .select()
      .from(feedbackVersions)
      .where(
        learner.role === "admin"
          ? eq(feedbackVersions.id, feedbackId)
          : and(
              eq(feedbackVersions.id, feedbackId),
              eq(feedbackVersions.learnerId, learner.id)
            )
      )
      .limit(1);

    if (!fb) {
      return NextResponse.json(
        { error: "Không tìm thấy nhận xét hoặc không có quyền truy cập." },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { observationIndex, reason } = body;

    // Đánh dấu cờ trên observation cụ thể nếu có observationIndex
    let updatedObservations = fb.observations as Array<Record<string, unknown>> | null;
    if (
      Array.isArray(updatedObservations) &&
      typeof observationIndex === "number" &&
      observationIndex >= 0 &&
      observationIndex < updatedObservations.length
    ) {
      updatedObservations = updatedObservations.map((obs, idx) => {
        if (idx === observationIndex) {
          return {
            ...obs,
            flagged: true,
            flaggedReason: reason || "Người học không đồng ý với nhận xét",
            flaggedAt: new Date().toISOString(),
          };
        }
        return obs;
      });
    }

    await db
      .update(feedbackVersions)
      .set({
        reviewState: "under_review",
        observations: updatedObservations || fb.observations,
        updatedAt: new Date(),
      })
      .where(eq(feedbackVersions.id, feedbackId));

    return NextResponse.json({
      success: true,
      message: "Đã gắn cờ nhận xét để quản trị viên rà soát lại.",
      reviewState: "under_review",
    });
  } catch (error) {
    console.error("Lỗi khi gắn cờ nhận xét:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
