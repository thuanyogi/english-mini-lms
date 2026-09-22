# Kiểm tra sẵn sàng bộ plan — 22/09/2026

Mục đích: trả lời câu hỏi "plan đã oke chưa, cần bổ sung gì để anh Minh tự xây với Antigravity?". Đọc toàn bộ 15 file trong thư mục plan, đối chiếu với trạng thái workspace thật.

## Kết luận ngắn

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Thiết kế sản phẩm (5 mode, 7 màn, Vocabulary Vault, shadowing) | ✅ Đủ | Rõ mục tiêu → tính năng → bằng chứng nghiệm thu |
| Kiến trúc & contract dữ liệu/API/tools | ✅ Đủ, chất lượng cao | Đã qua 2 vòng review, findings đã xử lý |
| 8 phase triển khai + nghiệm thu + vận hành | ✅ Đủ | Effort 180–248h, hướng đội kỹ thuật |
| Bản gửi anh Minh + diagram demo | ✅ Có | `ban-gui-anh-minh.md`, `demo/` |
| **Phù hợp để anh Minh tự xây bằng Antigravity** | ⚠️ **Chưa** | Xem mục "Lệch mục tiêu" |
| Nguồn học `content/english-lab/` | ❌ Chưa tồn tại | Là nguồn học duy nhất theo plan |
| Stack cụ thể (framework/DB/auth/AI) | ⚠️ Để mở đến P1 | Người tự xây cần lựa chọn chốt sẵn |
| Rules/workflows cho Antigravity | ❌ Chưa có | Antigravity đọc `.agents/rules/`, `.agents/workflows/` |
| Hướng dẫn từng bước cho người không chuyên | ❌ Chưa có | Phase files viết cho dev |

## Lệch mục tiêu: plan "đội kỹ thuật" vs "tự xây với AI IDE"

Plan hiện tại đúng và an toàn nếu có đội dev + người vận hành OpenClaw. Với anh Minh tự xây, các phần sau là rào cản không cần thiết ở bản đầu:

- Worker riêng + DB job queue + lease/retry/dead-letter (P2, P4).
- Outbox + bridge claim/ack + trusted actor tuple cho OpenClaw (P6).
- Deletion ledger, restore rehearsal RPO/RTO, Docker Compose + reverse proxy TLS tự quản (P7).
- Invite/binding token lifecycle 2 purpose (P2) — một người học chỉ cần 1 tài khoản email.

Không phần nào trong số này sai; chúng chỉ nên là **v2** sau khi bản Lite chạy được và anh Minh học thật 4 tuần.

## Bổ sung đã thực hiện (22/09/2026)

1. `lite-mvp-track.md` — lộ trình tự xây rút gọn: web-first, 1 người học, Gemini làm AI, Supabase (Postgres + Auth + Storage) hoặc Postgres local, không worker, Zalo để sau. Giữ nguyên các invariant cốt lõi của plan (bài nộp append-only, `assisted` server-side, không chấm phát âm từ text, không tự gán band IELTS, không dữ liệu clinic).
2. `content/english-lab/` — tạo thư mục với `README.md`, `activities-inventory.md` (24 slot theo product-design) và `manifest.example.yaml`.
3. `antigravity-starter-kit/` — file mẫu để copy vào workspace app: `AGENTS.md`, `rules/english-mini-lms.md`, `workflows/build-step.md`, `workflows/verify.md`.
4. `huong-dan-xay-dung-voi-antigravity.md` — hướng dẫn từng bước kèm prompt sẵn, tiêu chí "xong" mỗi bước, cách test bằng Browser subagent.
5. `plan.md` — thêm liên kết tới các tài liệu mới; effort/phase gốc giữ nguyên làm đích v2.

## Điểm vẫn phải anh Minh / chủ dự án chốt (không thể bổ sung thay)

- Trình độ hiện tại, IELTS Academic/General, deadline thi/hội nghị (onboarding).
- Sách/chương/audio/đề được phép dùng → nạp vào `content/english-lab/`.
- Đồng ý lưu bài/voice trên dịch vụ cloud (nếu chọn Supabase/Vercel) hay chỉ máy cá nhân.
- Ngân sách Gemini API/tháng và hạn mức dừng.
- Có/không dùng Zalo–OpenClaw ở bản đầu (đề xuất: không, làm sau).

## Không thay đổi

Toàn bộ phase-01…08, contract, kiến trúc, nghiệm thu gốc giữ nguyên nội dung và trạng thái `pending`. Bản Lite là nhánh đi trước, không thay thế đích cuối.
