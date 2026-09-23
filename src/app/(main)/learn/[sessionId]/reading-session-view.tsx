"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SmartCapturePopup } from "./smart-capture-popup";

interface ReadingSessionViewProps {
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
    durationMinutes?: number | null;
  };
  segment: {
    id: string;
    page: number | null;
    textContent: string | null;
    sourceId: string;
    sourceTitle: string | null;
  } | null;
  initialDraft: string;
}

export function ReadingSessionView({
  sessionId,
  targetMinutes,
  activity,
  segment,
  initialDraft,
}: ReadingSessionViewProps) {
  const router = useRouter();

  // Parse initial draft if it is JSON
  const [initialData] = useState(() => {
    if (!initialDraft) return { mainIdea: "", translation: "", keyTerms: "" };
    try {
      const parsed = JSON.parse(initialDraft);
      if (parsed && typeof parsed === "object") {
        return {
          mainIdea: parsed.mainIdea || "",
          translation: parsed.translation || "",
          keyTerms: parsed.keyTerms || "",
        };
      }
    } catch {
      // not JSON, treat as translation text
    }
    return { mainIdea: "", translation: initialDraft, keyTerms: "" };
  });

  const [mainIdea, setMainIdea] = useState(initialData.mainIdea);
  const [translation, setTranslation] = useState(initialData.translation);
  const [keyTerms, setKeyTerms] = useState(initialData.keyTerms);

  // Draft saving state
  const [draftVersion, setDraftVersion] = useState(1);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Timer state
  const [secondsRemaining, setSecondsRemaining] = useState(targetMinutes * 60);
  const [timerActive] = useState(true);

  // Text selection & Quick-capture popup state
  const [selectionData, setSelectionData] = useState<{
    selectedText: string;
    surroundingSentence: string;
    position: { x: number; y: number };
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const segmentContent =
    segment?.textContent ||
    `Ultrasound guidance provides real-time visualization of anatomical structures, needle advancement, and injectate distribution during interventional pain procedures. When performing a suprascapular nerve block, dynamic high-resolution imaging enables precise localization of the nerve within the supraspinatus fossa, beneath the superior transverse scapular ligament. The high-frequency linear transducer should be aligned in a coronal oblique plane parallel to the spine of the scapula.

Direct sonographic monitoring substantially minimizes the risk of accidental intravascular injection and pneumothorax compared with blind landmark-based approaches. Continuous observation verifies that the therapeutic solution distends the intended fascial compartment without traumatizing adjacent vascular bundles. Proper probe orientation, meticulous transducer stabilization, and an in-plane needle trajectory represent critical technical principles for achieving optimal clinical outcomes while maintaining patient safety throughout the intervention.`;

  const sourceTitle =
    segment?.sourceTitle ||
    "Sổ tay hướng dẫn các thủ thuật can thiệp giảm đau dưới siêu âm";
  const sourcePage = segment?.page ?? 42;
  const sourceRef = `${sourceTitle}, Trang ${sourcePage}`;

  // Timer countdown
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

  // Format time MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Keep references for auto-save
  const contentRef = useRef({ mainIdea, translation, keyTerms });
  useEffect(() => {
    contentRef.current = { mainIdea, translation, keyTerms };
  }, [mainIdea, translation, keyTerms]);

  // Auto-save draft every 30s
  useEffect(() => {
    const autoSaveTimer = setInterval(async () => {
      const current = contentRef.current;
      if (!current.translation.trim() && !current.mainIdea.trim()) return;

      try {
        const payload = JSON.stringify(current);
        await fetch(`/api/v1/sessions/${sessionId}/drafts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: payload,
            version: draftVersion,
          }),
        });

        const now = new Date();
        setLastSavedAt(
          `${now.getHours().toString().padStart(2, "0")}:${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}`
        );
        setDraftVersion((v) => v + 1);
      } catch (err) {
        console.warn("Auto-save draft failed:", err);
      }
    }, 30000);

    return () => clearInterval(autoSaveTimer);
  }, [sessionId, draftVersion]);

  // Manual save draft
  async function handleManualSaveDraft() {
    try {
      setIsSavingDraft(true);
      const payload = JSON.stringify(contentRef.current);
      await fetch(`/api/v1/sessions/${sessionId}/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: payload,
          version: draftVersion,
        }),
      });

      const now = new Date();
      setLastSavedAt(
        `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}`
      );
      setDraftVersion((v) => v + 1);
    } catch (err) {
      console.error("Save draft error:", err);
    } finally {
      setIsSavingDraft(false);
    }
  }

  // Helper to extract enclosing sentence around selection
  const extractSurroundingSentence = useCallback((fullText: string, selected: string): string => {
    if (!fullText || !selected) return selected;
    const index = fullText.indexOf(selected);
    if (index === -1) return selected;

    let start = index;
    while (start > 0 && !/[.!?\n]/.test(fullText[start - 1])) {
      start--;
    }

    let end = index + selected.length;
    while (end < fullText.length && !/[.!?\n]/.test(fullText[end])) {
      end++;
    }
    if (end < fullText.length && /[.!?]/.test(fullText[end])) {
      end++;
    }

    const sentence = fullText.slice(start, end).trim();
    return sentence.length > 0 ? sentence : selected;
  }, []);

  // Text selection handler on original text block
  function handleTextSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 1 && text.length < 120) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      const surrounding = extractSurroundingSentence(segmentContent, text);

      setSelectionData({
        selectedText: text,
        surroundingSentence: surrounding,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.bottom + window.scrollY,
        },
      });
    }
  }

  // Submit reading assignment
  async function handleSubmit() {
    if (!translation.trim()) {
      setSubmitError("Vui lòng nhập bản dịch tiếng Việt trước khi nộp bài.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const submissionPayload = JSON.stringify({
        mainIdea: mainIdea.trim(),
        translation: translation.trim(),
        keyTerms: keyTerms.trim(),
      });

      const res = await fetch(`/api/v1/sessions/${sessionId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: submissionPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nộp bài thất bại");
      }

      router.push(`/my-work/${data.submissionId}`);
    } catch (err) {
      console.error("Lỗi khi nộp bài:", err);
      setSubmitError(
        err instanceof Error ? err.message : "Đã có lỗi xảy ra khi nộp bài. Vui lòng thử lại."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px" }}>
      {/* Toast thông báo lưu từ thành công */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            right: "20px",
            background: "#0f172a",
            color: "#ffffff",
            padding: "10px 16px",
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 9999,
            fontSize: "0.875rem",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Floating Smart Capture Popup */}
      {selectionData && (
        <SmartCapturePopup
          selectedText={selectionData.selectedText}
          surroundingSentence={selectionData.surroundingSentence}
          sourceRef={sourceRef}
          position={selectionData.position}
          onClose={() => setSelectionData(null)}
          onSaved={() => {
            setToastMessage(`Đã lưu "${selectionData.selectedText}" vào Sổ từ!`);
            setTimeout(() => setToastMessage(null), 3000);
          }}
        />
      )}

      {/* Thanh Header điều hướng */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <Link
          href="/library"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.875rem",
            color: "#64748b",
            textDecoration: "none",
            minHeight: "44px",
          }}
        >
          ← Về Thư viện bài tập
        </Link>

        {/* Đồng hồ đếm ngược và trạng thái */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {lastSavedAt && (
            <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 500 }}>
              ✓ Đã lưu nháp lúc {lastSavedAt}
            </span>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "10px",
              background: secondsRemaining < 300 ? "#fee2e2" : "#f1f5f9",
              color: secondsRemaining < 300 ? "#b91c1c" : "#1e293b",
              fontWeight: 700,
              fontSize: "1rem",
              fontFamily: "monospace",
              border: "1px solid",
              borderColor: secondsRemaining < 300 ? "#fca5a5" : "#e2e8f0",
            }}
          >
            ⏱️ {timeString}
          </div>
        </div>
      </div>

      {/* Tiêu đề bài tập */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "16px 20px",
          marginBottom: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "6px",
              background: "#ecfdf5",
              color: "#047857",
            }}
          >
            {activity.slot || "R1"} · Reading &amp; Translation
          </span>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            Mục tiêu: {activity.durationMinutes || 25} phút
          </span>
        </div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
          {activity.title}
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#475569", margin: 0 }}>
          {activity.objective || "Nêu ý chính, dịch sang tiếng Việt trung thành, giải thích 3 thuật ngữ."}
        </p>
      </div>

      {/* Khung làm việc 2 cột */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* CỘT TRÁI: Đoạn văn bản gốc từ source_segments */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header Cột gốc */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.125rem" }}>📖</span>
                <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1e293b" }}>
                  ĐOẠN VĂN BẢN GỐC
                </span>
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: "#e0e7ff",
                  color: "#3730a3",
                }}
              >
                Trang {sourcePage}
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px", fontStyle: "italic" }}>
              {sourceTitle}
            </div>
          </div>

          {/* Banner hướng dẫn Quick-Capture */}
          <div
            style={{
              background: "#f0fdf4",
              borderBottom: "1px solid #dcfce7",
              padding: "10px 18px",
              fontSize: "0.8125rem",
              color: "#166534",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>💡</span>
            <span>
              <strong>Vocabulary Vault:</strong> Bôi đen bất kỳ từ hoặc cụm từ nào dưới đây để tra cứu nghĩa lâm sàng và bấm <em>&ldquo;Lưu vào sổ&rdquo;</em> 1-click.
            </span>
          </div>

          {/* Nội dung đoạn văn tiếng Anh gốc với bộ lắng nghe selection */}
          <div
            onMouseUp={handleTextSelection}
            onTouchEnd={handleTextSelection}
            style={{
              padding: "20px 22px",
              fontSize: "1rem",
              lineHeight: 1.75,
              color: "#0f172a",
              userSelect: "text",
              whiteSpace: "pre-line",
            }}
          >
            {segmentContent}
          </div>
        </div>

        {/* CỘT PHẢI: 3 ô nhập bài làm của Bác sĩ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Ô 1: Ý chính */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              padding: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <label
              htmlFor="main-idea-input"
              style={{
                display: "block",
                fontWeight: 700,
                fontSize: "0.875rem",
                color: "#1e293b",
                marginBottom: "6px",
              }}
            >
              1. Ý chính của đoạn (Main Idea)
            </label>
            <textarea
              id="main-idea-input"
              value={mainIdea}
              onChange={(e) => setMainIdea(e.target.value)}
              placeholder="Tóm tắt ý chính của đoạn văn (1-2 câu tiếng Việt hoặc tiếng Anh)..."
              rows={3}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "1rem",
                lineHeight: 1.5,
                color: "#0f172a",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Ô 2: Bản dịch tiếng Việt */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              padding: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label
                htmlFor="translation-input"
                style={{
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  color: "#1e293b",
                }}
              >
                2. Bản dịch tiếng Việt (Translation) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {translation.trim() ? translation.trim().split(/\s+/).length : 0} từ
              </span>
            </div>
            <textarea
              id="translation-input"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="Dịch toàn bộ đoạn văn sang tiếng Việt chuẩn văn phong y khoa..."
              rows={9}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "1rem",
                lineHeight: 1.6,
                color: "#0f172a",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Ô 3: 3 thuật ngữ tự giải thích */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              padding: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <label
              htmlFor="key-terms-input"
              style={{
                display: "block",
                fontWeight: 700,
                fontSize: "0.875rem",
                color: "#1e293b",
                marginBottom: "6px",
              }}
            >
              3. Ba thuật ngữ tự giải thích (Key Terms)
            </label>
            <textarea
              id="key-terms-input"
              value={keyTerms}
              onChange={(e) => setKeyTerms(e.target.value)}
              placeholder="Ví dụ:&#10;1. suprascapular nerve block: Phong bế thần kinh trên vai...&#10;2. superior transverse scapular ligament: Dây chằng ngang vai trên...&#10;3. fascial compartment: Khoang cân mạc..."
              rows={4}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "1rem",
                lineHeight: 1.5,
                color: "#0f172a",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Báo lỗi submit */}
          {submitError && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                padding: "12px 14px",
                color: "#b91c1c",
                fontSize: "0.875rem",
              }}
            >
              ⚠️ {submitError}
            </div>
          )}

          {/* Thanh tác vụ: Lưu nháp & Nộp bài */}
          <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
            <button
              onClick={handleManualSaveDraft}
              disabled={isSavingDraft || isSubmitting}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#334155",
                fontWeight: 600,
                fontSize: "0.9375rem",
                cursor: isSavingDraft || isSubmitting ? "not-allowed" : "pointer",
                minHeight: "48px",
              }}
            >
              {isSavingDraft ? "Đang lưu..." : "💾 Lưu nháp"}
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !translation.trim()}
              style={{
                flex: 2,
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                background: !translation.trim() || isSubmitting ? "#94a3b8" : "#047857",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: !translation.trim() || isSubmitting ? "not-allowed" : "pointer",
                minHeight: "48px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              {isSubmitting ? "Đang chấm bài với Gemini..." : "🚀 Nộp bài & Nhận nhận xét"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
