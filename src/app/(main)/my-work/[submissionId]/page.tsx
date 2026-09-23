import { notFound, redirect } from "next/navigation";
import { getCurrentLearner } from "@/server/auth";
import { getSubmissionWithFeedback } from "@/server/learning/service";
import { MyWorkView } from "./my-work-view";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ submissionId: string }>;
}

export default async function MyWorkSubmissionPage({ params }: PageProps) {
  const learner = await getCurrentLearner();
  if (!learner) {
    redirect("/login");
  }

  const { submissionId } = await params;
  const data = await getSubmissionWithFeedback(submissionId, learner.id);

  if (!data) {
    notFound();
  }

  return (
    <MyWorkView
      submission={data.submission}
      activity={data.activity}
      assessment={data.assessment}
      feedback={data.feedback}
      parent={data.parent}
    />
  );
}
