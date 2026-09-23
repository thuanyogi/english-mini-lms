import { NextRequest, NextResponse } from "next/server";
import { getCurrentLearner } from "@/server/auth";
import { getTodayRecommendation } from "@/server/today/service";

export async function GET(req: NextRequest) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetMinParam = searchParams.get("targetMinutes");
    const targetMinutes = targetMinParam === "45" ? 45 : 30;

    const recommendation = await getTodayRecommendation(learner.id, targetMinutes);

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("Lỗi GET /api/v1/today:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
