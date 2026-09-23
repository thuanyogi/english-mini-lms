"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Khai báo kiểu cho YouTube IFrame API
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubePlayerProps {
  videoUrl: string;
  startSeconds: number;
  endSeconds: number;
  seekTo?: number | null;
  onTimeUpdate?: (currentSec: number) => void;
}

export function YouTubePlayer({
  videoUrl,
  startSeconds,
  endSeconds,
  seekTo,
  onTimeUpdate,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const checkTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<0.75 | 1>(1);
  const [embedError, setEmbedError] = useState(false);
  const [currentTime, setCurrentTime] = useState(startSeconds);
  const [isReady, setIsReady] = useState(false);

  // Trích xuất YouTube video ID
  const extractVideoId = useCallback((url: string): string => {
    if (!url) return "M7lc1UVf-VE";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : url;
  }, []);

  const videoId = extractVideoId(videoUrl);

  // Theo dõi thời gian phát để chặn không phát vượt quá endSeconds
  const startPollingTime = useCallback(() => {
    if (checkTimeIntervalRef.current) clearInterval(checkTimeIntervalRef.current);
    checkTimeIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        try {
          const curr = playerRef.current.getCurrentTime();
          setCurrentTime(Math.round(curr));
          onTimeUpdate?.(curr);

          // Nếu chạm mốc kết thúc endSeconds, dừng lại và đưa về startSeconds
          if (curr >= endSeconds) {
            playerRef.current.pauseVideo();
            playerRef.current.seekTo(startSeconds, true);
            setIsPlaying(false);
          }
        } catch {
          // player state might be transitioning
        }
      }
    }, 250);
  }, [endSeconds, onTimeUpdate, startSeconds]);

  const stopPollingTime = useCallback(() => {
    if (checkTimeIntervalRef.current) {
      clearInterval(checkTimeIntervalRef.current);
      checkTimeIntervalRef.current = null;
    }
  }, []);

  // Khởi tạo player
  const initPlayer = useCallback(() => {
    if (!window.YT || !window.YT.Player || !containerRef.current) return;

    try {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      const playerElementId = `yt-player-${Math.random().toString(36).substring(2, 9)}`;
      const innerDiv = document.createElement("div");
      innerDiv.id = playerElementId;
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(innerDiv);

      playerRef.current = new window.YT.Player(playerElementId, {
        videoId: videoId,
        playerVars: {
          start: startSeconds,
          end: endSeconds,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: () => {
            setIsReady(true);
            try {
              playerRef.current.seekTo(startSeconds, true);
            } catch {
              // ignore
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING === 1
            if (event.data === 1) {
              setIsPlaying(true);
              startPollingTime();
            } else {
              setIsPlaying(false);
              stopPollingTime();
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onError: (event: any) => {
            console.warn("YouTube player error:", event.data);
            // Mã lỗi 101, 150 = không cho nhúng (not allowed to embed)
            if (event.data === 101 || event.data === 150 || event.data === 100) {
              setEmbedError(true);
            }
          },
        },
      });
    } catch (err) {
      console.error("Lỗi khởi tạo YouTube player:", err);
      setEmbedError(true);
    }
  }, [endSeconds, startPollingTime, startSeconds, stopPollingTime, videoId]);

  // Nạp YouTube IFrame API script
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timer: NodeJS.Timeout | null = null;
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      timer = setTimeout(() => {
        initPlayer();
      }, 0);
    }

    return () => {
      if (timer) clearTimeout(timer);
      stopPollingTime();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [initPlayer, stopPollingTime]);

  // Xử lý seek từ bên ngoài (ví dụ bấm câu Shadowing)
  useEffect(() => {
    if (seekTo !== undefined && seekTo !== null && playerRef.current && isReady) {
      try {
        playerRef.current.seekTo(seekTo, true);
        playerRef.current.playVideo();
      } catch {
        // ignore
      }
    }
  }, [seekTo, isReady]);

  // Điều khiển: Phát / Dừng
  const togglePlay = () => {
    if (!playerRef.current || !isReady) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        const curr = playerRef.current.getCurrentTime();
        if (curr < startSeconds || curr >= endSeconds) {
          playerRef.current.seekTo(startSeconds, true);
        }
        playerRef.current.playVideo();
      }
    } catch {
      // ignore
    }
  };

  // Điều khiển: Nghe lại toàn đoạn
  const replaySegment = () => {
    if (!playerRef.current || !isReady) return;
    try {
      playerRef.current.seekTo(startSeconds, true);
      playerRef.current.playVideo();
    } catch {
      // ignore
    }
  };

  // Điều khiển: Đổi tốc độ (0.75x hoặc 1.0x)
  const changeSpeed = (rate: 0.75 | 1) => {
    if (!playerRef.current || !isReady) return;
    try {
      playerRef.current.setPlaybackRate(rate);
      setPlaybackRate(rate);
    } catch {
      // ignore
    }
  };

  const directYoutubeLink = `https://www.youtube.com/watch?v=${videoId}&t=${startSeconds}s`;

  return (
    <div
      style={{
        background: "#0f172a",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #1e293b",
        marginBottom: "16px",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
      }}
    >
      {/* Cảnh báo video chặn nhúng */}
      {embedError ? (
        <div
          style={{
            padding: "24px 20px",
            background: "#1e1b4b",
            color: "#e0e7ff",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "1.75rem", marginBottom: "8px" }}>🎬</div>
          <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "6px" }}>
            Video bị chủ sở hữu giới hạn phát nhúng trên web
          </div>
          <p style={{ fontSize: "0.875rem", color: "#c7d2fe", margin: "0 0 14px 0", lineHeight: 1.5 }}>
            Bạn vẫn hoàn toàn làm bài bình thường! Hãy mở video ở tab mới để xem đoạn từ{" "}
            <strong>{startSeconds}s đến {endSeconds}s</strong>, sau đó quay lại đây chọn đáp án.
          </p>
          <a
            href={directYoutubeLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ef4444",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            ▶ Mở video trên YouTube ({startSeconds}s - {endSeconds}s) ↗
          </a>
        </div>
      ) : (
        <>
          {/* Vùng chứa IFrame YouTube Player 16:9 */}
          <div
            style={{
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
              overflow: "hidden",
              background: "#000000",
            }}
          >
            <div
              ref={containerRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
            />
          </div>

          {/* Thanh công cụ điều khiển phát */}
          <div
            style={{
              padding: "12px 16px",
              background: "#1e293b",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Nút Play / Pause */}
              <button
                onClick={togglePlay}
                style={{
                  background: isPlaying ? "#f59e0b" : "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isPlaying ? "⏸ Dừng" : "▶ Phát"}
              </button>

              {/* Nút Nghe lại đoạn */}
              <button
                onClick={replaySegment}
                style={{
                  background: "#334155",
                  color: "#f1f5f9",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="Nghe lại đoạn từ đầu"
              >
                🔄 Nghe lại đoạn
              </button>
            </div>

            {/* Mốc thời gian & Tốc độ phát */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "0.8125rem", color: "#94a3b8", fontWeight: 600 }}>
                {currentTime}s / {endSeconds}s (Đoạn: {startSeconds}s - {endSeconds}s)
              </span>

              {/* Chuyển đổi tốc độ 0.75x / 1.0x */}
              <div
                style={{
                  display: "flex",
                  background: "#0f172a",
                  borderRadius: "8px",
                  padding: "2px",
                  border: "1px solid #334155",
                }}
              >
                <button
                  onClick={() => changeSpeed(0.75)}
                  style={{
                    background: playbackRate === 0.75 ? "#2563eb" : "transparent",
                    color: playbackRate === 0.75 ? "#ffffff" : "#94a3b8",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  0.75x
                </button>
                <button
                  onClick={() => changeSpeed(1)}
                  style={{
                    background: playbackRate === 1 ? "#2563eb" : "transparent",
                    color: playbackRate === 1 ? "#ffffff" : "#94a3b8",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  1.0x
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
