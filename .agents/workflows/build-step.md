---
description: Thực hiện một bước trong hướng dẫn xây English Mini LMS (ví dụ /build-step 3)
---

# /build-step <số bước>

Thực hiện đúng một bước trong `docs/plan/huong-dan-xay-dung-voi-antigravity.md`.

1. Đọc `AGENTS.md`, `.agents/rules/english-mini-lms.md`, `docs/plan/lite-mvp-track.md`.
2. Mở `docs/plan/huong-dan-xay-dung-voi-antigravity.md`, tìm mục "Bước <số bước>". Trích lại cho người dùng: mục tiêu, tiêu chí xong.
3. Kiểm tra trạng thái hiện tại của repo (git status, các file liên quan) để biết bước trước đã xong chưa. Nếu chưa, dừng và báo.
4. Vào Planning mode. Viết Implementation Plan gồm: file sẽ tạo/sửa, schema/migration nếu có, API, UI, test, cách kiểm tra tay trên điện thoại. Chờ người dùng duyệt.
5. Implement theo plan. Commit nhỏ theo từng phần logic.
6. Gọi `/verify`.
7. Nếu bước có UI: dùng Browser subagent mở `http://localhost:3000`, thực hiện luồng chính của bước, lưu screenshot/recording làm artifact.
8. Viết Walkthrough: đã làm gì, lệnh để chạy, cách test tay, điểm chưa xong, đề xuất bước tiếp theo. Đối chiếu từng tiêu chí "xong" của bước → đánh ✅/❌.
