"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "white",
          borderRadius: "16px",
          padding: "2rem",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* Logo / Title */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #2563eb, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              fontSize: "1.5rem",
            }}
          >
            📚
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#0f172a",
              margin: "0 0 0.25rem",
            }}
          >
            English Mini LMS
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#64748b",
              margin: 0,
            }}
          >
            Học tiếng Anh 30–45 phút mỗi ngày
          </p>
        </div>

        {sent ? (
          /* Success state */
          <div
            style={{
              textAlign: "center",
              padding: "1.5rem",
              background: "#f0fdf4",
              borderRadius: "12px",
              border: "1px solid #bbf7d0",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✉️</div>
            <p
              style={{
                fontWeight: 600,
                color: "#166534",
                margin: "0 0 0.5rem",
              }}
            >
              Đã gửi link đăng nhập!
            </p>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#15803d",
                margin: 0,
              }}
            >
              Kiểm tra email <strong>{email}</strong> và bấm vào link để đăng
              nhập.
            </p>
          </div>
        ) : (
          /* Login form */
          <form onSubmit={handleLogin}>
            <label
              htmlFor="email-input"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Email
            </label>
            <input
              id="email-input"
              type="email"
              placeholder="anh.minh@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                fontSize: "1rem",
                border: "1.5px solid #e2e8f0",
                borderRadius: "10px",
                outline: "none",
                marginBottom: "1rem",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "#2563eb")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "#e2e8f0")
              }
            />

            {error && (
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#dc2626",
                  margin: "0 0 1rem",
                  padding: "0.5rem 0.75rem",
                  background: "#fef2f2",
                  borderRadius: "8px",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: "100%",
                padding: "0.75rem",
                fontSize: "1rem",
                fontWeight: 600,
                color: "white",
                background:
                  loading || !email
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                backgroundColor:
                  loading || !email ? "#94a3b8" : "#2563eb",
                border: "none",
                borderRadius: "10px",
                cursor: loading || !email ? "not-allowed" : "pointer",
                minHeight: "44px",
                transition: "opacity 0.2s",
              }}
            >
              {loading ? "Đang gửi..." : "Gửi link đăng nhập"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
