---
title: Hoàn thành Nâng cấp Trải nghiệm M2 (Desktop & Tour) và Bổ sung 16 Bài học Demo Toàn diện
date: 2026-10-03
summary: "Hoàn thành toàn diện gói nâng cấp trải nghiệm M2 và bộ dữ liệu học tập demo: giao diện desktop-first đa cột với thanh bên sidebar, hệ thống hotkey phiên nghe, widget tra phát âm bản ngữ YouGlish, guided tour tương tác 8 bước; cùng 16 bài học thực chiến chuẩn y khoa (4 Viết, 4 Đọc-dịch, 4 Nghe, 4 Nói) và 8 thẻ từ vựng lâm sàng nạp sẵn vào Vocabulary Vault. Đạt 80/80 tests pass, 0 typecheck/lint error."
---

# Hoàn thành Nâng cấp Trải nghiệm M2 (Desktop & Tour) và Bổ sung 16 Bài học Demo Toàn diện

## What happened

Trong phiên làm việc ngày hôm nay (03/10/2026), dự án English Mini LMS đã hoàn thành hai cột mốc quan trọng: **Gói nâng cấp trải nghiệm M2** theo `docs/plan/m2-nang-cap-trai-nghiem-2026-10-02.md` và **Xây dựng bộ dữ liệu học tập demo phong phú** theo yêu cầu của bác sĩ Minh.

### 1. Nâng cấp trải nghiệm người dùng & Giao diện Desktop (M2)

- **Giao diện đa thiết bị (Desktop Sidebar & Responsive Grids)**:
  - Thêm thanh điều hướng bên trái (`Sidebar`) cố định cho màn hình máy tính (`lg:block`), đồng thời duy trì thanh điều hướng đáy (`Bottom Navigation`) mượt mà trên điện thoại.
  - Tái cấu trúc các màn hình chính (`/library`, `/today`, `/vocab`, `/progress`) sang dạng lưới đáp ứng `grid-cols-1 lg:grid-cols-2/3`, tận dụng tối ưu không gian hiển thị trên màn hình lớn.
  - Nâng cấp màn hình bài làm (`/my-work/[submissionId]`): Layout 2 cột trực quan (cột trái xem bài làm người học, cột phải xem nhận xét chi tiết và phân tích từ Gemini AI).

- **Hệ thống phím tắt tiện lợi (Hotkeys) cho phiên nghe**:
  - Hỗ trợ các phím tắt nhanh: `Space` (Play/Pause), `Mũi tên Trái/Phải` (Tua lùi/tiến 5 giây), phím `R` (Phát lại câu hiện tại), phím số `1–4` (Chọn nhanh phương án trắc nghiệm).

- **Tích hợp YouGlish Pronunciation Widget**:
  - Tích hợp cửa sổ tra cứu phát âm từ vựng bản ngữ YouGlish (`components/youglish-modal.tsx`) ngay trên từng thẻ từ vựng tại `/vocab`, hỗ trợ người học xem ngữ cảnh video thực tế trên YouTube.

- **Hệ thống Guided Tour (Hướng dẫn tương tác 8 bước)**:
  - Xây dựng hệ thống tour với `TourHost` (`src/components/tour-host.tsx`) và `GuidedTour` (`src/components/guided-tour.tsx`), tự động làm nổi bật các khu vực trọng tâm trên giao diện.
  - Theo dõi trạng thái hoàn thành qua `preferences` (`tourCompleted`) và `sessionStorage` giữa các chuyển trang.
  - Bổ sung nút **"Xem lại hướng dẫn"** trong trang Cài đặt (`/settings`) giúp người học có thể mở lại tour bất kỳ lúc nào.

---

### 2. Bộ dữ liệu học tập Demo hoàn chỉnh (16 bài học + 8 từ vựng lâm sàng)

Đã bổ sung đầy đủ 4 bài học chuẩn y khoa & học thuật cho từng kỹ năng theo đúng thiết kế tại `content/english-lab/activities-inventory.md`, thẩm định và nạp vào database:

1. **Phần Viết (Writing - 4 bài)**:
   - **W1:** Email xin tham dự hội nghị quốc tế (Asia-Pacific Pain Management Conference).
   - **W2:** Tóm tắt hướng dẫn phong bế đám rối cánh tay liên cơ bậc thang (80–100 từ).
   - **W3:** Trả lời email trao đổi ca bệnh đau rễ thần kinh từ đồng nghiệp Singapore (100–130 từ).
   - **W4:** Email gửi Ban thư ký hội nghị xin điều chỉnh tóm tắt báo cáo và bổ sung tác giả (120–150 từ).
   - Bổ sung rubric mới: `rubrics/writing-summary-v1.yaml`.

