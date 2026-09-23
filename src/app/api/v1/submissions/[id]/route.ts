import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { getCurrentLearner } from "@/server/auth";

const UpdateSubmissionSchema = z.object({
  body: z.string(),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id: submissionId } = await params;
    const body = await req.json();
    const parsed = UpdateSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: parsed.error.format() },
        { status: 422 }
      );
    }

    const [existing] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(and(eq(submissions.id, submissionId), eq(submissions.learnerId, learner.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Bài nộp không tồn tại" }, { status: 404 });
    }

    // Cập nhật transcript đã xác nhận / sửa của người học
    const [updated] = await db
      .update(submissions)
      .set({
        body: parsed.data.body,
      })
      .where(eq(submissions.id, submissionId))
      .returning();

    return NextResponse.json({
      success: true,
      submission: updated,
    });
  } catch (error) {
    console.error("Lỗi PATCH /api/v1/submissions/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
