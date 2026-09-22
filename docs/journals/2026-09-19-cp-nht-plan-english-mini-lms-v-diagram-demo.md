---
title: Cập nhật plan English Mini LMS và diagram demo
date: 2026-09-19
summary: "Hoàn thiện plan mini LMS cá nhân cho BS. Minh, bổ sung nguồn học bên ngoài, Vocabulary Vault, shadowing và sơ đồ demo; chưa triển khai runtime."
---

# Cập nhật plan English Mini LMS và diagram demo

## What happened

- Hoàn thiện bộ plan tại `plans/260919-1141-english-mini-lms/` cho mini LMS cá nhân của BS. Minh.
- Giữ quyết định D1: Zalo/OpenClaw là kênh trò chuyện với trợ lý; web là nơi học tài liệu, làm/nộp/sửa bài và xem tiến độ.
- Làm rõ mini LMS không tự xây lại kho giáo trình/video. Bản đầu dùng nguồn học bên ngoài được tuyển chọn, link hoặc iframe khi phù hợp; LMS giữ nhiệm vụ, bài làm, phản hồi, bản sửa và bằng chứng tiến bộ.
- Bổ sung Vocabulary Vault theo ngữ cảnh, Smart Capture trên web, ôn micro-challenge qua Zalo và ba nhóm tool dự kiến cho OpenClaw.
- Bổ sung thiết kế shadowing với nguồn đã duyệt, transcript kiểm chứng và mốc thời gian; không giả định YouTube cho phép tải caption của mọi video.
- Tạo diagram demo có thể chỉnh sửa và bản xuất hình tại `plans/260919-1141-english-mini-lms/demo/`, phân biệt phần Zalo/OpenClaw đã có với phần web đề xuất xây.

## Decision

- Chỉ commit bộ tài liệu thuộc plan mini LMS và journal này; không stage các thay đổi clinic, bot Telegram, index, skill hoặc file chưa liên quan khác trong worktree.
- Chưa triển khai code, chưa sửa runtime OpenClaw, chưa gửi tin Zalo, chưa deploy và chưa push remote.
- Giữ các lựa chọn D2–D10 là đề xuất cần duyệt; D1 là quyết định đã xác nhận về vai trò Zalo và web.

## Next steps

- Gửi `ban-gui-anh-minh.md` cùng diagram demo để anh Minh duyệt hướng sản phẩm.
- Khi được duyệt, thực hiện Phase 1: xác minh trình độ/mục tiêu, nguồn học có quyền sử dụng, khả năng media và tool contract của OpenClaw.
- Chỉ sau khi Phase 1 đạt cổng mới bắt đầu dựng app, database, storage và tích hợp.

## Câu hỏi tồn đọng

- Anh Minh đã duyệt toàn bộ plan hay mới duyệt vai trò Zalo/web?
- Nguồn sách, audio, video và đề IELTS nào được phép dùng trong pilot?
- Trình độ đầu vào, loại IELTS, deadline thi/hội nghị và chính sách lưu voice/bài làm là gì?

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
