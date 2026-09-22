# Lite MVP Track — lộ trình tự xây với Antigravity

Trạng thái: đề xuất bổ sung 22/09/2026 (mã quyết định D11, chờ duyệt). Liên quan: [plan](plan.md), [readiness check](reports/plan-readiness-check-2026-09-22.md), [hướng dẫn từng bước](huong-dan-xay-dung-voi-antigravity.md).

## Vì sao cần nhánh Lite

Plan gốc (P1–P8, 180–248h) thiết kế cho đội kỹ thuật + người vận hành OpenClaw. Anh Minh tự xây bằng Antigravity cần một đích gần hơn: **một web app cá nhân chạy được trong vài tuần, học thật được ngay, giữ đúng các nguyên tắc cốt lõi**, rồi mới nâng dần lên đích v2 của plan gốc.

Lite không đổi mục tiêu học, không đổi 5 mode, không đổi data model cốt lõi. Lite chỉ **bỏ tầng vận hành phức tạp** và **hoãn Zalo**.

## Giữ nguyên (không thương lượng)

Các invariant sau lấy thẳng từ plan gốc, phải có trong code ngay bản Lite:

1. `submissions` append-only; sửa bài = bản mới liên kết `parent_id`, không ghi đè.
2. `assisted` do server tính từ event hint/reveal; bài xem đáp án trước không tính độc lập.
3. Không chấm phát âm/ngữ điệu khi không có audio thật → `not_assessable`.
4. Không có trường nào để AI ghi "official IELTS band"; điểm chỉ là `practice_estimate`.
5. Feedback có cấu trúc: vị trí/câu gốc → vấn đề → cách sửa → ví dụ ngắn → yêu cầu thử lại → `limitations`.
6. Nguồn học chỉ từ `content/english-lab/` đã duyệt; không đụng dữ liệu clinic, `docs/index/`, bệnh nhân.
7. Sách y dùng để luyện ngôn ngữ; AI không suy diễn khuyến nghị điều trị, không đưa ca bệnh thật vào bài.
8. Secret chỉ trong `.env` (gitignore); không dán API key vào chat Antigravity.

## Bỏ / hoãn ở Lite → làm ở v2

| Plan gốc | Lite | Lý do |
|---|---|---|
| Worker Node riêng + DB job queue, lease, dead-letter | Gọi Gemini trực tiếp trong route handler; bảng `assessments` giữ trạng thái `queued/processing/feedback_ready/failed`; timeout 60s → `failed` + nút "chấm lại" | 1 người học, tải rất thấp |
| Outbox + bridge claim/ack OpenClaw | Không có | Chưa có Zalo ở Lite |
| Trusted actor tuple, identity binding, invite 2 purpose | Supabase Auth email + magic link, 1 tài khoản học viên, `role` cột đơn giản (`learner`/`admin`) | Đủ cho 1 người |
| Deletion ledger, restore rehearsal RPO/RTO | Backup: Supabase daily backup (plan trả phí) hoặc script `pg_dump` hàng tuần + copy Storage; nút "Xuất dữ liệu của tôi" | Chấp nhận rủi ro thấp hơn, ghi rõ trong Cài đặt |
| Docker Compose + reverse proxy + VPS | Vercel (web) + Supabase (DB/Auth/Storage) | Không cần quản server |
| Source import manifest có hash/provenance/curator flow | Thư mục `content/` trong repo với `manifest.yaml` + script `seed` đọc YAML → DB; trường `review_state` vẫn có | Anh Minh vừa là curator |
| 24 activity đủ trước MVP | 6 activity đầu (mỗi mode 1–2) để chạy end-to-end, tăng dần lên 24 | Ưu tiên vòng lặp làm–sửa chạy được |
| Admin dashboard queue/cost | Trang `/admin` gọn: danh sách activity, job lỗi, tổng token/tháng | Đủ để tự quản |

## Stack đề xuất cho Lite (cần duyệt, chưa xác minh version)

