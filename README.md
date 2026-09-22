# English Mini LMS — cho BS. Minh

Ứng dụng web cá nhân học tiếng Anh 30–45 phút/ngày: giao tiếp đời sống/công việc/hội nghị, nghe–nói–đọc–viết, đọc–dịch sách y khoa, hướng tới IELTS 7.5–8.0. Một người học. Tự xây bằng Antigravity.

Dự án tách khỏi repo `dr-minh-clinic` ngày 22/09/2026; **không dùng, không kết nối** dữ liệu phòng khám/bệnh nhân.

## Bắt đầu từ đâu

1. Đọc [docs/plan/huong-dan-xay-dung-voi-antigravity.md](docs/plan/huong-dan-xay-dung-voi-antigravity.md) — hướng dẫn từng bước (Bước 0 → 9).
2. Phạm vi bản đầu: [docs/plan/lite-mvp-track.md](docs/plan/lite-mvp-track.md).
3. Mở thư mục này trong Antigravity; gõ `/build-step 1`.

## Cấu trúc

```text
AGENTS.md                 # ngữ cảnh dự án cho agent
.agents/rules/            # luật bắt buộc (append-only submissions, assisted, not_assessable…)
.agents/workflows/        # /build-step, /verify
docs/plan/                # plan đầy đủ (Lite track + v2: phase-01..08, contract, kiến trúc)
docs/journals/            # nhật ký làm việc
content/english-lab/      # nguồn học duy nhất (manifest.yaml + texts/ transcripts/ rubrics/)
src/                      # (tạo ở Bước 1) Next.js app
```

## Stack (Lite)

Next.js App Router · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres/Auth/Storage) · Drizzle · Gemini API · Vercel.

## Bảo mật

Secret chỉ trong `.env.local` (không commit). Xem `.env.example`.
