import { redirect } from "next/navigation";
import { getCurrentLearner } from "@/server/auth";
import { MyWorkListView } from "./my-work-list-view";

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
  const learner = await getCurrentLearner();
  if (!learner) {
    redirect("/login");
  }

  return <MyWorkListView />;
}
