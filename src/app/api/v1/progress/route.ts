import { NextResponse } from "next/server";
import { getCurrentLearner } from "@/server/auth";
import { getProgressSummary } from "@/server/progress/service";

export async function GET() {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const summary = await getProgressSummary(learner.id);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Lỗi GET /api/v1/progress:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
