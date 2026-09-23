import { createClient } from "@/lib/supabase/server";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Greeting card */}
      <div
        style={{
          background: "linear-gradient(135deg, #2563eb, #06b6d4)",
          borderRadius: "16px",
          padding: "1.5rem",
          color: "white",
          marginBottom: "1.5rem",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            margin: "0 0 0.25rem",
          }}
        >
          Xin chào! 👋
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            opacity: 0.9,
            margin: 0,
          }}
        >
          {user?.email}
        </p>
      </div>

      {/* Placeholder content */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "1.5rem",
          textAlign: "center",
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎯</div>
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "#0f172a",
            margin: "0 0 0.5rem",
          }}
        >
          Sẵn sàng học!
        </h2>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#64748b",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Thư viện bài học sẽ có ở Bước 2. Chọn 30 hoặc 45 phút và bắt đầu
          luyện tập hàng ngày.
        </p>
      </div>
    </div>
  );
}
