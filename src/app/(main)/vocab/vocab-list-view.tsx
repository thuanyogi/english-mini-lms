"use client";

import { useState } from "react";
import Link from "next/link";

export interface VocabularyItem {
  id: string;
  learnerId: string;
  phrase: string;
  ipa: string | null;
  contextMeaning: string | null;
  originalSentence: string | null;
  sourceType: string | null;
  sourceRef: string | null;
  myAttempt: string | null;
  masteryLevel: number;
  dueAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface VocabListViewProps {
  initialItems: VocabularyItem[];
}

export function VocabListView({ initialItems }: VocabListViewProps) {
  const [items, setItems] = useState<VocabularyItem[]>(initialItems);
  const [activeFilter, setActiveFilter] = useState<"all" | "due" | "mastered">("all");
  const [expandedId, setExpandedId] = useState<string | null>(
    initialItems.length > 0 ? initialItems[0].id : null
  );
  const [attemptInputs, setAttemptInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const item of initialItems) {
      map[item.id] = item.myAttempt || "";
    }
    return map;
  });
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [isLoadingFilter, setIsLoadingFilter] = useState(false);

  const now = new Date();

  // Đếm số từ đến hạn
  const dueCount = items.filter(
    (i) => new Date(i.dueAt) <= now && i.masteryLevel < 4
  ).length;

  // Lọc items theo activeFilter
  const filteredItems = items.filter((item) => {
    if (activeFilter === "due") {
      return new Date(item.dueAt) <= now && item.masteryLevel < 4;
    }
    if (activeFilter === "mastered") {
      return item.masteryLevel >= 4;
    }
    return true;
  });

  // Chuyển tab lọc
  async function handleFilterChange(filter: "all" | "due" | "mastered") {
    setActiveFilter(filter);
    try {
      setIsLoadingFilter(true);
      const res = await fetch(`/api/v1/vocabulary?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        // Cập nhật attempt inputs
        setAttemptInputs((prev) => {
          const next = { ...prev };
          for (const item of data.items) {
            if (next[item.id] === undefined) {
              next[item.id] = item.myAttempt || "";
            }
          }
          return next;
        });
      }
    } catch (err) {
      console.error("Lỗi tải danh sách từ:", err);
    } finally {
      setIsLoadingFilter(false);
    }
  }

  // Lưu "Câu của tôi" (my_attempt)
  async function handleSaveAttempt(itemId: string) {
    const attemptText = attemptInputs[itemId] || "";
    try {
      setSavingMap((prev) => ({ ...prev, [itemId]: true }));

      const res = await fetch(`/api/v1/vocabulary/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          my_attempt: attemptText,
        }),
      });

      if (!res.ok) {
        throw new Error("Không thể lưu câu tự đặt");
      }

      const data = await res.json();

      // Cập nhật lại trong items
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, myAttempt: data.vocabulary.myAttempt } : i
        )
      );

      setSavedMap((prev) => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setSavedMap((prev) => ({ ...prev, [itemId]: false }));
      }, 2500);
    } catch (err) {
      console.error("Lỗi khi lưu câu tự đặt:", err);
      alert("Lỗi khi lưu câu của bạn. Vui lòng thử lại.");
    } finally {
      setSavingMap((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  // Đánh dấu đã thuộc / cần ôn
  async function handleToggleMastered(itemId: string, currentLevel: number) {
    const newLevel = currentLevel >= 4 ? 0 : 4;
    try {
      const res = await fetch(`/api/v1/vocabulary/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mastery_level: newLevel,
        }),
      });

      if (res.ok) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, masteryLevel: newLevel } : i
          )
        );
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật trạng thái thuộc từ:", err);
    }
  }

  // Nhóm các mục theo ngày
  const groupedByDate: Record<string, VocabularyItem[]> = {};
  for (const item of filteredItems) {
    const dateStr = new Date(item.createdAt).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    if (!groupedByDate[dateStr]) {
      groupedByDate[dateStr] = [];
    }
    groupedByDate[dateStr].push(item);
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "16px 16px 60px" }}>
      {/* Header trang */}
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
        <div>
          <h1
            style={{
              fontSize: "1.375rem",
              fontWeight: 800,
              color: "#0f172a",
              margin: "0 0 4px",
            }}
          >
            📚 Vocabulary Vault
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0 }}>
            Sổ từ ngữ cảnh lâm sàng · 1-Chạm Quick-Capture · Spaced Repetition
          </p>
        </div>

        <Link
          href="/library"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "10px",
            background: "#4f46e5",
            color: "#ffffff",
            fontSize: "0.875rem",
            fontWeight: 600,
            textDecoration: "none",
            minHeight: "44px",
          }}
        >
          <span>📖</span> Vào bài đọc tra từ
        </Link>
      </div>

      {/* Tabs lọc: Tất cả / Đến hạn / Đã thuộc */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "8px",
        }}
      >
        <button
          onClick={() => handleFilterChange("all")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            background: activeFilter === "all" ? "#0f172a" : "#f1f5f9",
            color: activeFilter === "all" ? "#ffffff" : "#475569",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            minHeight: "44px",
          }}
        >
          Tất cả ({items.length})
        </button>

        <button
          onClick={() => handleFilterChange("due")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            background: activeFilter === "due" ? "#b91c1c" : "#fef2f2",
            color: activeFilter === "due" ? "#ffffff" : "#b91c1c",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            minHeight: "44px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>⏰</span> Đến hạn ({dueCount})
        </button>

        <button
          onClick={() => handleFilterChange("mastered")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            background: activeFilter === "mastered" ? "#15803d" : "#f0fdf4",
            color: activeFilter === "mastered" ? "#ffffff" : "#15803d",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            minHeight: "44px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>⭐</span> Đã thuộc
        </button>
      </div>

      {/* Trạng thái tải bộ lọc */}
      {isLoadingFilter && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b" }}>
          Đang lọc danh sách...
        </div>
      )}

      {/* Danh sách rỗng */}
      {!isLoadingFilter && filteredItems.length === 0 && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px dashed #cbd5e1",
            padding: "40px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📖</div>
          <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
            {activeFilter === "due"
              ? "Tuyệt vời! Không có từ nào đang đến hạn ôn tập."
              : activeFilter === "mastered"
              ? "Chưa có từ nào được đánh dấu là Đã thuộc."
              : "Sổ từ vựng đang trống."}
          </div>
          <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "0 0 16px" }}>
            Vào bài tập Đọc–dịch y khoa, bôi đen cụm từ bất kỳ để tra cứu chuyên ngành và lưu 1-chạm vào sổ!
          </p>
          <Link
            href="/library"
            style={{
              display: "inline-block",
              padding: "10px 18px",
              borderRadius: "8px",
              background: "#4f46e5",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "0.875rem",
              textDecoration: "none",
              minHeight: "44px",
            }}
          >
            Luyện đọc ngay (R1)
          </Link>
        </div>
      )}

      {/* Danh sách gom theo ngày */}
      {!isLoadingFilter &&
        Object.entries(groupedByDate).map(([dateStr, dateItems]) => (
          <div key={dateStr} style={{ marginBottom: "24px" }}>
            {/* Tiêu đề nhóm ngày */}
            <div
              style={{
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>📅</span> Ngày lưu: {dateStr}
              <span
                style={{
                  fontSize: "0.75rem",
                  background: "#e2e8f0",
                  color: "#475569",
                  padding: "1px 6px",
                  borderRadius: "10px",
                }}
              >
                {dateItems.length}
              </span>
            </div>

            {/* Các thẻ từ vựng trong ngày */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {dateItems.map((item) => {
                const isExpanded = expandedId === item.id;
                const isDue = new Date(item.dueAt) <= now && item.masteryLevel < 4;
                const isMastered = item.masteryLevel >= 4;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      border: isDue ? "2px solid #f87171" : "1px solid #e2e8f0",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Hàng tóm tắt từ vựng (Click để mở rộng/thu gọn) */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      style={{
                        padding: "14px 18px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "10px",
                        background: isExpanded ? "#f8fafc" : "#ffffff",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
                            {item.phrase}
                          </span>
                          {item.ipa && (
                            <span
                              style={{
                                color: "#6366f1",
                                fontSize: "0.8125rem",
                                fontFamily: "monospace",
                              }}
                            >
                              /{item.ipa.replace(/^\/|\/$/g, "")}/
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "0.875rem",
                            color: "#334155",
                            marginTop: "2px",
                            fontWeight: 500,
                          }}
                        >
                          {item.contextMeaning || "(Chưa có nghĩa ngữ cảnh)"}
                        </div>
                      </div>

                      {/* Trạng thái Spaced Repetition */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isMastered ? (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: "6px",
                              background: "#f0fdf4",
                              color: "#16a34a",
                              border: "1px solid #bbf7d0",
                            }}
                          >
                            ⭐ Đã thuộc
                          </span>
                        ) : isDue ? (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: "6px",
                              background: "#fef2f2",
                              color: "#dc2626",
                              border: "1px solid #fecaca",
                            }}
                          >
                            ⏰ Đến hạn ôn
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "#64748b",
                              background: "#f1f5f9",
                              padding: "3px 8px",
                              borderRadius: "6px",
                            }}
                          >
                            ⏳ Ngày mai ôn
                          </span>
                        )}

                        <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {/* Chi tiết mở rộng: Câu gốc, nguồn, ô Câu của tôi */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: "16px 18px",
                          borderTop: "1px solid #f1f5f9",
                          background: "#ffffff",
                        }}
                      >
                        {/* 1. Câu gốc */}
                        <div style={{ marginBottom: "14px" }}>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#475569",
                              textTransform: "uppercase",
                              marginBottom: "4px",
                            }}
                          >
                            📖 Câu gốc trong tài liệu y khoa:
                          </div>
                          <div
                            style={{
                              fontSize: "0.875rem",
                              lineHeight: 1.6,
                              color: "#1e293b",
                              background: "#f8fafc",
                              padding: "10px 14px",
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                              fontStyle: "italic",
                            }}
                          >
                            &ldquo;{item.originalSentence}&rdquo;
                          </div>
                        </div>

                        {/* 2. Nguồn tham khảo */}
                        {item.sourceRef && (
                          <div style={{ marginBottom: "14px" }}>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: "#475569",
                                background: "#eef2ff",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid #e0e7ff",
                              }}
                            >
                              📍 Nguồn: {item.sourceRef}
                            </span>
                          </div>
                        )}

                        {/* 3. Ô "Câu của tôi" (my_attempt) */}
                        <div style={{ marginBottom: "14px" }}>
                          <label
                            htmlFor={`attempt-${item.id}`}
                            style={{
                              display: "block",
                              fontSize: "0.8125rem",
                              fontWeight: 700,
                              color: "#1e293b",
                              marginBottom: "6px",
                            }}
                          >
                            ✍️ Câu của tôi (Luyện đặt câu chuyên ngành hoặc giao tiếp):
                          </label>
                          <textarea
                            id={`attempt-${item.id}`}
                            value={attemptInputs[item.id] ?? ""}
                            onChange={(e) =>
                              setAttemptInputs((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Tự đặt một câu tiếng Anh sử dụng cụm từ này trong bối cảnh công việc / phòng khám..."
                            rows={3}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              fontSize: "0.875rem",
                              lineHeight: 1.5,
                              color: "#0f172a",
                              outline: "none",
                              boxSizing: "border-box",
                              fontFamily: "inherit",
                            }}
                          />
                        </div>

                        {/* Thanh nút lưu & đánh dấu */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "8px",
                          }}
                        >
                          <button
                            onClick={() => handleSaveAttempt(item.id)}
                            disabled={savingMap[item.id]}
                            style={{
                              padding: "8px 16px",
                              borderRadius: "8px",
                              border: "none",
                              background: savedMap[item.id] ? "#16a34a" : "#4f46e5",
                              color: "#ffffff",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              cursor: savingMap[item.id] ? "not-allowed" : "pointer",
                              minHeight: "44px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            {savedMap[item.id]
                              ? "✓ Đã lưu câu của tôi!"
                              : savingMap[item.id]
                              ? "Đang lưu..."
                              : "💾 Lưu câu của tôi"}
                          </button>

                          <button
                            onClick={() => handleToggleMastered(item.id, item.masteryLevel)}
                            style={{
                              padding: "8px 14px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              color: isMastered ? "#dc2626" : "#16a34a",
                              fontSize: "0.8125rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              minHeight: "44px",
                            }}
                          >
                            {isMastered ? "Chuyển về cần ôn" : "⭐ Đánh dấu đã thuộc"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
