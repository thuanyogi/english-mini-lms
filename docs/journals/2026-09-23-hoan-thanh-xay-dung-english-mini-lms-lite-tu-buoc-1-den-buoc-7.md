---
title: Hoàn thành xây dựng English Mini LMS Lite từ Bước 1 đến Bước 7
date: 2026-09-23
summary: "Hoàn thành toàn bộ 7 bước xây dựng bản Lite cho English Mini LMS bằng Antigravity: từ scaffold, seed, 4 mode học tập (Writing, Reading, Speaking, Shadowing), Vocabulary Vault, Today & Progress, đến PWA, backup runbook, settings và admin dashboard. Đã test sạch 58/58 tests và push lên GitHub."
---

# Hoàn thành xây dựng English Mini LMS Lite từ Bước 1 đến Bước 7

## What happened

Trong ngày làm việc hôm nay, toàn bộ hệ thống **English Mini LMS** (phiên bản Lite MVP) dành cho BS. Minh đã được xây dựng, kiểm thử và bàn giao hoàn chỉnh qua 7 bước:

1. **Bước 1 — Nền tảng & Xác thực (Commit `951df6a`)**:
   - Khởi tạo khung ứng dụng Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui.
   - Thiết kế schema Drizzle ORM gồm 15 bảng nền theo đúng data contract Lite.
   - Tích hợp Supabase Auth (magic link qua email), cơ chế dev-bypass cho môi trường phát triển local.
   - Dựng layout mobile-first với thanh điều hướng 5 tab: *Hôm nay · Thư viện · Học · Sổ từ · Tiến độ*.

2. **Bước 2 — Thư viện học tập & Nạp học liệu (Commit `09bd94a`)**:
   - Xây dựng `scripts/seed.ts` đọc file nguồn `content/english-lab/manifest.yaml`.
   - Cơ chế upsert an toàn theo ID, chỉ nạp các activity có `review_state = approved`.
   - Trang `/library` phân nhóm theo kỹ năng, lọc linh hoạt, ẩn toàn bộ đáp án nhạy cảm.
   - Trang `/library/[id]` hiển thị chi tiết bài học và nút chọn thời lượng 30 / 45 phút.

3. **Bước 3 — Writing Mode & Vòng lặp phản hồi AI (Commit `6c1624d`)**:
   - Tạo phiên học `learning_sessions`, đồng hồ đếm ngược 30/45 phút, nút "Xin gợi ý", "Lưu nháp" tự động.
   - Quy tắc bất biến bài nộp append-only: mỗi lần sửa tạo revision mới, không ghi đè bài cũ.
   - Tích hợp Gemini 2.5 Flash đánh giá bài viết theo rubric y khoa / IELTS, trả về JSON cấu trúc chuẩn: observations cụ thể, điểm mạnh, hành động tiếp theo.
   - Giao diện so sánh song song giữa bài viết ban đầu và bài sửa.

4. **Bước 4 — Reading Y khoa & Vocabulary Vault 1-chạm (Commit `b56f406`)**:
   - Giao diện đọc chuyên ngành song song: đoạn gốc y khoa kèm 3 ô soạn thảo (Ý chính, Bản dịch, 3 thuật ngữ tự giải thích).
   - Gemini nhận xét bản dịch tiếng Việt, nghiêm ngặt từ chối can thiệp chuyên môn điều trị y khoa.
   - Tính năng **Quick-Capture 1-chạm**: bôi đen từ/cụm từ trong bài đọc -> popup AI phân tích ngữ cảnh, phiên âm IPA, nghĩa chuyên ngành cơ xương khớp -> lưu thẳng vào Sổ từ vựng (`vocabulary_vault`).
   - Trang `/vocab` quản lý danh sách từ, lọc theo mức độ thành thạo và từ đến hạn ôn.

5. **Bước 5 — Speaking S1 & Listening/Shadowing L1 (Commit `9a04e6a`)**:
   - Trình ghi âm MediaRecorder trên web với giới hạn 5 phút, nghe lại, xoá bản thu trước khi nộp.
   - Quy trình upload 2 bước lên Supabase Storage bucket private `learner-media`.
   - Gemini thẩm định âm thanh đa phương thức trực tiếp: trả transcript, độ tự tin, phát âm, nhận xét trọng tâm.
   - Cho phép người học xác nhận hoặc chỉnh sửa transcript trước khi lưu làm bằng chứng học tập.
   - Chế độ Shadowing: khoá transcript khi nghe bài mẫu, ghi nhận `assisted = true` nếu bấm hiển thị transcript trước khi thu âm.

