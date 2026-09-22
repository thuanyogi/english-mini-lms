# English Mini LMS — ngữ cảnh dự án cho agent

Ứng dụng web cá nhân giúp BS. Minh học tiếng Anh 30–45 phút/ngày: giao tiếp đời sống/công việc/hội nghị, nghe–nói–đọc–viết, đọc–dịch sách y khoa, hướng tới IELTS 7.5–8.0. Một người học, một quản trị (cùng người).

## Tài liệu phải đọc trước khi làm bất kỳ bước nào

1. `docs/plan/lite-mvp-track.md` — phạm vi bản Lite, stack, invariant.
2. `docs/plan/huong-dan-xay-dung-voi-antigravity.md` — bước hiện tại và tiêu chí "xong".
3. `docs/plan/product-design.md` — 5 mode, 7 màn hình, Vocabulary Vault.
4. `docs/plan/data-and-tools-contract.md` — tên bảng/API (Lite dùng tập con). Các file `phase-0*.md`, `technical-architecture.md`, `operations-and-acceptance.md` là đích v2 — chỉ tham khảo, không làm theo ở Lite nếu chưa được yêu cầu.

## Stack (đã chốt cho Lite — không đổi nếu không được yêu cầu)

Next.js App Router + TypeScript · Tailwind + shadcn/ui · Supabase (Postgres, Auth, Storage) · Drizzle ORM · Gemini API · Vercel.

## Cấu trúc thư mục

```text
src/app/              # routes + /api/v1
src/server/           # domain services (learning, library, assessment, vocabulary, media)
src/server/providers/ # gemini.ts — mọi gọi AI đi qua đây
src/db/               # schema.ts, migrations/
content/english-lab/  # manifest.yaml + texts/ transcripts/ rubrics/ (nguồn học duy nhất)
scripts/seed.ts       # đọc manifest → DB, chỉ review_state=approved
tests/                # vitest
```

## Lệnh

`npm run dev` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run db:migrate` · `npm run seed`

## Nguyên tắc làm việc

- Mỗi phiên chat làm đúng 1 bước trong hướng dẫn. Bắt đầu bằng Planning mode; chờ người dùng duyệt Implementation Plan trước khi sửa file.
- Kết thúc bước: chạy `/verify`, viết Walkthrough ngắn (đã làm gì, cách test tay trên điện thoại, còn gì chưa xong).
- Không thêm dependency ngoài stack trên nếu chưa giải thích lý do và được đồng ý.
- Xem `.agents/rules/english-mini-lms.md` cho các luật bắt buộc về dữ liệu học tập.
