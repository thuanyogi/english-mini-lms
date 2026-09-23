import { notFound, redirect } from "next/navigation";
import { getCurrentLearner } from "@/server/auth";
import { getSessionDetails, getSubmissionWithFeedback } from "@/server/learning/service";
import { WritingSessionView } from "./writing-session-view";
import { ReadingSessionView } from "./reading-session-view";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ parentId?: string }>;
}

export default async function LearnSessionPage({ params, searchParams }: PageProps) {
  const learner = await getCurrentLearner();
  if (!learner) {
    redirect("/login");
  }

  const { sessionId } = await params;
  const { parentId } = await searchParams;

  const data = await getSessionDetails(sessionId, learner.id);
  if (!data) {
    notFound();
  }

  // Chế độ Đọc - Dịch y khoa (Reading Mode)
  if (data.activity.mode === "reading") {
    return (
      <ReadingSessionView
        sessionId={sessionId}
        targetMinutes={data.session.targetMinutes}
        activity={{
          id: data.activity.id,
          slot: data.activity.slot,
          title: data.activity.title,
          mode: data.activity.mode,
          objective: data.activity.objective,
          promptText: data.activity.promptText,
          feedbackGuide: data.activity.feedbackGuide,
          durationMinutes: data.activity.durationMinutes,
        }}
        segment={data.segment}
        initialDraft={data.draft?.content || ""}
      />
    );
  }

  let parentData = null;
  if (parentId) {
    const parentRes = await getSubmissionWithFeedback(parentId, learner.id);
    if (parentRes) {
      parentData = {
        submission: {
          id: parentRes.submission.id,
          revision: parentRes.submission.revision,
          body: parentRes.submission.body,
          assisted: parentRes.submission.assisted,
          submittedAt: parentRes.submission.submittedAt,
        },
        feedback: parentRes.feedback,
      };
    }
  }

  return (
    <WritingSessionView
      sessionId={sessionId}
      targetMinutes={data.session.targetMinutes}
      activity={{
        id: data.activity.id,
        slot: data.activity.slot,
        title: data.activity.title,
        mode: data.activity.mode,
        objective: data.activity.objective,
        promptText: data.activity.promptText,
        feedbackGuide: data.activity.feedbackGuide,
      }}
      initialDraft={data.draft?.content || ""}
      parentId={parentId}
      parentData={parentData}
    />
  );
}
