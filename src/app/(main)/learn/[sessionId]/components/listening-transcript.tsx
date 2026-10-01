"use client";

interface TranscriptSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

interface ListeningTranscriptProps {
  isRevealed: boolean;
  isRevealing: boolean;
  onReveal: () => void;
  segments: TranscriptSegment[];
  onSeek: (seconds: number) => void;
}

export function ListeningTranscript({
  isRevealed,
  isRevealing,
  onReveal,
  segments,
  onSeek,
}: ListeningTranscriptProps) {
  return (
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
            onClick={onReveal}
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
            {segments.map((seg, idx) => (
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
                  onClick={() => onSeek(seg.startSeconds)}
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
  );
}
