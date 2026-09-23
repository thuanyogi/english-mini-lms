import { NextRequest, NextResponse } from "next/server";
import { getCurrentLearner } from "@/server/auth";
import { retryAssessment } from "@/server/learning/service";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: RouteProps) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id: assessmentId } = await params;
    const result = await retryAssessment(
      assessmentId,
      learner.id,
      learner.role === "admin"
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Lỗi POST /api/v1/assessments/[id]/retry:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
