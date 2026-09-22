# Giai đoạn 1 — Khảo sát và khóa hợp đồng

## Liên kết ngữ cảnh

- [Kế hoạch tổng](plan.md); [cơ sở và quyết định](evidence-and-decisions.md); [thiết kế sản phẩm](product-design.md).
- [Kiến trúc kỹ thuật](technical-architecture.md); [hợp đồng dữ liệu/tools](data-and-tools-contract.md); [vận hành và nghiệm thu](operations-and-acceptance.md).
- [Nghiên cứu kiến trúc tích hợp](research/integration-architecture-report.md); [nghiên cứu trải nghiệm học](research/learning-experience-report.md).

## Tổng quan

- Ưu tiên: P1. Trạng thái: `pending`. Tiến độ: `0%`. Review: `pending`. Effort: **12–16h**.
- Xác minh live runtime, nguồn, quyền, quyết định sản phẩm và contract trước khi tạo app. Không coi framework/provider/OpenClaw hiện tại là đã tương thích nếu chưa probe.

## Phát hiện chính

- Repo chưa có mini LMS; repo `english-mini-lms/` (repo riêng) là app mới đề xuất.
- OpenClaw/Zalo đã có nhưng chưa biết chính xác version, tool transport, trusted identity, media, receipt và retry semantics.
- D1 đã được người đặt dự án xác nhận ngày 19/09/2026: Zalo trò chuyện; web học tài liệu, làm bài và xem tiến độ. Nguồn audio, bộ IELTS/rubric, retention và chủ sở hữu vận hành còn cần chốt.
- Thư mục `content/english-lab/` và quyền sử dụng phải inventory; thiếu nguồn không được bù bằng dữ liệu ngoài `docs/sources/`.

## Yêu cầu

### Chức năng

- Chốt outcome, constraints, non-goals, acceptance; giữ một learner + một admin hỗ trợ, không public signup.
- Probe OpenClaw sandbox: tool call, trusted actor, payload/media limits, timeout, retry, polling và delivery receipt; không sửa/setup Zalo adapter.
- Xác minh supported versions của Next.js/Node/PostgreSQL, package manager, auth library bảo trì, AI/STT/TTS/audio capability và data-handling terms.
- Inventory source/provenance/licence; chỉ publish nội dung đã duyệt. Giữ D1 đã xác nhận; chốt IELTS Academic/General, owner backup/support, consent/retention và budget guardrail trước dịch vụ trả phí.

### Phi chức năng

- Ghi unknown bằng owner + due gate + fallback trong `evidence-and-decisions.md`; không hỏi lại điều có thể probe.
- Không mở môi trường public, mua dịch vụ hay đưa dữ liệu thật vào probe.

## Kiến trúc

- Tạo contract v1 cho `/api/v1` và thin tool client nhưng chỉ chọn transport OpenClaw sau probe.
- Trusted actor context được runtime đưa ngoài model arguments; mọi action được LMS authorize lại.
- Freeze domain boundaries: identity, curriculum, sessions, attempts, grading, feedback, messaging, admin, jobs/outbox.
- Freeze runtime paths: source read-only `/srv/english-mini-lms/content/english-lab/`; learner/private/index state dưới `/srv/english-mini-lms/private/`.

## Tệp mã liên quan

| Hành động | Đường dẫn đầy đủ | Nội dung dự kiến |
|---|---|---|
| Create | `docs/verified-runtime-matrix.md` | Version, provider, auth, OpenClaw probe evidence |
| Create | `docs/source-and-rights-register.md` | Provenance, quyền, publish state, owner |
| Create | `docs/decision-register.md` | D1 và unknown/gate/fallback |
| Create | `docs/api-and-tools-contract-v1.md` | Contract v1 đã freeze để P2 hiện thực hóa |
| Delete | Không có | Không xóa file ở phase này |

## Các bước triển khai

1. Xác nhận inventory repo, nguồn, máy chủ và boundary dữ liệu; ghi bằng chứng, không đọc clinic/patient data.
2. Dùng sandbox actor giả probe OpenClaw: request duplication, forged identity, media/audio, timeout và result polling/receipt.
3. Kiểm tra official support/security policy của runtime, database, auth library và AI/audio providers; pin version proposal cùng lý do.
4. Đưa D1 đã xác nhận vào decision register; tổ chức decision review cho loại IELTS, consent/retention, owner support/backup, nguồn audio/rubric và giới hạn chi phí.
5. Viết API/tool/domain contract, error taxonomy, idempotency semantics, payload limits, redaction và schema compatibility.
6. Chốt scripts dự kiến cho các phase sau. Lệnh planned, **chưa chạy ở lượt lập plan**: `npm run verify:runtime`, `npm run test:contract`.

## Việc cần làm

- [ ] Có runtime matrix với bằng chứng live và ngày kiểm tra.
- [x] D1 được người đặt dự án xác nhận ngày 19/09/2026 và ghi trong sổ quyết định của plan.
- [ ] Mọi unknown còn lại ảnh hưởng scope có owner, gate, fallback.
- [ ] Live audio và IELTS source/rubric có owner duyệt hoặc được đánh dấu blocker full scope.
- [ ] Contract v1 và data boundary được review trước tạo migration/UI.

## Tiêu chí thành công

- Contract probe chứng minh forged actor bị từ chối, duplicate semantics rõ, media/audio path chạy được hoặc blocker có bằng chứng.
- Auth library/runtime/provider chỉ được chọn khi còn bảo trì và phù hợp data policy; version chưa test không được viết như fact.
- Source inventory không trỏ ngoài `content/english-lab/`; index path không nằm dưới `docs/index/`.
- Review record xác nhận decision gates; `npm run test:contract` là check bắt buộc sau khi scaffold tồn tại.

## Rủi ro

| Rủi ro | Khả năng × tác động | Ứng phó | Rollback/stop |
|---|---|---|---|
| OpenClaw không cung cấp verified identity/media | Trung bình × Cao = **Cao** | Chọn transport được runtime hỗ trợ, giữ API semantics | Dừng P6/full audio; không tự build Zalo adapter |
| Thiếu audio hoặc IELTS rubric hợp lệ | Cao × Cao = **Cao** | Chỉ làm mode có source publish; owner bổ sung theo gate | Không tuyên bố full scope complete |
| Version/provider không đạt policy | Trung bình × Cao = **Cao** | Thay lựa chọn trước scaffold, probe lại | Không khóa dependency chưa xác minh |

## Bảo mật

- Probe chỉ dùng actor và content giả; secret qua runtime injection, không ghi log/report/repo.
- Xác minh threat boundary trước: LMS không có route/credential đến clinic DB/files.
- Không tin learner ID, phone, role hay filesystem path trong model-generated arguments.

## Bước tiếp theo

- Chỉ mở Phase 2 khi runtime/auth/storage decisions và contract v1 đã được review; blocker full audio/IELTS có thể còn mở nhưng phải có owner + gate rõ.
