# Giai đoạn 5 — Mobile learning web

## Liên kết ngữ cảnh

- [Phase 3](phase-03-library-and-learning-core.md); [Phase 4](phase-04-ai-learning-modes.md); [thiết kế sản phẩm](product-design.md).
- [Kiến trúc kỹ thuật](technical-architecture.md); [cơ sở và quyết định D1](evidence-and-decisions.md).

## Tổng quan

- Ưu tiên: P1. Trạng thái: `pending`. Tiến độ: `0%`. Review: `pending`. Effort: **32–40h**.
- Xây web học mobile-first theo D1 đã xác nhận ngày 19/09/2026. Có thể song song P4 sau P3 nếu ownership giới hạn ở UI/client và contract service đã freeze; triển khai vẫn chờ duyệt plan.

## Phát hiện chính

- Người đặt dự án đã chọn Zalo để trò chuyện; web để học với tài liệu, làm bài và xem tiến độ. D1 là cơ sở thiết kế đã xác nhận.
- Mobile flow cần lưu dở, conflict recovery, record/listen/delete trước submit và trạng thái save/queue rõ.
- PWA chỉ cache app shell; offline learning hoàn chỉnh không thuộc MVP và private content không được cache dùng chung.

## Yêu cầu

### Chức năng

- Invite login/logout; Hôm nay, Lộ trình, Thư viện, Học, Bài của tôi, Tiến độ, Cài đặt và admin gọn.
- Chọn 30/45 phút, start/resume/pause; đọc/nghe/ghi âm/viết/hint/reveal/submit/revise; timer thi tách sửa sau giờ.
- UI phân biệt queued/processing/needs input/feedback ready/failed; feedback web xem ngay dù Zalo chậm.
- Conflict 409 giữ draft local, hiển thị server version và cho hòa giải; retry upload không tạo duplicate submission.
- Settings cho consent, retention, export/delete request và reminder opt-in; reminder mặc định tắt.

### Phi chức năng

- Mobile-first, keyboard/screen reader/focus/contrast/touch target, reduced motion, slow network và in-app browser fallback.
- Không chứa token trong URL; link từ Zalo vẫn yêu cầu session/binding hợp lệ.

## Kiến trúc

- Server-render/auth shell; client islands chỉ cho recorder, timer, draft và polling. API client mang idempotency/expected version.
- UI routes không chứa business rules; gọi `/api/v1` và render evidence/limitations đúng contract.
- Recorder tạo local preview rồi upload hai bước; submit chỉ nhận ready media ID. Page unload bảo vệ unsaved draft.
- P4 sở hữu assessment/provider/services; P5 sở hữu `src/app` và UI client, tránh edit chung khi chạy song song.

## Tệp mã liên quan

| Hành động | Đường dẫn đầy đủ | Nội dung dự kiến |
|---|---|---|
| Create | `src/app/(learner)/today/page.tsx` | Start/resume/recommendation, duration và từ vựng đến hạn |
| Create | `src/app/(learner)/vocabulary/page.tsx` | Sổ từ vựng theo ngữ cảnh (Vault), lọc theo chủ đề và tiến độ Spaced Repetition |
| Create | `src/app/(learner)/learn/[session-id]/page.tsx` | Learning workspace theo mode (bao gồm giao diện Shadowing) |
| Create | `src/app/(learner)/submissions/page.tsx` | Original–feedback–revision timeline |
| Create | `src/app/(learner)/progress/page.tsx` | Evidence-backed progress và empty state |
| Create | `src/app/(learner)/settings/page.tsx` | Consent, data requests, reminder opt-in |
| Create | `src/app/admin/page.tsx` | Source/jobs/review support tối thiểu |
| Create | `src/app/components/audio-recorder.tsx` | Record, preview, delete, upload, retry |
| Create | `src/app/components/smart-capture-popup.tsx` | Popup 1-Click Smart Capture khi bôi đen từ/cụm từ trong bài đọc |
| Create | `src/app/components/shadowing-player.tsx` | Nhúng YouTube Iframe Player, đồng bộ transcript mốc giây và mic thu âm |
| Create | `src/app/components/session-draft-editor.tsx` | Autosave, optimistic conflict, restore |
| Create | `src/app/lib/api-client.ts` | Typed calls, idempotency, error mapping |
| Create | `tests/e2e/mobile-learning-web.spec.ts` | Mobile/audio/offline/error journeys |
| Delete | Không có | Không xóa file ở phase này |

