import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLearner } from "@/server/auth";
import { createSubmissionAndAssess } from "@/server/learning/service";

const SubmissionSchema = z.object({
  body: z.string().min(1, "Nội dung bài viết không được để trống"),
  parentId: z.string().uuid().optional(),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const body = await req.json();
    const parsed = SubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu bài nộp không hợp lệ", details: parsed.error.format() },
        { status: 422 }
      );
    }

    const result = await createSubmissionAndAssess(
      sessionId,
      learner.id,
      parsed.data.body,
      parsed.data.parentId
    );

    return NextResponse.json(
      {
        submissionId: result.submission.id,
        assessmentId: result.assessment.id,
        status: result.assessment.status,
        revision: result.submission.revision,
        assisted: result.submission.assisted,
        feedback: result.feedback,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Lỗi POST /api/v1/sessions/[id]/submissions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
