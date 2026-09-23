import { getCurrentLearner } from "@/server/auth";
import { redirect } from "next/navigation";
import { getLearnerOnboardingProfile } from "@/server/onboarding/service";
import OnboardingView from "./onboarding-view";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const learner = await getCurrentLearner();
  if (!learner) {
    redirect("/login");
  }

  const profile = await getLearnerOnboardingProfile(learner.id);

  return <OnboardingView initialProfile={profile} />;
}
