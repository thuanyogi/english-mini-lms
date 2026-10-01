---
title: Hoàn thành Vá lỗi 6 và Tái cấu trúc Modular cho English Mini LMS
date: 2026-10-01
summary: "Hoàn thành toàn bộ 6 mục của Vá lỗi 6 theo hướng dẫn sửa lỗi và triển khai: cải tiến /my-work với trạng thái đang chấm & so sánh 2 bản, tính năng gắn cờ nhận xét AI 'Tôi không đồng ý' kèm trang quản trị /admin rà soát, giao diện an toàn cho /today, lưu category lỗi thật từ Gemini, chặn trùng lặp phiên học (409 Conflict), và tái cấu trúc 4 file mã nguồn lớn >200 dòng thành các sub-components & services chuyên biệt. Đạt 100% kiểm thử: 58/58 tests pass, 0 lint/typecheck error, Next.js build thành công."
---

# Hoàn thành Vá lỗi 6 và Tái cấu trúc Modular cho English Mini LMS

## What happened

Trong phiên làm việc hôm nay, bước **Vá lỗi 6 — Đẹp và tiện hơn** theo tài liệu `docs/plan/huong-dan-sua-loi-va-trien-khai.md` đã được triển khai, kiểm thử và tích hợp hoàn chỉnh:

1. **Cải tiến trang `/my-work` (Mục 1)**:
   - Thêm trạng thái `⏳ Đang chờ chấm... (khoảng 10–30s)` hiển thị khi assessment ở trạng thái `queued` hoặc `processing`, tự động polling lấy kết quả đánh giá mới nhất mà không bắt người học phải tải lại trang.
   - Nâng cấp tab **So sánh (Bản sửa vs Bản 1)**: Không chỉ hiển thị văn bản song song mà còn render đầy đủ danh sách nhận xét (`observations`) chi tiết của Bản 1 để người học đối chiếu rõ các lỗi đã khắc phục.
   - Sửa phương thức PATCH bài nộp tại `/api/v1/submissions/[id]`: chỉ cho phép cập nhật `confirmed_transcript` đối với bài nói (modality audio), bảo toàn nguyên tắc bài nộp gốc là bất biến (append-only).

2. **Cơ chế gắn cờ phản ánh AI "Tôi không đồng ý" & Màn hình Quản trị `/admin` (Mục 2)**:
   - Thêm nút `🚩 Tôi không đồng ý` trên từng nhận xét của AI tại trang kết quả bài làm.
   - Xây dựng API `POST /api/v1/feedback/[id]/flag`: cho phép người học nêu lý do phản ánh và chuyển `review_state = "under_review"`.
   - Nâng cấp trang `/admin`: Bổ sung card thống kê nhận xét bị gắn cờ, danh sách trích đoạn câu hỏi/nhận xét cần rà soát, và API `POST /api/v1/feedback/[id]/resolve` để quản trị viên kiểm tra và gỡ cờ (`review_state = "active"`).

3. **Xử lý an toàn cho `/today` & Banner khảo sát đầu vào (Mục 3)**:
   - Cập nhật `src/server/today/service.ts`: Xử lý an toàn tuyệt đối khi thư viện chưa có bài học nào được duyệt (`approved`), ngăn chặn lỗi crash máy chủ.
   - Cập nhật `today-view.tsx`: Hiển thị banner xanh mời người học vào `/onboarding` khi chưa hoàn thành khảo sát đầu vào (`baselineStatus !== "completed"`), cùng màn hình empty-state hướng dẫn quản trị viên duyệt bài.

4. **Lưu trữ category lỗi thật từ Gemini & Chống trùng lặp khi chấm lại (Mục 4)**:
   - Cập nhật Zod schema và prompt Gemini: Trích xuất chính xác phân loại lỗi (`grammar`, `vocabulary`, `structure`, `pronunciation`, `tone`, `fluency`) thay vì gán nhầm theo `activity.mode`.
   - Lưu trữ đúng category vào bảng `error_observations`.
   - Tối ưu `retryAssessment`: Tự động dọn sạch các `error_observations` cũ của lượt nộp trước khi insert bản chấm mới, tránh nhân đôi số lượng lỗi trong báo cáo tiến độ.

