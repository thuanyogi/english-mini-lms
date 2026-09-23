import { getCurrentLearner } from "@/server/auth";
import { redirect } from "next/navigation";
import TodayView from "./today-view";

export default async function TodayPage() {
  const learner = await getCurrentLearner();
  if (!learner) {
    redirect("/login");
  }

  return (
    <TodayView
      initialTargetMinutes={30}
      userEmail={learner.displayName || "Bác sĩ Minh"}
      displayName={learner.displayName || "Bác sĩ Minh"}
    />
  );
}
