import { db } from "@/db";
import { learners } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface OnboardingProfileData {
  displayName?: string;
  priorities: string[];
  selfAssessment: {
    writing: number;
    reading: number;
    speaking: number;
    listening: number;
  };
  workContext: string;
  ieltsVariant?: "academic" | "general" | "none" | null;
  currentBook?: string;
  preferredStudyTime?: string;
  targetMinutesDefault?: number;
}

export async function getLearnerOnboardingProfile(learnerId: string) {
  const [learner] = await db
    .select({
      id: learners.id,
      displayName: learners.displayName,
      goals: learners.goals,
      preferences: learners.preferences,
      baselineStatus: learners.baselineStatus,
    })
    .from(learners)
    .where(eq(learners.id, learnerId))
    .limit(1);

  if (!learner) {
    return null;
  }

  const goals = (learner.goals as Record<string, unknown>) || {};
  const preferences = (learner.preferences as Record<string, unknown>) || {};

  return {
    displayName: learner.displayName || "",
    priorities: (goals.priorities as string[]) || [],
    selfAssessment: (goals.selfAssessment as OnboardingProfileData["selfAssessment"]) || {
      writing: 3,
      reading: 3,
      speaking: 3,
      listening: 3,
    },
    workContext: (goals.workContext as string) || "",
    ieltsVariant: (goals.ieltsVariant as OnboardingProfileData["ieltsVariant"]) || null,
    currentBook: (goals.currentBook as string) || "",
    preferredStudyTime: (preferences.preferredStudyTime as string) || "21:00",
    targetMinutesDefault: (preferences.targetMinutesDefault as number) || 30,
    baselineStatus: learner.baselineStatus || "pending",
  };
}

export async function saveLearnerOnboardingProfile(
  learnerId: string,
  data: OnboardingProfileData
) {
  const [existing] = await db
    .select()
    .from(learners)
    .where(eq(learners.id, learnerId))
    .limit(1);

  if (!existing) {
    throw new Error("Không tìm thấy học viên");
  }

  const currentGoals = (existing.goals as Record<string, unknown>) || {};
  const currentPreferences = (existing.preferences as Record<string, unknown>) || {};

  const updatedGoals = {
    ...currentGoals,
    priorities: data.priorities,
    selfAssessment: data.selfAssessment,
    workContext: data.workContext,
    ieltsVariant: data.ieltsVariant || null,
    currentBook: data.currentBook || "",
  };

  const updatedPreferences = {
    ...currentPreferences,
    preferredStudyTime: data.preferredStudyTime || "21:00",
    targetMinutesDefault: data.targetMinutesDefault || 30,
  };

  const [updated] = await db
    .update(learners)
    .set({
      displayName: data.displayName || existing.displayName,
      goals: updatedGoals,
      preferences: updatedPreferences,
      baselineStatus: "completed",
      updatedAt: new Date(),
    })
    .where(eq(learners.id, learnerId))
    .returning();

  return updated;
}
