"use client";

import { AudioRecorder } from "../audio-recorder";
import type { SpeakingFeedback } from "@/server/providers/gemini";

interface TranscriptSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

interface ListeningShadowingProps {
  segments: TranscriptSegment[];
  shadowingIndex: number | null;
  onSelectShadowingIndex: (idx: number | null) => void;
  shadowingLoading: boolean;
  shadowingError: string | null;
  shadowingResults: Record<number, SpeakingFeedback>;
  onShadowingComplete: (idx: number, blob: Blob) => Promise<void>;
  onSeek: (seconds: number) => void;
}

export function ListeningShadowing({
  segments,
  shadowingIndex,
  onSelectShadowingIndex,
  shadowingLoading,
  shadowingError,
  shadowingResults,
  onShadowingComplete,
  onSeek,
}: ListeningShadowingProps) {
  return (
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

      {segments.map((seg, idx) => {
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
                onClick={() => onSeek(seg.startSeconds)}
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
                    onClick={() => onSelectShadowingIndex(null)}
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
                  onRecordingComplete={(blob) => onShadowingComplete(idx, blob)}
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
                onClick={() => onSelectShadowingIndex(idx)}
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
  );
}
