"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { YouTubePlayer } from "./youtube-player";
import type { SpeakingFeedback } from "@/server/providers/gemini";
import { SessionWrapUpModal } from "./session-wrap-up-modal";
import { ListeningQuestions } from "./components/listening-questions";
import { ListeningTranscript } from "./components/listening-transcript";
import { ListeningReview, type QuestionFeedback } from "./components/listening-review";
import { ListeningShadowing } from "./components/listening-shadowing";

interface Question {
  id: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
}

interface TranscriptSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

interface ListeningSessionViewProps {
  sessionId: string;
  targetMinutes: number;
  activity: {
    id: string;
    slot: string | null;
    title: string;
    mode: string;
    objective: string | null;
    promptText: string | null;
    feedbackGuide: string | null;
    durationMinutes: number;
  };
  listening: {
    videoUrl: string | null;
    startSeconds: number;
    endSeconds: number;
    questions: Question[];
    transcriptSegments: TranscriptSegment[];
    isTranscriptRevealed: boolean;
  };
}

export function ListeningSessionView({
  sessionId,
  targetMinutes,
  activity,
  listening,
}: ListeningSessionViewProps) {
  const router = useRouter();

  // Answers state: { [questionId]: optionId }
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Transcript reveal state (assisted trigger)
  const [isRevealed, setIsRevealed] = useState(listening.isTranscriptRevealed);
  const [isRevealing, setIsRevealing] = useState(false);

  // Player seek controller
  const [seekTo, setSeekTo] = useState<number | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    submissionId: string;
    assisted: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    feedback: any;
  } | null>(null);

  // Active view tab after submit: "review" | "shadowing"
  const [activeTab, setActiveTab] = useState<"review" | "shadowing">("review");

  // Shadowing state: which sentence is currently recording/evaluating
  const [shadowingIndex, setShadowingIndex] = useState<number | null>(null);
  const [shadowingLoading, setShadowingLoading] = useState(false);
  const [shadowingError, setShadowingError] = useState<string | null>(null);
  const [shadowingResults, setShadowingResults] = useState<Record<number, SpeakingFeedback>>({});

  // Timer state
  const [secondsRemaining, setSecondsRemaining] = useState(targetMinutes * 60);
  const [timerActive, setTimerActive] = useState(true);
  const [showWrapUp, setShowWrapUp] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (!timerActive || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          setShowWrapUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, secondsRemaining]);

  function handleSaveAndExit() {
    router.push("/today");
  }

  function handleExtendTimer() {
    setSecondsRemaining(300);
    setTimerActive(true);
    setShowWrapUp(false);
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  // Mở transcript trước khi nộp → ghi nhận event 'reveal' (tính là assisted)
  async function handleRevealTranscript() {
    if (isRevealed || isRevealing) return;
    try {
      setIsRevealing(true);
      await fetch(`/api/v1/sessions/${sessionId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "reveal", payload: { target: "listening_transcript" } }),
      });
      setIsRevealed(true);
    } catch (e) {
      console.error("Lỗi khi ghi sự kiện mở transcript:", e);
      setIsRevealed(true);
    } finally {
      setIsRevealing(false);
    }
  }

  // Chọn đáp án
  function handleSelectOption(questionId: string, optionId: string) {
    if (submissionResult) return; // Đã nộp thì khoá
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  // Nộp bài nghe
  async function handleSubmit() {
    if (Object.keys(answers).length < listening.questions.length) {
      setSubmitError("Vui lòng trả lời đủ tất cả các câu hỏi trước khi nộp bài.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const res = await fetch(`/api/v1/sessions/${sessionId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: JSON.stringify({ answers }),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể nộp bài nghe.");
      }

      setSubmissionResult({
        submissionId: data.submissionId,
        assisted: data.assisted,
        feedback: data.feedback,
      });
    } catch (err) {
      console.error("Lỗi nộp bài nghe:", err);
      setSubmitError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Chấm câu Shadowing
  async function handleShadowingComplete(index: number, blob: Blob) {
    const segment = listening.transcriptSegments[index];
    if (!segment) return;

    try {
      setShadowingLoading(true);
      setShadowingError(null);

      // Bước 1: Upload media lên Supabase Storage
      const fileExt = blob.type.includes("mp4") ? "mp4" : "webm";
      const fileName = `shadowing-${sessionId}-seg${index}.${fileExt}`;
      const fileObj = new File([blob], fileName, { type: blob.type });

      const formData = new FormData();
      formData.append("file", fileObj);
      formData.append("sessionId", sessionId);

      const mediaRes = await fetch("/api/v1/media", {
        method: "POST",
        body: formData,
      });

      const mediaData = await mediaRes.json();
      if (!mediaRes.ok || !mediaData.media_id) {
        throw new Error(mediaData.error || "Không thể tải file âm thanh shadowing lên.");
      }

      // Bước 2: Chấm âm thanh shadowing bám theo verified_transcript của câu
      const shadowRes = await fetch(`/api/v1/sessions/${sessionId}/shadowing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_id: mediaData.media_id,
          sentence: segment.text,
          startSeconds: segment.startSeconds,
          endSeconds: segment.endSeconds,
        }),
      });

      const shadowData = await shadowRes.json();
      if (!shadowRes.ok || !shadowData.feedback) {
        throw new Error(shadowData.error || "Lỗi khi chấm phát âm shadowing.");
      }

      setShadowingResults((prev) => ({
        ...prev,
        [index]: shadowData.feedback,
      }));
    } catch (err) {
      console.error("Lỗi khi chấm shadowing:", err);
      setShadowingError(err instanceof Error ? err.message : "Chấm shadowing thất bại.");
    } finally {
      setShadowingLoading(false);
    }
  }

  // Trích xuất danh sách câu hỏi & đáp án kèm giải thích sau nộp
  const questionsReview: QuestionFeedback[] = [];
  if (submissionResult && submissionResult.feedback) {
    const obsList = submissionResult.feedback.observations || [];
    for (const q of listening.questions) {
      const userChoice = answers[q.id] || "";
      const obs = obsList.find((o: { original: string }) => o.original.includes(q.id));
      let isCorrect = true;
      let correctOption = userChoice;
      let explanation = "Bạn đã chọn đúng đáp án theo nội dung hội nghị.";
      let timestamp = listening.startSeconds;

      if (obs) {
        isCorrect = false;
        // Trích xuất timestamp và giải thích từ observation
        const secMatch = obs.location?.match(/(\d+)s/);
        if (secMatch) timestamp = parseInt(secMatch[1], 10);
        explanation = obs.suggestion || obs.issue;
        const optMatch = obs.issue?.match(/Đáp án đúng là \(([A-Za-z])\)/);
        if (optMatch) correctOption = optMatch[1].toLowerCase();
      }

      questionsReview.push({
        id: q.id,
        prompt: q.prompt,
        userOption: userChoice,
        correctOption,
        isCorrect,
        explanation,
        timestamp,
      });
    }
  }

  return (
    <div
      style={{
        maxWidth: "768px",
        margin: "0 auto",
        padding: "16px 16px 40px",
        minHeight: "100vh",
      }}
    >
      {/* Top Bar: Thoát + Đồng hồ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/library"
          style={{
            fontSize: "0.875rem",
            color: "#64748b",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            minHeight: "44px",
          }}
        >
          ← Thoát phiên học
        </Link>

        {/* Đồng hồ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: secondsRemaining < 300 ? "#fee2e2" : "#f1f5f9",
            color: secondsRemaining < 300 ? "#b91c1c" : "#334155",
            padding: "6px 14px",
            borderRadius: "20px",
            fontWeight: 700,
            fontSize: "0.875rem",
          }}
        >
          <span>⏱️</span>
          <span>{formatTime(secondsRemaining)}</span>
          <button
            onClick={() => setTimerActive(!timerActive)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.75rem",
              padding: "2px 4px",
              color: "inherit",
              opacity: 0.8,
            }}
          >
            {timerActive ? "⏸" : "▶"}
          </button>
        </div>
      </div>

      {/* Header bài học */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "18px 20px",
          marginBottom: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: "6px",
              background: "#dbeafe",
              color: "#1e40af",
            }}
          >
            🎧 {activity.slot || "L1"} · Nghe & Shadowing (Listening)
          </span>

          {submissionResult && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "6px",
                background: submissionResult.assisted ? "#fef3c7" : "#dcfce7",
                color: submissionResult.assisted ? "#b45309" : "#15803d",
              }}
            >
              {submissionResult.assisted ? "💡 Có trợ giúp" : "⭐ Tự làm độc lập"}
            </span>
          )}
        </div>

        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 6px 0",
            lineHeight: 1.35,
          }}
        >
          {activity.title}
        </h1>

        {activity.objective && (
          <p
            style={{
              fontSize: "0.875rem",
              color: "#475569",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            🎯 <strong>Mục tiêu:</strong> {activity.objective}
          </p>
        )}
      </div>

      {/* Trình phát YouTube */}
      <YouTubePlayer
        videoUrl={listening.videoUrl || "https://www.youtube.com/watch?v=M7lc1UVf-VE"}
        startSeconds={listening.startSeconds}
        endSeconds={listening.endSeconds}
        seekTo={seekTo}
      />

      {/* TRẠNG THÁI CHƯA NỘP: HIỆN CÂU HỎI TRƯỚC, KHOÁ TRANSCRIPT & ĐÁP ÁN */}
      {!submissionResult ? (
        <ListeningQuestions
          questions={listening.questions}
          answers={answers}
          onSelectOption={handleSelectOption}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitError={submitError}
        >
          <ListeningTranscript
            isRevealed={isRevealed}
            isRevealing={isRevealing}
            onReveal={handleRevealTranscript}
            segments={listening.transcriptSegments}
            onSeek={(s) => setSeekTo(s)}
          />
        </ListeningQuestions>
      ) : (
        /* TRẠNG THÁI ĐÃ NỘP: XEM LẠI ĐÁP ÁN, GIẢI THÍCH & TAB SHADOWING */
        <div>
          {/* Thanh chuyển tab sau khi nộp */}
          <div
            style={{
              display: "flex",
              background: "#ffffff",
              borderRadius: "12px",
              padding: "4px",
              border: "1px solid #e2e8f0",
              marginBottom: "16px",
            }}
          >
            <button
              onClick={() => setActiveTab("review")}
              style={{
                flex: 1,
                padding: "10px",
                background: activeTab === "review" ? "#2563eb" : "transparent",
                color: activeTab === "review" ? "#ffffff" : "#475569",
                border: "none",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              📝 Đáp án & Giải thích
            </button>
            <button
              onClick={() => setActiveTab("shadowing")}
              style={{
                flex: 1,
                padding: "10px",
                background: activeTab === "shadowing" ? "#2563eb" : "transparent",
                color: activeTab === "shadowing" ? "#ffffff" : "#475569",
                border: "none",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              🎙️ Luyện Shadowing từng câu
            </button>
          </div>

          {activeTab === "review" ? (
            <ListeningReview
              assisted={submissionResult.assisted}
              questionsReview={questionsReview}
              onSeek={(s) => setSeekTo(s)}
            />
          ) : (
            <ListeningShadowing
              segments={listening.transcriptSegments}
              shadowingIndex={shadowingIndex}
              onSelectShadowingIndex={setShadowingIndex}
              shadowingLoading={shadowingLoading}
              shadowingError={shadowingError}
              shadowingResults={shadowingResults}
              onShadowingComplete={handleShadowingComplete}
              onSeek={(s) => setSeekTo(s)}
            />
          )}
        </div>
      )}

      {/* Modal đề nghị lưu/khép phiên tự pause ở phút 30/45 không xoá nháp */}
      <SessionWrapUpModal
        targetMinutes={targetMinutes}
        isOpen={showWrapUp}
        onSaveAndExit={handleSaveAndExit}
        onSubmit={handleSubmit}
        onExtend={handleExtendTimer}
        isSaving={false}
        canSubmit={!isSubmitting}
      />
    </div>
  );
}
