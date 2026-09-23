import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLearner } from "@/server/auth";
import { recordSessionEvent } from "@/server/learning/service";

const SessionEventSchema = z.object({
  kind: z.enum(["hint", "reveal", "pause", "resume", "finish"]),
  payload: z.any().optional(),
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
    const parsed = SessionEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu event không hợp lệ", details: parsed.error.format() },
        { status: 422 }
      );
    }

    const event = await recordSessionEvent(
      sessionId,
      learner.id,
      parsed.data.kind,
      parsed.data.payload
    );

    return NextResponse.json({ success: true, eventId: event.id }, { status: 201 });
  } catch (error) {
    console.error("Lỗi POST /api/v1/sessions/[id]/events:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
