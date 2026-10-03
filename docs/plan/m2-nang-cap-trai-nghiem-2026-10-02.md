# M2 — Nâng cấp trải nghiệm — English Mini LMS (02/10/2026)

Phần bổ sung cho [huong-dan-sua-loi-va-trien-khai.md](huong-dan-sua-loi-va-trien-khai.md). Làm sau khi Phần 1 (sửa lỗi) của file đó xong; có thể song song Phần 2 (deploy + pilot).

Cách làm y hệt: **mỗi phiên chat Antigravity làm đúng 1 bước**, dán prompt, đọc Implementation Plan rồi mới duyệt, xong tự kiểm tay theo mục "Xong khi".

4 việc: **YouGlish** · **tour hướng dẫn lần đầu** · **giao diện desktop** · **kiểm lại phần xem video** (đã nhúng YouTube sẵn — chỉ cần kiểm chứng, không cần code).

---

## Nâng cấp 1 — Tích hợp YouGlish (nghe người bản xứ nói từ đang tra)

**Mục tiêu:** đang tra từ hoặc ôn từ, bấm 1 nút là nghe được cách người bản xứ phát âm cụm đó trong video thật (YouGlish), không phải rời app.

**Prompt:**

```
Tích hợp YouGlish widget vào app — nghe ví dụ phát âm thật cho cụm từ tiếng Anh.

1. Tạo src/components/youglish-widget.tsx (client component) nhận prop `query: string`.
   Lazy-load script widget chính thức của YouGlish (ygwidget-1.0.1.js) chỉ khi component
   được mở; init YG.Widget với data-lang="english", zones gồm us+uk+aus, autoplay tắt,
   theme nền sáng. Nếu script load fail → hiện link fallback mở tab mới:
   https://youglish.com/pronounce/<query>/english
2. Đặt nút "🔊 Nghe người bản xứ nói" ở 3 chỗ — mở widget trong panel/modal, KHÔNG
   nhúng sẵn để trang không nặng:
   - smart-capture-popup.tsx: dưới khối kết quả tra cứu, query = data.phrase
   - vocab-list-view.tsx: trong chi tiết mở rộng của từ, query = item.phrase
   - vocab/review/vocab-review-view.tsx: sau khi trả lời xong 1 từ, query = từ đang ôn
3. Kiểm next.config.ts / headers: nếu có CSP frame-src thì whitelist domain widget
   YouGlish (widget của họ render iframe gồm cả video YouTube bên trong). Ghi chú lý do
   trong code.
4. Đóng modal/panel phải destroy widget để audio không phát ngầm.

Lập Implementation Plan trước, chờ tôi duyệt. Sau sửa chạy npm run typecheck + lint.
```

**Xong khi:** vào bài đọc R1, bôi đen "tendinopathy" → tra cứu → bấm nút nghe → widget hiện video người bản xứ đọc đúng từ đó, next/prev giữa các ví dụ được; làm lại tương tự trong Sổ từ và màn Ôn từ; tắt popup thì không còn tiếng phát; widget lỗi vẫn có link mở youglish.com.

## Nâng cấp 2 — Tour hướng dẫn lần đầu mở app (demo walkthrough)

**Mục tiêu:** lần đầu vào app sau khi lưu hồ sơ onboarding, app tự chạy tour 6–7 bước chỉ từng tính năng một; có nút "Xem lại hướng dẫn" trong /settings; trạng thái đã-xem lưu trên server để đổi điện thoại ↔ máy tính không hiện lại.

**Prompt:**

```
Thêm guided tour lần đầu cho người học. Tự code bằng React + Tailwind, KHÔNG thêm
dependency (driver.js, react-joyride...) — tour chỉ cần spotlight + tooltip đơn giản.

1. src/components/guided-tour.tsx: overlay làm tối màn hình + spotlight (box-shadow)
   quanh phần tử có attribute data-tour="<id>" + tooltip (tiêu đề, mô tả, nút
   Tiếp/Lui/Bỏ qua). Steps là mảng config. Tự scroll element vào view; element chưa có
   thì retry vài lần rồi nhảy bước. Bấm ra ngoài = bỏ qua. Tooltip không được tràn mép
   màn hình cả mobile lẫn desktop.
2. Gắn data-tour vào các điểm chính:
   - /today: nút "Bắt đầu" (tour="today-start") — giải thích phiên 30/45 phút
   - /library: thẻ bài đầu tiên (tour="library-card")
   - /vocab: nút "Ôn từ theo lịch" + 1 mục từ mẫu (tour="vocab-review", "vocab-item")
   - bottom-nav: 5 mục điều hướng (tour="nav-*")
   - /my-work: khu phản hồi AI (tour="mywork-feedback")
   - /progress: biểu đồ (tour="progress-chart")
3. Cờ đã-xem lưu trên server: mở rộng PATCH /api/v1/settings/preferences để merge key
   tourCompleted vào learners.preferences (jsonb sẵn có). Vào /today mà chưa có cờ →
   chạy tour; hoàn tất hoặc bỏ qua → PATCH cờ. Kèm fallback localStorage nếu API lỗi.
   Sau khi lưu onboarding thành công → redirect /today?tour=1 để tour chạy ngay.
4. /settings thêm nút "▶️ Xem lại hướng dẫn" → xoá cờ → quay /today chạy lại tour.

Lập Implementation Plan trước, chờ tôi duyệt. Sau sửa chạy npm run typecheck + lint.
```

