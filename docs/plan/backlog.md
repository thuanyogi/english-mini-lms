# Backlog — ý tưởng làm sau khi Lite ổn

Luật: ý tưởng nảy ra giữa chừng ghi vào đây, **không** làm trong bước hiện tại. Mỗi mục ghi: ý tưởng → vì sao → cách làm → làm khi nào.

## v1.1

### Nhúng YouGlish vào Sổ từ vựng (đã chốt: làm embed trong app)

- **Ý tưởng:** trong trang chi tiết từ (`/vocab` → mở 1 từ), thêm khung **"Nghe trong video thật"** nhúng YouGlish — người học nghe người bản xứ phát âm đúng cụm `phrase` trong clip YouTube thật mà không rời app.
- **Vì sao:** Vocabulary Vault hiện chỉ có IPA + câu ví dụ do Gemini tạo; thiếu phát âm ngữ cảnh thật — đúng mục tiêu nghe–nói hội nghị.
- **Cách làm:**
  - Dùng **YouGlish widget** (script nhúng + panel player) trong component trang chi tiết từ, truyền `phrase` đã lưu trong `vocabulary_vault`.
  - Không đổi schema, không API backend mới — widget tự gọi YouGlish từ client.
  - Nếu CSP được bật: whitelist domain `youglish.com` trong `next.config`.
  - Lúc build, đọc lại docs widget YouGlish (youglish.com — mục widget API) để lấy cách nhúng và điều khoản hiện hành.
- **Fallback:** cụm không có clip (thuật ngữ y khoa hiếm) → hiện text "Không có clip cho cụm này" + link mở `youglish.com/pronounce/<phrase>/english` trong tab mới.
- **Không làm:** không nhét vào popup bôi đen quick-capture (popup phải giữ nhẹ "lưu 1 chạm").
- **Test:** vitest cho util sinh query/url; kiểm tay trên điện thoại: mở 1 từ phổ thông → clip chạy được; mở 1 thuật ngữ hiếm → fallback hiện đúng.
- **Làm khi:** sau khi Bước 6 xong (trang Sổ từ đã tồn tại) — là 1 mini build-step độc lập; có thể làm ngay sau pilot hoặc sớm hơn nếu anh Minh muốn.
