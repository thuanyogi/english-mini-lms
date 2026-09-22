# Luật bắt buộc — English Mini LMS

Áp dụng cho mọi lượt chat trong workspace này.

## Ngôn ngữ và cách trả lời

- Trả lời người dùng bằng tiếng Việt, ngắn, có bước kiểm tra tay. Code, tên biến, commit message bằng tiếng Anh.
- Người dùng là bác sĩ, không phải lập trình viên: khi cần người dùng chạy lệnh, ghi rõ lệnh đầy đủ và kết quả mong đợi.
- Không hỏi lại điều có thể đọc trong `docs/plan/`. Nếu tài liệu mâu thuẫn, ưu tiên `lite-mvp-track.md`.

## Dữ liệu học tập (không thương lượng)

1. `submissions` là append-only. Sửa bài = INSERT bản mới với `parent_id`; không UPDATE nội dung bài đã nộp.
2. `assisted` được server tính từ `session_events` (hint/reveal trước nộp). Client không được gửi trường này.
3. Speaking không có audio thật → feedback phải ghi `pronunciation: not_assessable`. Không chấm phát âm từ transcript.
4. Schema feedback không có trường "official IELTS band". Điểm chỉ ở `scores[].kind = practice_estimate`.
5. Mỗi observation trong feedback có: `location`, `original`, `issue`, `suggestion`, `example`, `retry_prompt`. Luôn có `limitations`.
6. Nguồn học chỉ từ `content/english-lab/manifest.yaml` với `review_state: approved`. Không sinh nội dung gắn nhãn "đề thi chính thức".
7. Bài đọc y khoa: AI chỉ nhận xét ngôn ngữ và độ trung thành với đoạn gốc; không đưa khuyến nghị điều trị; không đưa ca bệnh thật vào bài.
8. Không có bất kỳ kết nối, import, hay tham chiếu tới dữ liệu phòng khám, bệnh nhân, `docs/index/` của repo khác.

## Bảo mật

- Secret chỉ trong `.env.local` (đã gitignore). Không bao giờ in giá trị secret ra chat, log, hay commit. Dùng `.env.example` với giá trị giả.
- Mọi route `/api/v1/*` kiểm tra session Supabase và `learner_id` từ session, không nhận `learner_id` từ body.
- Supabase RLS bật cho mọi bảng có `learner_id`; policy `auth.uid() = user_id`.
- Upload: kiểm MIME + kích thước server-side (audio ≤ 5 phút/20 MB; ảnh ≤ 10 MB; text ≤ 20.000 ký tự). Storage bucket private, truy cập qua signed URL ngắn hạn.
- Gemini nhận đoạn liên quan + schema JSON đầu ra; không đưa secret hay toàn bộ lịch sử vào prompt.

## Cách code

- TypeScript strict; không `any` trừ khi có comment lý do.
- Business rule nằm trong `src/server/*`; route handler chỉ parse → gọi service → map lỗi (401/403/409/413/422/429/503).
- Migration additive (thêm bảng/cột, không drop/rename cột đã có dữ liệu).
- Mỗi service mới có ít nhất 1 test vitest cho invariant của nó (ví dụ: append-only, assisted, not_assessable).
- File > 200 dòng → tách module. Tên file kebab-case, mô tả rõ.
- Mobile-first: touch target ≥ 44px, chữ ≥ 16px, trạng thái lưu/đang chấm/lỗi hiển thị rõ.

## Quy trình mỗi bước

1. Đọc bước tương ứng trong `docs/plan/huong-dan-xay-dung-voi-antigravity.md`.
2. Planning mode → Implementation Plan → chờ duyệt.
3. Implement theo plan; commit nhỏ, message dạng `feat(step-3): writing submit + gemini feedback`.
4. Chạy `/verify`. Nếu có UI: dùng Browser subagent mở `http://localhost:3000` và chụp màn hình luồng chính.
5. Walkthrough: đã làm, cách test tay, chưa xong, bước tiếp theo.
