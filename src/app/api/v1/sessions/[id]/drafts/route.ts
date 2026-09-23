import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLearner } from "@/server/auth";
import { saveDraft } from "@/server/learning/service";

const DraftSchema = z.object({
  content: z.string(),
  version: z.number().int().optional().default(1),
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
    const parsed = DraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu nháp không hợp lệ", details: parsed.error.format() },
        { status: 422 }
      );
    }

    const draft = await saveDraft(
      sessionId,
      learner.id,
      parsed.data.content,
      parsed.data.version
    );

    return NextResponse.json(
      { success: true, draftId: draft.id, version: draft.version },
      { status: 200 }
    );
  } catch (error) {
    console.error("Lỗi POST /api/v1/sessions/[id]/drafts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
