import { getCurrentLearner } from "@/server/auth";
import { redirect } from "next/navigation";
import VocabReviewView from "./vocab-review-view";

export default async function VocabReviewPage() {
  const learner = await getCurrentLearner();
  if (!learner) {
    redirect("/login");
  }

  return <VocabReviewView />;
}
