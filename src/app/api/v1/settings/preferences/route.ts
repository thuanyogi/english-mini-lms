import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentLearner } from "@/server/auth";
import { db } from "@/db";
import { learners } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json(
        { error: "Unauthorized — Vui lòng đăng nhập" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { remindEnabled, remindTime } = body;

    // Lấy preferences hiện tại
    const [current] = await db
      .select({ preferences: learners.preferences })
      .from(learners)
      .where(eq(learners.id, learner.id))
      .limit(1);

    const existingPrefs = (current?.preferences as Record<string, unknown>) || {};
    const updatedPreferences = {
      ...existingPrefs,
      remindEnabled:
        typeof remindEnabled === "boolean"
          ? remindEnabled
          : existingPrefs.remindEnabled ?? false,
      remindTime:
        typeof remindTime === "string"
          ? remindTime
          : (existingPrefs.remindTime as string) || "20:00",
      updatedAt: new Date().toISOString(),
    };

    await db
      .update(learners)
      .set({
        preferences: updatedPreferences,
      })
      .where(eq(learners.id, learner.id));

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Update preferences error:", errorMsg);
    return NextResponse.json(
      { error: "Lỗi cập nhật cài đặt: " + errorMsg },
      { status: 500 }
    );
  }
}