**Xong khi:** dùng tài khoản chưa từng xem (hoặc bấm "Xem lại hướng dẫn") → vào /today tour tự chạy, đi hết/bỏ qua đều được; sau đó mở trên máy khác không hiện lại; từng tooltip không bị che/tràn trên điện thoại.

## Nâng cấp 3 — Giao diện desktop khi học trên máy tính

**Mục tiêu:** học trên laptop/desktop màn rộng vẫn thoải mái: menu dọc bên trái thay thanh nav dưới, bố cục 2 cột cho màn học, chữ/khoảng trắng hợp lý — mobile giữ nguyên như cũ.

**Prompt:**

```
Thêm layout desktop (breakpoint lg ≥1024px) mà không phá mobile hiện tại:

1. src/app/(main)/layout.tsx + src/components/bottom-nav.tsx: trên lg → bottom nav ẩn,
   thay bằng sidebar trái cố định (~240px, icon + nhãn, item đang active nổi rõ); main
   margin-left tương ứng, bỏ paddingBottom --nav-height trên lg. Dùng Tailwind
   responsive (hidden lg:flex, lg:pl-... v.v.); khu vực đang inline style thì chuyển
   sang class Tailwind.
2. Trang học /learn/[sessionId] trên lg → lưới 2 cột:
   - listening: trái = YouTube player + transcript (sau khi reveal), phải = câu hỏi +
     shadowing
   - reading: trái = văn bản nguồn, phải = khu dịch/ghi chú
   - writing & speaking: trái = đề bài + gợi ý, phải = khu soạn bài/ghi âm
   Dưới lg giữ xếp dọc như hiện tại. Nội dung tối đa ~1200px, căn giữa.
3. /today, /library, /vocab, /progress, /my-work: trên lg cho lưới thẻ 2–3 cột và
   container rộng hơn (~1100–1200px); rà toàn app bỏ các maxWidth ~800px / inline style
   làm layout desktop bị chật.
4. Tiện ích desktop cho bài nghe: phím Space = play/pause, ←/→ = tua 5s qua playerRef
   của YouTubePlayer (bỏ qua khi đang gõ trong input/textarea); tooltip giải thích phím
   tắt cạnh player.

Lập Implementation Plan trước, chờ tôi duyệt. Sau sửa chạy npm run typecheck + lint + build.
```

**Xong khi:** mở app trên máy tính 1280–1440px: menu dọc bên trái, bài nghe có video bên trái – câu hỏi bên phải, Space tạm dừng video; kéo cửa sổ <1024px quay lại đúng giao diện điện thoại cũ, không vỡ.

## Kiểm lại — Video bài nghe ĐÃ nhúng YouTube sẵn (không cần code thêm)

Đã rà code xác nhận: `src/app/(main)/learn/[sessionId]/youtube-player.tsx` nhúng video bằng **YouTube IFrame API** — cắt đúng đoạn `startSeconds–endSeconds`, có nút tua/nghe lại theo mốc câu hỏi, và tự hiện link "Mở trên YouTube" nếu chủ video chặn nhúng. `videoUrl` lấy từ `sources.url` trong DB (seed từ `manifest.yaml`); link `M7lc1UVf-VE` trong code chỉ là fallback.

Chỉ cần kiểm chứng trên máy thật:

- [ ] Điện thoại: mở bài L1 → video chạy ngay trong app, đúng đoạn đã cắt, không văng ra YouTube.
- [ ] Desktop (sau Nâng cấp 3): video nằm cột trái; link "Mở trên YouTube" chỉ hiện khi video bị chặn nhúng.
- [ ] Muốn đổi video bài L1: sửa `url` trong manifest/file nguồn của bài trong `content/english-lab/` rồi `npm run seed`.
