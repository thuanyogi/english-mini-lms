---
title: Tích hợp Video Bài giảng Y khoa Thực tế NYSORA cho Toàn bộ Bài Nghe
date: 2026-10-03
summary: "Khắc phục triệt để tình trạng video YouTube bị trỏ về URL demo mặc định (M7lc1UVf-VE) bằng việc tích hợp 4 video bài giảng lâm sàng thực tế chuẩn y khoa từ kênh NYSORA (GS. Admir Hadzic) cho các bài nghe L1, L2, L3, L4. Cập nhật manifest.yaml, đồng bộ database qua seed, dọn dẹp các fallback hardcode trong session service và trình phát YouTube, đồng thời hoàn tất kiểm thử và push lên GitHub."
---

# Tích hợp Video Bài giảng Y khoa Thực tế NYSORA cho Toàn bộ Bài Nghe

## What happened

Trong phiên làm việc bổ sung tối 03/10/2026, bác sĩ Minh phát hiện khi mở các bài học phần Nghe (Listening), trình phát video YouTube vẫn đang tải video mẫu mặc định (`M7lc1UVf-VE` - Rick Astley / placeholder) thay vì video bài giảng y khoa thực tế theo nội dung bài học.

### 1. Phân tích nguyên nhân gốc rễ

- **Cấu hình Manifest**: Trong `content/english-lab/manifest.yaml`, nguồn `src-conference-talk-01` trước đây kế thừa link placeholder `https://www.youtube.com/watch?v=M7lc1UVf-VE` từ file mẫu ban đầu (`manifest.example.yaml`).
- **Thiếu URL nguồn**: Các nguồn nghe mới (`src-clinical-audio-series`, `src-conference-talk-02`) chưa được khai báo thuộc tính `url:`, khiến giá trị `seg.url` trả về từ database là `null`.
- **Cơ chế fallback hardcode**:
  - `src/server/learning/session.service.ts`: Biến `let videoUrl` được gán mặc định là `"https://www.youtube.com/watch?v=M7lc1UVf-VE"`.
  - `listening-session-view.tsx` và `youtube-player.tsx`: Có fallback dự phòng trỏ về ID video mẫu khi `videoUrl` bị rỗng.

---

### 2. Các cải tiến đã triển khai

#### A. Tích hợp 4 video bài giảng lâm sàng chuẩn y khoa từ NYSORA
Toàn bộ video nghe đã được kết nối với các bài giảng thực tế từ **NYSORA** (New York School of Regional Anesthesia) do GS. Admir Hadzic trực tiếp giảng dạy:

1. **Bài L1 — Nghe đoạn hội nghị 60s**:
   - **Chủ đề:** Nguyên lý siêu âm và định nghĩa phong bế thần kinh (Nerve Block Definition & Principles).
   - **Video YouTube:** `https://www.youtube.com/watch?v=uVSiFJ85EtM`
   - **Nguồn:** `src-conference-talk-01` | Mốc thời gian: 95s – 155s.

2. **Bài L2 — Nghe hội thoại lâm sàng: Tư vấn đau rễ thần kinh**:
   - **Chủ đề:** Đánh giá giải phẫu siêu âm và kích thích thần kinh (Nerve Stimulation with Ultrasound).
   - **Video YouTube:** `https://www.youtube.com/watch?v=6orck_Vkdlo`
   - **Nguồn:** `src-clinical-audio-series` | Mốc thời gian: 0s – 60s.

3. **Bài L3 — Shadowing 45s: Bóc tách thủy dịch thần kinh giữa**:
   - **Chủ đề:** Kỹ thuật phong bế cổ tay và giải ép thần kinh giữa ống cổ tay (Wrist Block for Carpal Tunnel Surgery).
   - **Video YouTube:** `https://www.youtube.com/watch?v=lKdttUr0VrA`
   - **Nguồn:** `src-carpal-tunnel-video` | Mốc thời gian: 0s – 45s.

4. **Bài L4 — Nghe thuyết trình hội nghị: Bước tiến của POCUS**:
   - **Chủ đề:** Độ an toàn trong can thiệp giảm đau và gây tê vùng dưới siêu âm (Are Nerve Blocks Dangerous? Safety & Evidence).
   - **Video YouTube:** `https://www.youtube.com/watch?v=asrFNM07pc4`
   - **Nguồn:** `src-conference-talk-02` | Mốc thời gian: 0s – 60s.

#### B. Cập nhật Manifest và Tái cấu trúc Fallback
- Cập nhật [content/english-lab/manifest.yaml](file:///f:/ENGLISH/english-mini-lms/content/english-lab/manifest.yaml): Bổ sung đủ `url` cho cả 4 nguồn video tương ứng với 4 segment nghe.
- Đồng bộ hóa logic fallback trong `session.service.ts`, `listening-session-view.tsx`, và `youtube-player.tsx` để luôn ưu tiên URL thực tế của segment từ cơ sở dữ liệu.
- Chạy lệnh `npm run seed` để nạp chính xác các URL video vào bảng `sources` trên Supabase.

---

## Verification Results

- **Kiểm tra tính toàn vẹn Manifest & Nạp DB (`npm run seed`)**:
  - Hợp lệ 7 sources (có đủ URL YouTube y khoa thực tế).
  - Hợp lệ 8 segments và 16 activities đã duyệt.
  - Toàn bộ URL video được ghi nhận chuẩn xác vào DB.
- **TypeScript Typecheck (`npm run typecheck`)**: 0 lỗi.
- **Trải nghiệm thực tế**: Mở phiên nghe của L1, L2, L3, L4 trên giao diện web, trình phát YouTube tải đúng video bài giảng của NYSORA, khống chế đúng khoảng thời gian học và khớp phụ đề theo câu.

---

## Next Steps

1. Hỗ trợ người học tùy chỉnh hoặc dán link YouTube cá nhân vào bài tập ngay từ giao diện Thư viện / Cài đặt nếu muốn luyện nghe thêm các nguồn podcast khác.
2. Bổ sung tính năng điều chỉnh tốc độ phát chi tiết (0.75x, 0.85x, 1.0x, 1.25x) trong thanh điều khiển nghe.