| Thành phần | Chọn | Lý do | Xác minh ở Bước 1 |
|---|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Một codebase UI + API; Antigravity quen | Phiên bản LTS hiện hành |
| DB + Auth + Storage | Supabase (Postgres) | Khớp plan (Postgres), có Auth + Storage + RLS, free tier | Free tier còn phù hợp; vùng gần VN |
| ORM | Drizzle hoặc Prisma | Migration additive rõ ràng | Chọn 1, không đổi giữa chừng |
| UI | Tailwind + shadcn/ui | Mobile-first nhanh | — |
| AI | Gemini API (text + audio input + TTS) | Cùng hệ với Antigravity; OpenClaw clinic đang dùng Gemini; nhận audio trực tiếp | Model hỗ trợ audio input, structured output JSON, giá/1M token |
| STT | Gemini audio understanding (transcript + nhận xét) | Bớt 1 provider | Nếu chất lượng kém → Google Cloud STT |
| Deploy | Vercel | Miễn phí cho cá nhân, preview URL | Giới hạn thời gian request (audio) |
| Local thay thế | Postgres qua Docker Desktop + file lưu `./private/` | Nếu không muốn cloud giữ voice | — |

Quyết định cloud vs local là của anh Minh (quyền riêng tư voice/bài). Cả hai đường đều dùng cùng schema và code; chỉ khác adapter storage/auth.

## Phạm vi Lite theo bước (khớp hướng dẫn)

| Bước | Kết quả chạy được | Ước lượng giờ anh Minh ngồi với Antigravity* |
|---|---|---|
| 0 | Cài đặt công cụ, tài khoản, starter kit | 2–3h |
| 1 | App chạy local, đăng nhập được, DB có schema nền | 3–5h |
| 2 | Thư viện: seed 6 activity từ `manifest.yaml`, xem trên điện thoại | 3–4h |
| 3 | **Writing mode end-to-end**: viết → nộp → Gemini chấm có cấu trúc → sửa bản 2 | 5–8h |
| 4 | Đọc–dịch y khoa + Vocabulary Vault (bôi đen → lưu 1 chạm) | 5–8h |
| 5 | Speaking (ghi âm → audio lên Gemini → transcript + góp ý) + Listening/Shadowing | 8–12h |
| 6 | Hôm nay / Tiến độ / ôn từ đến hạn (SRS 1-3-7-14) | 4–6h |
| 7 | Deploy Vercel + Supabase, backup, PWA icon | 3–5h |
| 8 | Pilot 4 tuần học thật; sửa theo cảm nhận | 2h/tuần kỹ thuật |
| 9 | (v2) IELTS timed + rubric; Zalo/OpenClaw theo phase-06 | theo plan gốc |

\*Ước lượng để lập kế hoạch, không phải cam kết. Tổng Lite khoảng 35–55h, chưa gồm thời gian biên tập nội dung và thời gian học.

## Data model Lite (rút từ contract gốc)

Giữ tên bảng của [data-and-tools-contract.md](data-and-tools-contract.md) để v2 nâng cấp không phải đổi: `learners`, `sources`, `source_segments`, `activities`, `learning_sessions`, `session_events`, `drafts`, `media_objects`, `submissions`, `assessments`, `feedback_versions`, `error_observations`, `vocabulary_vault`, `vocabulary_reviews`, `usage_events`.

Bỏ ở Lite: `invites`, `identity_binding_requests`, `external_identities`, `jobs`, `job_attempts`, `idempotency_records`, `outbox_events`, `delivery_attempts`, `deletion_ledger`, `rubric_versions` (thay bằng cột `rubric_json` trong `activities`, thêm bảng riêng khi làm IELTS ở v2).

## Nghiệm thu Lite

Đủ để bắt đầu pilot khi:

- Đăng nhập trên điện thoại; mở Hôm nay → chọn 30/45 phút → làm 1 bài → nộp → thấy feedback → sửa → bản 2 hiển thị cạnh bản 1.
- 4 mode chạy: writing, đọc–dịch, speaking (audio thật), listening. IELTS có thể để v2.
- Vocabulary Vault lưu được tuple đủ 6 trường; trang ôn hiện từ đến hạn.
- Xem đáp án trước nộp → bài gắn `assisted` và Tiến độ tách riêng.
- Gửi text-only vào speaking → feedback ghi pronunciation `not_assessable`.
- `.env` không trong git; Supabase RLS chặn user khác đọc bài (test bằng tài khoản thứ 2).
- Có bản backup đầu tiên và biết cách restore.

## Đường lên v2

Khi Lite chạy ổn 4 tuần: quay lại [plan.md](plan.md), đi Phase 1 (probe OpenClaw), Phase 6 (tools), Phase 7 (vận hành). Schema Lite là tập con additive của contract gốc nên không phải làm lại.
