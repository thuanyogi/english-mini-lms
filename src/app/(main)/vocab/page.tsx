import { redirect } from "next/navigation";
import { getCurrentLearner } from "@/server/auth";
import { getLearnerVocabulary } from "@/server/vocabulary/service";
import { VocabListView } from "./vocab-list-view";

export const dynamic = "force-dynamic";

export default async function VocabPage() {
  const learner = await getCurrentLearner();
  if (!learner) {
    redirect("/login");
  }

  const items = await getLearnerVocabulary(learner.id, "all");

  return <VocabListView initialItems={items} />;
}
