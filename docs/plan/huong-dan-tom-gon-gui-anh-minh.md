# English Mini LMS — Hướng dẫn tóm gọn gửi anh Minh

Anh sẽ tự xây app học tiếng Anh cá nhân (học 30–45 phút/ngày trên điện thoại) bằng công cụ Antigravity — AI làm phần code, anh làm phần quyết định và kiểm tra. Chia 9 bước, **mỗi phiên chat chỉ làm đúng 1 bước**, làm theo nhịp của anh.

Mỗi bước trong file hướng dẫn đầy đủ đều có sẵn: việc anh làm tay → prompt dán sẵn vào Antigravity → tiêu chí "xong" để anh tự kiểm.

## 5 quy tắc vàng

1. Luôn để AI lập kế hoạch trước (Planning mode), anh đọc duyệt rồi mới cho sửa code.
2. Một phiên = một bước. Xong mở phiên mới, gõ `/build-step <số>`.
3. Không dán API key vào chat — key chỉ nằm trong file `.env.local`.
4. Tin nhưng kiểm: sau mỗi bước anh tự bấm thử trên điện thoại, không tin lời AI báo "pass".
5. Commit sau mỗi bước — hỏng thì quay lại commit trước.

## Lộ trình 9 bước

| Bước | Làm gì |
|---|---|
| 0 | Cài Node.js (Antigravity/GitHub/Vercel đã có); tạo tài khoản Google AI Studio + Supabase; accept lời mời collaborator + clone repo trong Antigravity |
| 1 | Khung app + đăng nhập email + database |
| 2 | Thư viện: anh soạn 3 bài đầu (1 đề email, 1 đoạn sách siêu âm ~150 từ, 1 đề giới thiệu bản thân) |
| 3 ⭐ | Viết bài → Gemini chấm có góp ý từng chỗ → viết bản sửa → so sánh 2 bản |
| 4 | Đọc–dịch sách y khoa + bôi đen lưu từ vựng 1 chạm |
| 5 | Ghi âm nói → AI chép lại + góp ý → nói lại; nghe video hội nghị + trả lời câu hỏi |
| 6 | Trang "Hôm nay" gợi ý bài, ôn từ theo lịch, trang Tiến độ |
| 7 | Đưa lên mạng (Vercel), cài như app trên điện thoại, backup |
| 8 | Dùng thử 4 tuần: tuần 1 làm bài baseline, tuần 4 làm lại để so tiến bộ |
| 9 | (Tuỳ chọn, về sau) IELTS có giờ + tích hợp Zalo |

## Bị vấn đề thì sao

- AI sửa lung tung → từ chối, yêu cầu chỉ làm đúng bước hiện tại; `git checkout .` nếu đã lỡ sửa.
- AI hỏi API key → trả lời "đã có trong .env.local".
- Lỗi lệnh → copy nguyên lỗi dán vào chat, yêu cầu sửa nguyên nhân gốc.
- Góp ý của Gemini chung chung → đây là lúc sửa *prompt chấm*, không phải code.
- Điện thoại không ghi âm → dùng Safari/Chrome, đừng dùng trình duyệt trong Zalo.
- Phiên chat dài AI "quên" → mở phiên mới, `/build-step N` sẽ đọc lại tài liệu.

## Xong bản Lite khi (tự tay làm được trên điện thoại)

Đăng nhập → Hôm nay gợi ý bài → viết/dịch/nói → nhận góp ý đúng chỗ sai → làm bản sửa → sổ từ vựng nhắc ôn → Tiến độ tách bài "tự làm" và "có hỗ trợ" → backup chạy được → người khác không đọc được bài của anh.

---

Chi tiết từng bước (prompt đầy đủ, tiêu chí kiểm tra cụ thể) nằm trong file `docs/plan/huong-dan-xay-dung-voi-antigravity.md` của repo.