2. **Phần Đọc – Dịch Y khoa (Reading - 4 bài)**:
   - **R1:** Đoạn sổ tay siêu âm tr.42 (Phong bế thần kinh trên vai).
   - **R2:** NYSORA: Hướng dẫn phong bế đám rối cánh tay liên cơ bậc thang (`texts/r2-nysora-interscalene.md`).
   - **R3:** Abstract bài báo quốc tế: So sánh độ chính xác của siêu âm động và MRI trong rách bán phần gân chóp xoay (`texts/r3-abstract-rotator-cuff.md`).
   - **R4:** Kỹ thuật tiêm bao hoạt dịch trên xương bánh chè khớp gối dưới siêu âm (`texts/r4-knee-ultrasound.md`).

3. **Phần Nghe (Listening - 4 bài)**:
   - **L1:** Nghe đoạn hội nghị 60s về bệnh lý chóp xoay (kèm 3 câu trắc nghiệm).
   - **L2:** Nghe hội thoại lâm sàng tư vấn đau rễ thần kinh thắt lưng (`transcripts/l2-clinical-consultation.txt` kèm 3 câu trắc nghiệm `texts/l2-questions.yaml`).
   - **L3:** Luyện nghe sâu & Shadowing 45s: Bóc tách thủy dịch thần kinh giữa trong hội chứng ống cổ tay (`transcripts/l3-shadowing-carpal-tunnel.txt`).
   - **L4:** Nghe thuyết trình hội nghị về bước tiến của POCUS trong can thiệp giảm đau (`transcripts/l4-pocus-symposium.txt` kèm 3 câu hỏi `texts/l4-questions.yaml`).

4. **Phần Nói (Speaking - 4 bài)**:
   - **S1:** Giới thiệu bản thân tại hội nghị (60–90s self-intro).
   - **S2:** Giải thích thủ thuật tiêm can thiệp cho bệnh nhân nước ngoài (`texts/s2-patient-explanation-prompt.md`).
   - **S3:** Trả lời câu hỏi phản biện (Q&A) từ chủ tọa tại hội nghị (`texts/s3-conference-qa-prompt.md`).
   - **S4:** Trình bày tóm tắt một ca lâm sàng đau thần kinh tọa (`texts/s4-case-presentation-prompt.md`).

5. **Sổ từ vựng (Vocabulary Vault - 8 thuật ngữ lâm sàng)**:
   - Tự động nạp sẵn 8 thuật ngữ y khoa chuyên ngành: `suprascapular nerve`, `hydrodissection`, `radicular pain`, `anechoic`, `in-plane needle trajectory`, `subacromial impingement`, `paresthesia`, `point-of-care ultrasound`.
   - Mỗi thẻ có đầy đủ: Phiên âm IPA, giải nghĩa ngữ cảnh lâm sàng, câu gốc tài liệu y khoa, câu người học tự đặt và cấp độ nhớ ngắt quãng (SRS).

---

## Verification Results

- **Kiểm tra tính toàn vẹn Manifest (`npm run seed`)**: Nạp thành công 6 sources, 8 segments, 16 activities đã duyệt và 8 từ vựng mẫu vào database Supabase.
- **TypeScript Typecheck (`npm run typecheck`)**: 0 lỗi.
- **ESLint (`npm run lint`)**: 0 lỗi, 0 cảnh báo.
- **Vitest Test Suite (`npm test`)**: **80/80 tests PASS** trên cả 11 test suites:
  - `tests/seed/manifest-parser.test.ts` (5 tests)
  - `tests/youglish/youglish.test.ts` (8 tests)
  - `tests/settings/preferences.test.ts` (7 tests)
  - `tests/library/service.test.ts` (7 tests)
  - `tests/db/schema.test.ts` (5 tests)
  - `tests/tour/tour-position.test.ts` (7 tests)
  - `tests/step7/step7-settings-admin.test.ts` (10 tests)
  - `tests/reading/reading-and-vocab.test.ts` (8 tests)
  - `tests/today-and-progress/today-progress.test.ts` (11 tests)
  - `tests/writing/flow.test.ts` (6 tests)
  - `tests/speaking-listening/speaking-listening.test.ts` (6 tests)
- **Kiểm tra giao diện qua Browser subagent**: Xác nhận tab lọc Thư viện hiển thị đủ 16 bài học (4 bài/tab) và Sổ từ vựng hiển thị đủ các thẻ từ kèm nút YouGlish.

---

## Next Steps

1. Triển khai các bài tập ôn tập từ vựng nhanh (mini-quiz SRS) ngay trên màn hình Hôm nay (`/today`).
2. Tích hợp tính năng sao lưu & phục hồi tiến độ học tập (JSON Export/Import) cho người học.
3. Hỗ trợ chế độ ngoại tuyến (Offline PWA) cho bài đọc và transcript đã tải.
