import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLearner } from "@/server/auth";
import { createSubmissionAndAssess, ValidationError } from "@/server/learning/service";

const SubmissionSchema = z.object({
  body: z.string().optional(),
  parentId: z.string().uuid().optional(),
  mediaId: z.string().uuid().optional(),
  media_id: z.string().uuid().optional(),
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
    const jsonBody = await req.json();
    const parsed = SubmissionSchema.safeParse(jsonBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu bài nộp không hợp lệ", details: parsed.error.format() },
        { status: 422 }
      );
    }

    const effectiveMediaId = parsed.data.mediaId || parsed.data.media_id;

    const result = await createSubmissionAndAssess(
      sessionId,
      learner.id,
      parsed.data.body || "",
      parsed.data.parentId,
      effectiveMediaId
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
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Lỗi POST /api/v1/sessions/[id]/submissions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
