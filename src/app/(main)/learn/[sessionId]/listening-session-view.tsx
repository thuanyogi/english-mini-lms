"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { YouTubePlayer } from "./youtube-player";
import { AudioRecorder } from "./audio-recorder";
import { SpeakingFeedback } from "@/server/providers/gemini";

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

interface QuestionFeedback {
  id: string;
  prompt: string;
  userOption: string;
  correctOption: string;
  isCorrect: boolean;
  explanation: string;
  timestamp: number;
}

export function ListeningSessionView({
  sessionId,
  targetMinutes,
  activity,
  listening,
}: ListeningSessionViewProps) {
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

  // Countdown timer effect
  useEffect(() => {
    if (!timerActive || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, secondsRemaining]);

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
      if (!mediaRes.ok || !mediaData.mediaId) {
        throw new Error(mediaData.error || "Không thể tải file âm thanh shadowing lên.");
      }

      // Bước 2: Chấm âm thanh shadowing bám theo verified_transcript của câu
      const shadowRes = await fetch(`/api/v1/sessions/${sessionId}/shadowing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_id: mediaData.mediaId,
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
        const optMatch = obs.issue?.match(/Đáp án đúng là ([A-Za-z])/);
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
        <div>
          {/* Card câu hỏi */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              padding: "20px",
              marginBottom: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
                📝 Câu hỏi nghe hiểu ({listening.questions.length} câu):
              </div>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Đáp án được bảo mật cho đến khi nộp
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {listening.questions.map((q, idx) => (
                <div
                  key={q.id}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.9375rem",
                      color: "#1e293b",
                      marginBottom: "12px",
                      lineHeight: 1.5,
                    }}
                  >
                    Câu {idx + 1}: {q.prompt}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {q.options.map((opt) => {
                      const isSelected = answers[q.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectOption(q.id, opt.id)}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "10px",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                            background: isSelected ? "#eff6ff" : "#ffffff",
                            color: isSelected ? "#1e40af" : "#334155",
                            textAlign: "left",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            lineHeight: 1.45,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              background: isSelected ? "#2563eb" : "#e2e8f0",
                              color: isSelected ? "#ffffff" : "#475569",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              flexShrink: 0,
                              marginTop: "1px",
                            }}
                          >
                            {opt.id.toUpperCase()}
                          </span>
                          <span>{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vùng mở Transcript có cảnh báo 'assisted' */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              padding: "16px 20px",
              marginBottom: "16px",
            }}
          >
            {!isRevealed ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#334155" }}>
                    🔒 Transcript bài nói đang được khoá
                  </div>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
                    Nên cố gắng nghe tự nhiên. Mở transcript trước khi nộp bài sẽ tính là &quot;Có hỗ trợ&quot;.
                  </p>
                </div>
                <button
                  onClick={handleRevealTranscript}
                  disabled={isRevealing}
                  style={{
                    padding: "8px 14px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    minHeight: "44px",
                  }}
                >
                  {isRevealing ? "Đang mở..." : "👁️ Mở xem trước transcript"}
                </button>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#b45309" }}>
                    💡 Transcript đoạn nghe (Đã mở trước khi nộp):
                  </div>
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      background: "#fef3c7",
                      color: "#b45309",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: 700,
                    }}
                  >
                    Ghi nhận Assisted
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    background: "#f8fafc",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    maxHeight: "220px",
                    overflowY: "auto",
                  }}
                >
                  {listening.transcriptSegments.map((seg, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        fontSize: "0.8125rem",
                        color: "#334155",
                        lineHeight: 1.45,
                      }}
                    >
                      <button
                        onClick={() => setSeekTo(seg.startSeconds)}
                        style={{
                          background: "#e2e8f0",
                          color: "#1e293b",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        ▶ {seg.startSeconds}s
                      </button>
                      <span>{seg.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Thông báo lỗi nếu chưa chọn đủ */}
          {submitError && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "12px 14px",
                borderRadius: "10px",
                fontSize: "0.875rem",
                marginBottom: "16px",
              }}
            >
              ⚠️ {submitError}
            </div>
          )}

          {/* Nút nộp bài */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "14px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
              minHeight: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {isSubmitting ? "Đang chấm câu hỏi..." : "📤 Nộp bài & Xem đáp án chi tiết"}
          </button>
        </div>
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
            /* TAB 1: ĐÁP ÁN & GIẢI THÍCH MỐC GIÂY */
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Thẻ tổng kết điểm */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  padding: "18px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1.125rem", color: "#0f172a" }}>
                      Kết quả nghe hiểu
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#475569", marginTop: "2px" }}>
                      {submissionResult.assisted
                        ? "Đã hoàn thành (Có xem gợi ý/transcript)"
                        : "Đã hoàn thành tự lực 100%"}
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#f0fdf4",
                      color: "#15803d",
                      border: "1px solid #bbf7d0",
                      padding: "8px 16px",
                      borderRadius: "12px",
                      fontWeight: 800,
                      fontSize: "1.125rem",
                    }}
                  >
                    {questionsReview.filter((q) => q.isCorrect).length}/{questionsReview.length} đúng
                  </div>
                </div>
              </div>

              {/* Chi tiết từng câu */}
              {questionsReview.map((q, idx) => (
                <div
                  key={q.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    border: q.isCorrect ? "1px solid #86efac" : "1px solid #fca5a5",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0f172a" }}>
                      {q.isCorrect ? "✅" : "❌"} Câu {idx + 1}: {q.prompt}
                    </div>
                  </div>

                  <div style={{ fontSize: "0.875rem", marginBottom: "8px" }}>
                    <div>
                      Lựa chọn của bạn:{" "}
                      <strong style={{ color: q.isCorrect ? "#15803d" : "#dc2626" }}>
                        {q.userOption.toUpperCase()}
                      </strong>
                    </div>
                    {!q.isCorrect && (
                      <div style={{ color: "#15803d", marginTop: "2px" }}>
                        Đáp án đúng: <strong>{q.correctOption.toUpperCase()}</strong>
                      </div>
                    )}
                  </div>

                  {/* Giải thích & Nút nghe lại mốc giây gây nhầm */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "0.8125rem",
                      color: "#334155",
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                      💡 Phân tích & Đoạn gây nhầm:
                    </div>
                    <div>{q.explanation}</div>
                    <div style={{ marginTop: "6px" }}>
                      <button
                        onClick={() => setSeekTo(q.timestamp)}
                        style={{
                          background: "#e0e7ff",
                          color: "#3730a3",
                          border: "none",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        ⏱️ Nghe lại đoạn mốc {q.timestamp}s trên video
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* TAB 2: SHADOWING TỪNG CÂU VỚI MICRO-RECORDER & EVALUATESPEAKING */
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  padding: "16px 20px",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", marginBottom: "4px" }}>
                  🎙️ Luyện Shadowing bám sát hội nghị
                </div>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#475569", lineHeight: 1.5 }}>
                  Bấm <strong>▶ Nghe</strong> để nghe diễn giả phát âm, sau đó bấm{" "}
                  <strong>Ghi âm câu này</strong> để nhại lại (Shadowing). AI sẽ so sánh phát âm của bạn với
                  chính xác câu nói của diễn giả.
                </p>
              </div>

              {shadowingError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    fontSize: "0.875rem",
                  }}
                >
                  ⚠️ {shadowingError}
                </div>
              )}

              {listening.transcriptSegments.map((seg, idx) => {
                const isSelected = shadowingIndex === idx;
                const result = shadowingResults[idx];

                return (
                  <div
                    key={idx}
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      padding: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "10px",
                        marginBottom: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            background: "#e2e8f0",
                            color: "#334155",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Câu {idx + 1} ({seg.startSeconds}s - {seg.endSeconds}s)
                        </span>
                      </div>

                      <button
                        onClick={() => setSeekTo(seg.startSeconds)}
                        style={{
                          background: "#eff6ff",
                          color: "#1e40af",
                          border: "1px solid #bfdbfe",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ▶ Nghe mẫu
                      </button>
                    </div>

                    <div
                      style={{
                        fontSize: "0.9375rem",
                        color: "#0f172a",
                        lineHeight: 1.5,
                        fontWeight: 600,
                        marginBottom: "12px",
                      }}
                    >
                      &ldquo;{seg.text}&rdquo;
                    </div>

                    {/* Vùng ghi âm câu nếu đang chọn */}
                    {isSelected ? (
                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: "10px",
                          border: "1px solid #cbd5e1",
                          padding: "12px",
                          marginTop: "10px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "10px",
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#334155" }}>
                            🎙️ Ghi âm Shadowing câu {idx + 1}:
                          </span>
                          <button
                            onClick={() => setShadowingIndex(null)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#64748b",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                            }}
                          >
                            Đóng ✕
                          </button>
                        </div>

                        <AudioRecorder
                          maxSeconds={60}
                          onRecordingComplete={(blob) => handleShadowingComplete(idx, blob)}
                          onClear={() => {}}
                        />

                        {shadowingLoading && (
                          <div
                            style={{
                              textAlign: "center",
                              padding: "12px",
                              fontSize: "0.875rem",
                              color: "#2563eb",
                              fontWeight: 600,
                            }}
                          >
                            ⏳ AI đang lắng nghe và đánh giá phát âm của bạn...
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setShadowingIndex(idx)}
                        style={{
                          padding: "6px 12px",
                          background: "#f1f5f9",
                          color: "#334155",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        🎙️ Thu âm luyện câu này
                      </button>
                    )}

                    {/* Kết quả nhận xét phát âm của câu này */}
                    {result && (
                      <div
                        style={{
                          marginTop: "12px",
                          background: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          borderRadius: "10px",
                          padding: "12px",
                          fontSize: "0.8125rem",
                          color: "#065f46",
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                          🗣️ Nhận xét phát âm ({result.pronunciation?.status}):
                        </div>
                        <div style={{ marginBottom: "6px" }}>{result.pronunciation?.notes}</div>

                        {result.transcript && (
                          <div style={{ color: "#047857", fontSize: "0.75rem" }}>
                            AI nghe được: <em>&ldquo;{result.transcript}&rdquo;</em> (Độ tin cậy:{" "}
                            {result.transcript_confidence || "tốt"})
                          </div>
                        )}

                        {result.observations && result.observations.length > 0 && (
                          <div style={{ marginTop: "6px", color: "#b45309" }}>
                            <strong>Điểm cần lưu ý:</strong>
                            <ul style={{ margin: "2px 0 0", paddingLeft: "16px" }}>
                              {result.observations.map((obs, oIdx) => (
                                <li key={oIdx}>{obs.suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
