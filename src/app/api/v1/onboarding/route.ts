import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLearner } from "@/server/auth";
import {
  getLearnerOnboardingProfile,
  saveLearnerOnboardingProfile,
} from "@/server/onboarding/service";

const OnboardingSchema = z.object({
  displayName: z.string().optional(),
  priorities: z.array(z.string()).default([]),
  selfAssessment: z
    .object({
      writing: z.number().min(1).max(5).default(3),
      reading: z.number().min(1).max(5).default(3),
      speaking: z.number().min(1).max(5).default(3),
      listening: z.number().min(1).max(5).default(3),
    })
    .default({ writing: 3, reading: 3, speaking: 3, listening: 3 }),
  workContext: z.string().default(""),
  ieltsVariant: z.enum(["academic", "general", "none"]).nullable().optional(),
  currentBook: z.string().optional(),
  preferredStudyTime: z.string().optional(),
  targetMinutesDefault: z.number().min(15).max(120).default(30),
});

export async function GET() {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const profile = await getLearnerOnboardingProfile(learner.id);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Lỗi GET /api/v1/onboarding:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = OnboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: parsed.error.format() },
        { status: 422 }
      );
    }

    const updated = await saveLearnerOnboardingProfile(learner.id, parsed.data);
    return NextResponse.json({ success: true, learner: updated });
  } catch (error) {
    console.error("Lỗi POST /api/v1/onboarding:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