6. **Bước 6 — Điều hướng Hôm nay, Ôn từ ngắt quãng & Phân tích Tiến độ (Commit `ff595ff`, `c078802`)**:
   - Trang `/today`: Thuật toán gợi ý bài học giải thích được dựa trên 4 tiêu chí (bài dở, từ đến hạn, kỹ năng ít luyện 7 ngày qua, khớp thời lượng 30/45p).
   - Trang `/vocab/review`: Ôn tập tối đa 5 từ đến hạn bằng micro-challenge đặt câu (hỗ trợ text hoặc giọng nói), thuật toán Spaced Repetition dãn cách `1 → 3 → 7 → 14 → 30 ngày`.
   - Trang `/progress`: Báo cáo 4 chỉ số thực tế, tỷ lệ bài độc lập vs có hỗ trợ, biểu đồ phân bổ kỹ năng, phân tích lỗi lặp, không vẽ band điểm IELTS ước tính khi chưa đủ cơ sở.
   - Trang `/onboarding`: Thiết lập hồ sơ học tập và bối cảnh chuyên môn ban đầu.
   - Modal tự động pause và đề nghị lưu nháp/khép phiên khi hết 30/45 phút (không bao giờ xoá nháp).

7. **Bước 7 — Vercel Deploy, PWA, Backup, Settings & Admin (Commit `c15ecdb`)**:
   - Cấu hình `maxDuration = 60` cho toàn bộ các route AI để chống timeout trên Vercel Serverless.
   - PWA tối thiểu: `manifest.json`, icon 192/512, Service Worker chỉ cache app shell, tuyệt đối không cache audio hay dữ liệu cá nhân.
   - Bộ công cụ sao lưu `scripts/backup.ps1` & `scripts/backup.sh` kèm tài liệu vận hành `docs/RUNBOOK.md`.
   - Trang `/settings`: Xuất dữ liệu JSON kèm signed links tải file âm thanh, xoá bài (soft delete + xoá file máy chủ), bật/tắt nhắc học, đăng xuất.
   - Trang `/admin`: Quản trị bài học, theo dõi tổng token & chi phí Gemini tháng này, danh sách bài chấm lỗi kèm nút chấm lại.

## Decision

- **Bảo toàn toàn bộ 8 invariants ban đầu**: Dữ liệu nộp append-only, tính `assisted` từ sự kiện, kiểm duyệt `review_state` học liệu, tách biệt private media, an toàn PWA không cache audio người học.
- **Tối ưu hóa thời gian chạy**: Xuất tường minh `maxDuration = 60` cho API route gọi Gemini để sẵn sàng đưa lên Vercel.
- **Bảo mật biến môi trường**: Không bao giờ hardcode hoặc in lộ giá trị API keys; toàn bộ hướng dẫn đều mô tả bằng lời và tham chiếu tên biến.
- **Git workflow sạch**: Toàn bộ thay đổi đã được gom thành 8 commits có ý nghĩa rõ ràng và push thành công lên GitHub `origin/master`.

## Verification Results

- **TypeScript check**: `npm run typecheck` đạt 0 lỗi.
- **Lint**: `npm run lint` đạt 0 lỗi, 0 cảnh báo.
- **Vitest Unit/Integration Tests**: **58/58 tests PASS** trên cả 8 test suites.
- **Next.js Production Build**: `npm run build` Turbopack thành công 100% cho toàn bộ 34 routes.

## Next steps

1. BS. Minh liên kết repository GitHub này với tài khoản [Vercel](https://vercel.com/) và nhập 5 biến môi trường theo hướng dẫn trong `docs/RUNBOOK.md` và `walkthrough.md`.
2. Kiểm tra tính năng PWA trên điện thoại (mở Safari/Chrome trên smartphone -> bấm "Add to Home Screen").
3. Bắt đầu phiên học 30 phút đầu tiên trên trang `/today`!

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
