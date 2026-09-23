import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLearner } from "@/server/auth";
import { createSession } from "@/server/learning/service";

const CreateSessionSchema = z.object({
  activityId: z.string().min(1, "Thiếu activityId"),
  targetMinutes: z.number().int().positive().default(30),
});

export async function POST(req: NextRequest) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: parsed.error.format() },
        { status: 422 }
      );
    }

    const session = await createSession(
      learner.id,
      parsed.data.activityId,
      parsed.data.targetMinutes
    );

    return NextResponse.json({ sessionId: session.id }, { status: 201 });
  } catch (error) {
    console.error("Lỗi POST /api/v1/sessions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