## Các bước triển khai

1. Áp dụng D1 đã ghi trong sổ quyết định: Zalo trò chuyện; web học tài liệu, làm bài và xem tiến độ. Khi triển khai được duyệt, thiết kế UI theo phân vai này.
2. Thiết kế state/empty/error matrix và mobile flow cho từng mode; review wording về assisted, limitation và IELTS.
3. Implement auth shell, navigation và Today/Library/Roadmap; không expose answer keys/private storage URLs.
4. Implement learning workspace, draft autosave, timer, pause/resume, hint/reveal, upload/recorder và submission.
5. Implement submissions/feedback/revision, progress/reviews, settings và admin support tối thiểu.
6. Kiểm thử Safari/Chrome mobile và Zalo in-app browser; hướng dẫn mở system browser khi capability thiếu.
7. Planned checks, **chưa chạy ở lượt lập plan**: `npm run test:e2e -- mobile-learning-web`, `npm run test:a11y`, `npm run build`.

## Việc cần làm

- [x] D1 có xác nhận của người đặt dự án ngày 19/09/2026 trong sổ quyết định; chưa có code UI.
- [ ] 8 màn học viên (bao gồm Sổ từ vựng) + 1 màn quản trị có loading/empty/error/permission states.
- [ ] Thao tác 1-Click Smart Capture trên văn bản mượt mà, không giật lag trên mobile/desktop.
- [ ] Trình phát Shadowing nhúng YouTube Iframe chạy đúng mốc start/end seconds và sync transcript.
- [ ] Audio record/play/delete/retry chạy trên thiết bị thật; denied microphone có fallback rõ.
- [ ] 409 conflict không mất local draft; refresh/resume giữ đúng session step.
- [ ] Private response không bị service worker/shared cache lưu sai.

## Tiêu chí thành công

- E2E mobile hoàn tất: login → start/resume → learn → upload/submit → queued → feedback → revise → progress.
- A11y checks và manual keyboard/screen-reader/touch review pass cho luồng chính.
- Network drop/upload retry/worker delay/permission denied/in-app browser đều có recovery, không tạo bài trùng.
- Feedback có trên web ngay sau commit dù result delivery OpenClaw đang pending/unknown.

## Rủi ro

| Rủi ro | Khả năng × tác động | Ứng phó | Rollback |
|---|---|---|---|
| Yêu cầu phân vai kênh đổi sau khi dựng | Trung bình × Cao = **Cao** | Đối chiếu D1 đã xác nhận; đánh giá tác động nếu có yêu cầu đổi mới | Giữ API/core; điều chỉnh UI theo quyết định mới được duyệt |
| Mobile audio không tương thích | Trung bình × Cao = **Cao** | Capability detection + real-device matrix | Chuyển upload/system browser; không hạ nghiệm thu audio |
| Mất draft/conflict | Trung bình × Cao = **Cao** | Local buffer + expected version + recovery UI | Export local draft, reload server state, người học hòa giải |
| PWA cache lộ data | Thấp × Cao = Trung bình | App-shell only, no-store private responses | Unregister cache release và revoke affected sessions |

## Bảo mật

- CSP, output sanitization, CSRF/origin checks, no-store private content, signed/authorized media streaming.
- Admin UI role-gated; learner không thấy job/provider/config/other account.
- Consent rõ cho mic/upload; cho nghe/xóa trước submit; không mở microphone nền.

## Bước tiếp theo

- Sau UI E2E và P4 contract ổn định, nối P6 tools/OpenClaw; mọi thay đổi service contract cần review chung thay vì sửa ngầm từ UI.
