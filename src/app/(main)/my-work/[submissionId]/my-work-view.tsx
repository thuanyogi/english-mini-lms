"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WritingFeedback } from "@/server/providers/gemini";
import { MyWorkHeader } from "./components/my-work-header";
import { MyWorkAssessmentStatus } from "./components/my-work-assessment-status";
import { MyWorkCompare } from "./components/my-work-compare";
import { MyWorkSubmissionBody } from "./components/my-work-submission-body";
import { MyWorkFeedback } from "./components/my-work-feedback";

interface MyWorkViewProps {
  submission: {
    id: string;
    sessionId: string;
    revision: number;
    body: string | null;
    assisted: boolean;
    submittedAt: Date;
    audioUrl?: string | null;
    confirmedTranscript?: string | null;
  };
  activity: {
    id: string;
    slot: string | null;
    title: string;
    mode: string;
    promptText: string | null;
  };
  assessment: {
    id: string;
    status: string;
    resultRef: string | null;
  } | null;
  feedback: (WritingFeedback & {
    id?: string;
    reviewState?: string;
    pronunciation?: { status: "assessed" | "not_assessable"; notes: string } | null;
  }) | null;
  parent: {
    submission: {
      id: string;
      revision: number;
      body: string | null;
      assisted: boolean;
      submittedAt: Date;
      audioUrl?: string | null;
      confirmedTranscript?: string | null;
    };
    feedback: (WritingFeedback & {
      id?: string;
      reviewState?: string;
      pronunciation?: { status: "assessed" | "not_assessable"; notes: string } | null;
    }) | null;
  } | null;
}

export function MyWorkView({
  submission,
  activity,
  assessment,
  feedback,
  parent,
}: MyWorkViewProps) {
  const router = useRouter();
  const [isCreatingRevision, setIsCreatingRevision] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"current" | "compare">("current");

  // Tạo phiên sửa bài (Bản 2)
  async function handleStartRevision() {
    try {
      setIsCreatingRevision(true);
      const res = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: activity.id,
          targetMinutes: 30,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.sessionId) {
          router.push(`/learn/${data.sessionId}?parentId=${submission.id}`);
          return;
        }
        throw new Error(data.error || "Không thể tạo phiên sửa bài");
      }

      router.push(`/learn/${data.sessionId}?parentId=${submission.id}`);
    } catch (err) {
      console.error("Lỗi khi mở bản sửa:", err);
      setIsCreatingRevision(false);
    }
  }

  // Chấm lại assessment failed
  async function handleRetry() {
    if (!assessment) return;
    try {
      setIsRetrying(true);
      setRetryError(null);
      const res = await fetch(`/api/v1/assessments/${assessment.id}/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Chấm lại thất bại");
      }
      router.refresh();
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Chấm lại thất bại");
    } finally {
      setIsRetrying(false);
    }
  }

  // Helper hiển thị cấu trúc bài đọc/dịch hoặc plain text
  function renderSubmissionContent(body: string | null) {
    if (!body) return "(Không có nội dung)";
    try {
      const parsed = JSON.parse(body);
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed.translation || parsed.mainIdea || parsed.keyTerms)
      ) {
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {parsed.mainIdea && (
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#475569", marginBottom: "4px" }}>
                  🎯 1. Ý chính của đoạn:
                </div>
                <div style={{ color: "#334155", background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  {parsed.mainIdea}
                </div>
              </div>
            )}
            {parsed.translation && (
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#475569", marginBottom: "4px" }}>
                  🇻🇳 2. Bản dịch tiếng Việt:
                </div>
                <div style={{ color: "#0f172a", background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap" }}>
                  {parsed.translation}
                </div>
              </div>
            )}
            {parsed.keyTerms && (
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#475569", marginBottom: "4px" }}>
                  🔬 3. Ba thuật ngữ tự giải thích:
                </div>
                <div style={{ color: "#334155", background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap" }}>
                  {parsed.keyTerms}
                </div>
              </div>
            )}
          </div>
        );
      }
    } catch {
      // not JSON
    }
    return <div style={{ whiteSpace: "pre-wrap" }}>{body}</div>;
  }

  return (
    <div
      style={{
        maxWidth: "768px",
        margin: "0 auto",
        padding: "16px 16px 40px",
      }}
    >
      {/* 1. Header & Điều hướng */}
      <MyWorkHeader
        activity={activity}
        submission={submission}
        hasParent={Boolean(parent)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onStartRevision={handleStartRevision}
        isCreatingRevision={isCreatingRevision}
      />

      {/* 2. Trạng thái assessment: Đang chờ chấm (queued/processing) hoặc Lỗi (failed) */}
      <MyWorkAssessmentStatus
        assessment={assessment}
        isRetrying={isRetrying}
        retryError={retryError}
        onRetry={handleRetry}
      />

      {/* 3. Nội dung bài làm & So sánh */}
      {activeTab === "compare" && parent ? (
        <MyWorkCompare
          currentSubmission={submission}
          currentFeedback={feedback}
          parent={parent}
          renderSubmissionContent={renderSubmissionContent}
        />
      ) : (
        <MyWorkSubmissionBody
          submissionId={submission.id}
          activityMode={activity.mode}
          body={submission.body}
          confirmedTranscript={submission.confirmedTranscript}
          audioUrl={submission.audioUrl}
          renderSubmissionContent={renderSubmissionContent}
        />
      )}

      {/* 4. Nhận xét chi tiết từ AI (Observations, Scores, Strengths, Limitations) */}
      <MyWorkFeedback feedback={feedback} />
    </div>
  );
}
