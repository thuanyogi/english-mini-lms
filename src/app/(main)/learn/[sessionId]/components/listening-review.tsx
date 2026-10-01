"use client";

export interface QuestionFeedback {
  id: string;
  prompt: string;
  userOption: string;
  correctOption: string;
  isCorrect: boolean;
  explanation: string;
  timestamp: number;
}

interface ListeningReviewProps {
  assisted: boolean;
  questionsReview: QuestionFeedback[];
  onSeek: (seconds: number) => void;
}

export function ListeningReview({
  assisted,
  questionsReview,
  onSeek,
}: ListeningReviewProps) {
  const correctCount = questionsReview.filter((q) => q.isCorrect).length;

  return (
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
              {assisted
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
            {correctCount}/{questionsReview.length} đúng
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
                onClick={() => onSeek(q.timestamp)}
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
  );
}
