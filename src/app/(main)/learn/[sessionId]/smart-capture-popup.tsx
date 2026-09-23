"use client";

import { useState, useEffect, useRef } from "react";

interface SmartCapturePopupProps {
  selectedText: string;
  surroundingSentence: string;
  sourceRef?: string;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onSaved?: () => void;
}

interface CapturedResult {
  phrase: string;
  ipa: string;
  context_meaning: string;
  example_sentence: string;
}

export function SmartCapturePopup({
  selectedText,
  surroundingSentence,
  sourceRef,
  position,
  onClose,
  onSaved,
}: SmartCapturePopupProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CapturedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Tra cứu tự động khi bôi đen
  useEffect(() => {
    let isCancelled = false;

    async function fetchDefinition() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/v1/vocabulary/quick-capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selected_text: selectedText,
            surrounding_sentence: surroundingSentence,
            source_ref: sourceRef || "Sổ tay siêu âm can thiệp tr.42",
          }),
        });

        if (isCancelled) return;

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Tra cứu thất bại");
        }

        const result = await res.json();
        setData(result);
      } catch (err) {
        if (!isCancelled) {
          console.error("Lỗi quick-capture:", err);
          setError(err instanceof Error ? err.message : "Không thể tra cứu thuật ngữ");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (selectedText.trim()) {
      fetchDefinition();
    }

    return () => {
      isCancelled = true;
    };
  }, [selectedText, surroundingSentence, sourceRef]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Lưu vào sổ từ (1-click save)
  async function handleSaveToVault() {
    if (!data) return;

    try {
      setIsSaving(true);
      setError(null);

      const res = await fetch("/api/v1/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phrase: data.phrase,
          ipa: data.ipa,
          context_meaning: data.context_meaning,
          original_sentence: surroundingSentence, // QUY TẮC BẮT BUỘC: phải có câu gốc
          source_ref: sourceRef || "Sổ tay siêu âm can thiệp tr.42",
          source_type: "book",
          my_attempt: "",
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Lưu thất bại");
      }

      setIsSaved(true);
      if (onSaved) onSaved();

      // Đóng popup sau 1.2s
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Lỗi khi lưu vào sổ:", err);
      setError(err instanceof Error ? err.message : "Không thể lưu vào sổ từ");
      setIsSaving(false);
    }
  }

  if (!position) return null;

  // Tính vị trí an toàn trên màn hình (tránh tràn mép phải/dưới)
  const left = Math.min(Math.max(16, position.x - 140), window.innerWidth - 320);
  const top = position.y + 24;

  return (
    <div
      ref={popupRef}
      style={{
        position: "fixed",
        left: `${left}px`,
        top: `${top}px`,
        width: "310px",
        maxWidth: "92vw",
        background: "#ffffff",
        borderRadius: "14px",
        border: "1px solid #cbd5e1",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        padding: "16px",
        zIndex: 9999,
        fontSize: "0.875rem",
        animation: "fadeIn 0.15s ease-out",
      }}
    >
      {/* Header popup */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "10px",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "1rem" }}>⚡</span>
          <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.8125rem", textTransform: "uppercase" }}>
            Quick-Capture Vault
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: "1rem",
            padding: "2px 6px",
            lineHeight: 1,
            borderRadius: "4px",
          }}
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>

      {/* Trạng thái Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "16px 0", color: "#64748b" }}>
          <div
            style={{
              display: "inline-block",
              width: "20px",
              height: "20px",
              border: "2px solid #e2e8f0",
              borderTopColor: "#4f46e5",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              marginBottom: "8px",
            }}
          />
          <div style={{ fontSize: "0.8125rem" }}>Đang tra cứu chuyên ngành y khoa...</div>
        </div>
      )}

      {/* Trạng thái Lỗi */}
      {error && !loading && (
        <div style={{ padding: "8px 0" }}>
          <div style={{ color: "#dc2626", fontSize: "0.8125rem", marginBottom: "8px" }}>
            {error}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "4px 10px",
              fontSize: "0.75rem",
              borderRadius: "6px",
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              cursor: "pointer",
            }}
          >
            Đóng
          </button>
        </div>
      )}

      {/* Kết quả Tra cứu */}
      {data && !loading && (
        <div>
          {/* Cụm từ & Phiên âm */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
              {data.phrase}
            </div>
            {data.ipa && (
              <div style={{ color: "#6366f1", fontSize: "0.8125rem", fontFamily: "monospace" }}>
                /{data.ipa.replace(/^\/|\/$/g, "")}/
              </div>
            )}
          </div>

          {/* Nghĩa chuyên ngành */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "8px 10px",
              marginBottom: "8px",
            }}
          >
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "2px" }}>
              Nghĩa cơ xương khớp / lâm sàng:
            </div>
            <div style={{ color: "#1e293b", fontWeight: 500, fontSize: "0.875rem" }}>
              {data.context_meaning}
            </div>
          </div>

          {/* Câu ví dụ */}
          {data.example_sentence && (
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontStyle: "italic", marginBottom: "12px" }}>
              &ldquo;{data.example_sentence}&rdquo;
            </div>
          )}

          {/* Nút 1-click Lưu vào sổ */}
          <button
            onClick={handleSaveToVault}
            disabled={isSaving || isSaved}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "none",
              background: isSaved ? "#16a34a" : "#4f46e5",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: isSaving || isSaved ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              minHeight: "44px",
              transition: "background 0.2s",
            }}
          >
            {isSaved ? (
              <>
                <span>✓</span> Đã lưu vào Sổ từ!
              </>
            ) : isSaving ? (
              "Đang lưu..."
            ) : (
              <>
                <span>📥</span> Lưu vào sổ (1 ngày ôn)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
