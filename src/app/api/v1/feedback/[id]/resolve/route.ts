import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
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

    if (learner.role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên mới có quyền thực hiện thao tác này." },
        { status: 403 }
      );
    }

    const { id: feedbackId } = await params;

    const [fb] = await db
      .select()
      .from(feedbackVersions)
      .where(eq(feedbackVersions.id, feedbackId))
      .limit(1);

    if (!fb) {
      return NextResponse.json(
        { error: "Không tìm thấy nhận xét." },
        { status: 404 }
      );
    }

    await db
      .update(feedbackVersions)
      .set({
        reviewState: "active",
        updatedAt: new Date(),
      })
      .where(eq(feedbackVersions.id, feedbackId));

    return NextResponse.json({
      success: true,
      message: "Đã hoàn tất rà soát nhận xét.",
      reviewState: "active",
    });
  } catch (error) {
    console.error("Lỗi khi giải quyết nhận xét bị gắn cờ:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
