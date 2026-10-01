"use client";

interface Question {
  id: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
}

interface ListeningQuestionsProps {
  questions: Question[];
  answers: Record<string, string>;
  onSelectOption: (questionId: string, optionId: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError: string | null;
  children?: React.ReactNode;
}

export function ListeningQuestions({
  questions,
  answers,
  onSelectOption,
  onSubmit,
  isSubmitting,
  submitError,
  children,
}: ListeningQuestionsProps) {
  return (
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
            📝 Câu hỏi nghe hiểu ({questions.length} câu):
          </div>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            Đáp án được bảo mật cho đến khi nộp
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {questions.map((q, idx) => (
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
                      onClick={() => onSelectOption(q.id, opt.id)}
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

      {children}

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
        onClick={onSubmit}
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
  );
}