5. **Chặn tạo 2 phiên active trùng cùng một activity (Mục 5)**:
   - Khi tạo phiên học qua `POST /api/v1/sessions`, nếu người học đang có một phiên chưa hoàn thành (`active`, `ready`, `paused`) của cùng bài học đó, server trả về mã `409 Conflict` kèm `sessionId` hiện tại.
   - Giao diện người dùng (`/today` và `/my-work`) bắt mã 409 và đưa ra thông báo: *"Bạn đang có một phiên học chưa hoàn thành cho bài này. Bạn có muốn tiếp tục phiên đang dở không?"* để chuyển thẳng người học vào phiên dở dang.

6. **Tái cấu trúc 4 file mã nguồn lớn >200 dòng (Mục 6)**:
   - `my-work-view.tsx` (~1000 dòng) -> Tách thành thư mục `components/`: `my-work-header.tsx`, `my-work-assessment-status.tsx`, `my-work-compare.tsx`, `my-work-submission-body.tsx`, `my-work-feedback.tsx` (view chính còn ~200 dòng).
   - `learning/service.ts` (~1050 dòng) -> Tách thành `session.service.ts`, `assessment.service.ts` và facade `service.ts`.
   - `gemini.ts` (~740 dòng) -> Tách thành package `src/server/providers/gemini/` với các module chuyên biệt: `client.ts`, `writing.ts`, `reading.ts`, `speaking.ts`, `vocabulary.ts`, `types.ts`.
   - `listening-session-view.tsx` (~1100 dòng) -> Tách thành các component: `listening-questions.tsx`, `listening-transcript.tsx`, `listening-review.tsx`, `listening-shadowing.tsx` (view chính còn ~380 dòng).

7. **Sửa lỗi Database Migration**:
   - Khắc phục lỗi va chạm cột trong migration file `0001_tired_venus.sql` bằng mệnh đề an toàn `ADD COLUMN IF NOT EXISTS`, hoàn tất đồng bộ schema Postgres trên Supabase.

## Verification Results

- **TypeScript Typecheck**: `npm run typecheck` đạt 0 lỗi.
- **ESLint**: `npm run lint` đạt 0 lỗi, 0 cảnh báo.
- **Vitest Test Suite**: **58/58 tests PASS** trên cả 8 test files:
  - `tests/seed/manifest-parser.test.ts` (5 tests)
  - `tests/db/schema.test.ts` (5 tests)
  - `tests/library/service.test.ts` (7 tests)
  - `tests/step7/step7-settings-admin.test.ts` (10 tests)
  - `tests/reading/reading-and-vocab.test.ts` (8 tests)
  - `tests/today-and-progress/today-progress.test.ts` (11 tests)
  - `tests/writing/flow.test.ts` (6 tests)
  - `tests/speaking-listening/speaking-listening.test.ts` (6 tests)
- **Next.js Production Build**: `npm run build` Turbopack thành công 100% cho toàn bộ 18/18 routes.

## Next Steps

Toàn bộ **PHẦN 1 — SỬA LỖI (Vá 1 đến Vá 6)** đã hoàn tất trọn vẹn và ổn định. Bước tiếp theo là thực hiện **PHẦN 2 — ĐƯA APP VÀO CHẠY THẬT**:
1. **Bước 1**: Rà soát cấu hình Supabase (Authentication tắt public sign up sau khi đăng ký, kích hoạt RLS, kiểm tra bucket `learner-media`).
2. **Bước 2**: Bổ sung thêm học liệu vào thư viện (W2, R2, S2...).
3. **Bước 3**: Triển khai dự án lên Vercel và kiểm tra PWA trên thiết bị di động thật.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
