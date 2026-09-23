import { notFound, redirect } from "next/navigation";
import { getCurrentLearner } from "@/server/auth";
import { getSessionDetails, getSubmissionWithFeedback } from "@/server/learning/service";
import { WritingSessionView } from "./writing-session-view";
import { ReadingSessionView } from "./reading-session-view";
import { SpeakingSessionView } from "./speaking-session-view";
import { ListeningSessionView } from "./listening-session-view";

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

  // Chế độ Nghe & Shadowing (Listening Mode)
  if (data.activity.mode === "listening" && data.listening) {
    return (
      <ListeningSessionView
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
          durationMinutes: data.activity.durationMinutes || 15,
        }}
        listening={data.listening}
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
          audioUrl: parentRes.submission.audioUrl,
        },
        feedback: parentRes.feedback,
      };
    }
  }

  // Chế độ Luyện Nói (Speaking Mode)
  if (data.activity.mode === "speaking") {
    return (
      <SpeakingSessionView
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
          durationMinutes: data.activity.durationMinutes || 15,
        }}
        parentId={parentId}
        parentData={parentData}
      />
    );
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
