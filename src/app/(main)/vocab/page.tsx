export default function VocabPage() {
  return (
    <div style={{ padding: "1.5rem" }}>
      <h1
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "#0f172a",
          margin: "0 0 1rem",
        }}
      >
        ✏️ Sổ từ vựng
      </h1>
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "2rem 1.5rem",
          textAlign: "center",
          border: "1px solid #e2e8f0",
        }}
      >
        <p style={{ color: "#64748b", margin: 0 }}>
          Sổ từ vựng sẽ có ở Bước 4 — bôi đen cụm từ trong bài đọc → lưu 1
          chạm.
        </p>
      </div>
    </div>
  );
}
