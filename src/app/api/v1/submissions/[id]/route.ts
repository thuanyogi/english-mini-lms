import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { submissions, mediaObjects } from "@/db/schema";
import { getCurrentLearner } from "@/server/auth";
import { createClient } from "@supabase/supabase-js";

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

export async function DELETE(req: NextRequest, { params }: RouteProps) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id: submissionId } = await params;

    const [existing] = await db
      .select({
        id: submissions.id,
        mediaId: submissions.mediaId,
      })
      .from(submissions)
      .where(
        and(
          eq(submissions.id, submissionId),
          eq(submissions.learnerId, learner.id),
          isNull(submissions.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Bài nộp không tồn tại hoặc đã bị xoá" },
        { status: 404 }
      );
    }

    // 1. Soft delete submission
    await db
      .update(submissions)
      .set({ deletedAt: new Date() })
      .where(eq(submissions.id, submissionId));

    // 2. Nếu có media đính kèm, xoá file khỏi Supabase Storage
    if (existing.mediaId) {
      const [media] = await db
        .select({
          id: mediaObjects.id,
          storageKey: mediaObjects.storageKey,
        })
        .from(mediaObjects)
        .where(eq(mediaObjects.id, existing.mediaId))
        .limit(1);

      if (media?.storageKey) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key =
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (url && key) {
          try {
            const supabase = createClient(url, key);
            await supabase.storage.from("learner-media").remove([media.storageKey]);
            console.log(`[Delete Submission] Đã xoá file storage: ${media.storageKey}`);
          } catch (storageErr) {
            console.warn("[Delete Submission] Cảnh báo xoá file storage:", storageErr);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Đã xoá bài làm và file âm thanh liên quan.",
    });
  } catch (error) {
    console.error("Lỗi DELETE /api/v1/submissions/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

