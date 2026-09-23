"use client";

import { useState, useRef, useEffect } from "react";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
  onClear: () => void;
  maxSeconds?: number;
}

export function AudioRecorder({
  onRecordingComplete,
  onClear,
  maxSeconds = 300, // 5 phút
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isZaloBrowser] = useState(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      return /Zalo/i.test(ua) || /FBAV|FBAN|Line/i.test(ua);
    }
    return false;
  });
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);



  // Format seconds -> MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  // Start recording
  async function startRecording() {
    setPermissionError(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Trình duyệt của bạn không hỗ trợ ghi âm trực tiếp. Hãy mở bằng Safari hoặc Chrome."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Chọn định dạng MIME tối ưu theo thiết bị
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4"; // iOS Safari
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setRecordedBlob(audioBlob);
        setAudioUrl(url);

        const finalSecs = Math.round((Date.now() - startTimeRef.current) / 1000);
        onRecordingComplete(audioBlob, finalSecs);

        // Tắt tất cả tracks micro
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // Thu theo từng chunk 250ms
      setIsRecording(true);
      setDuration(0);
      startTimeRef.current = Date.now();

      // Đếm giờ
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        // Tự động dừng khi đạt giới hạn 5 phút
        if (elapsed >= maxSeconds) {
          stopRecording();
        }
      }, 500);
    } catch (err) {
      console.error("Lỗi khi mở micro:", err);
      setPermissionError(
        err instanceof Error
          ? err.message
          : "Không thể truy cập micro. Hãy cấp quyền trong cài đặt trình duyệt."
      );
    }
  }

  // Stop recording
  function stopRecording() {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }

  // Clear / Re-record
  function handleReset() {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setRecordedBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsRecording(false);
    onClear();
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        padding: "20px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
      }}
    >
      {/* Cảnh báo trình duyệt Zalo / in-app */}
      {isZaloBrowser && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "10px",
            padding: "10px 14px",
            marginBottom: "16px",
            fontSize: "0.8125rem",
            color: "#92400e",
            lineHeight: 1.45,
          }}
        >
          💡 <strong>Lưu ý:</strong> Nếu tính năng ghi âm không chạy trong Zalo, vui lòng chạm biểu tượng menu (⋯) và chọn <strong>&ldquo;Mở bằng Safari&rdquo;</strong> (iPhone) hoặc <strong>&ldquo;Mở bằng Chrome&rdquo;</strong> (Android).
        </div>
      )}

      {/* Lỗi quyền micro */}
      {permissionError && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            padding: "10px 14px",
            marginBottom: "16px",
            fontSize: "0.8125rem",
            color: "#b91c1c",
          }}
        >
          ⚠️ {permissionError}
        </div>
      )}

      {/* Khu vực trạng thái thời gian và chỉ báo ghi âm */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          background: isRecording ? "#fef2f2" : "#f8fafc",
          borderRadius: "14px",
          border: isRecording ? "2px solid #ef4444" : "1px dashed #cbd5e1",
          marginBottom: "18px",
          transition: "all 0.3s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "8px",
          }}
        >
          {isRecording && (
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: "#ef4444",
                animation: "pulse 1s infinite alternate",
              }}
            />
          )}
          <span
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              fontFamily: "monospace",
              color: isRecording ? "#dc2626" : "#0f172a",
            }}
          >
            {formatTime(duration)}
          </span>
          <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
            / {formatTime(maxSeconds)}
          </span>
        </div>

        <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>
          {isRecording
            ? "Đang thu âm giọng nói của bạn... Nhấn Dừng khi hoàn thành."
            : recordedBlob
            ? "Đã ghi âm xong. Bạn có thể nghe lại bên dưới hoặc thu lại."
            : "Sẵn sàng thu âm (tối đa 5 phút). Hãy đảm bảo ở nơi yên tĩnh."}
        </div>
      </div>

      {/* Trình phát nghe lại âm thanh */}
      {audioUrl && !isRecording && (
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            🎧 Nghe lại bài nói trước khi nộp:
          </div>
          <audio
            controls
            src={audioUrl}
            style={{ width: "100%", height: "44px", borderRadius: "8px" }}
          />
        </div>
      )}

      {/* Các nút bấm điều khiển (Touch targets >= 44px) */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {!isRecording && !recordedBlob && (
          <button
            onClick={startRecording}
            style={{
              flex: 1,
              padding: "12px 20px",
              borderRadius: "10px",
              border: "none",
              background: "#dc2626",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
              minHeight: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
            }}
          >
            <span>🎙️</span> Bắt đầu ghi âm
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            style={{
              flex: 1,
              padding: "12px 20px",
              borderRadius: "10px",
              border: "none",
              background: "#0f172a",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
              minHeight: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span>⏹️</span> Dừng ghi âm ({formatTime(duration)})
          </button>
        )}

        {recordedBlob && !isRecording && (
          <button
            onClick={handleReset}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#475569",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🗑️</span> Thu lại từ đầu
          </button>
        )}
      </div>
    </div>
  );
}
