import { getCurrentLearner } from "@/server/auth";
import { redirect } from "next/navigation";
import { getProgressSummary } from "@/server/progress/service";
import ProgressView from "./progress-view";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const learner = await getCurrentLearner();
  if (!learner) {
    redirect("/login");
  }

  const summary = await getProgressSummary(learner.id);

  return <ProgressView initialSummary={summary} />;
}
