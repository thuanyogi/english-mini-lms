---
description: Kiểm tra chất lượng sau mỗi bước (lint, typecheck, test, build, secret scan)
---

# /verify

1. Chạy lần lượt và dừng ở lệnh đầu tiên lỗi: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
2. Nếu lỗi: sửa nguyên nhân gốc, chạy lại. Không tắt rule lint/type để cho qua.
3. Quét secret: `git diff --cached` và `git grep -n -E "(sk-|AIza|SUPABASE_SERVICE_ROLE|eyJhbGci)" -- ':!*.example'`. Có kết quả → xoá khỏi code, đưa vào `.env.local`, báo người dùng đổi key.
4. Kiểm tra `.env.local` và `.env` nằm trong `.gitignore`.
5. Kiểm tra các invariant bằng test hiện có: append-only submissions, assisted server-side, not_assessable khi thiếu audio, không có trường official band.
6. Nếu app đang chạy (`npm run dev`): mở Browser subagent tại `http://localhost:3000`, đăng nhập bằng tài khoản test, đi qua luồng Hôm nay → Học → Nộp → Feedback; chụp màn hình.
7. Báo kết quả dạng bảng: lệnh · pass/fail · ghi chú. Kết luận rõ: "Sẵn sàng sang bước tiếp" hoặc "Còn lỗi: …".
