# Báo cáo kiến trúc tích hợp và vận hành English Mini LMS

---
date: 2026-09-19
scope: planning-only
status: proposed
---

## Kết luận

Nên xây một **modular monolith** độc lập tại repo `english-mini-lms/` (repo riêng), gồm web responsive và worker dùng cùng một bản phát hành. PostgreSQL giữ dữ liệu nghiệp vụ lẫn hàng đợi công việc; file học liệu nằm trên private volume. OpenClaw hiện hữu chỉ gọi các công cụ LMS từ ngữ cảnh Zalo đã xác thực; không tạo adapter, webhook hay quy trình thiết lập Zalo thứ hai.

Phiên bản pilot phải cách ly hoàn toàn với hệ thống phòng khám: database, volume, service account, secrets và network policy riêng; danh tính LMS không cấp quyền đọc dữ liệu clinic. Mọi thay đổi schema/dữ liệu phải có backup trước, kiểm thử restore và rollback rõ ràng.

## Tóm tắt kinh doanh

- Mục tiêu: cho một người học là BS. Minh học bài ngắn, nộp bài, nhận chấm/feedback và tiếp tục cùng trạng thái trên mobile web hoặc Zalo.
- Giá trị pilot: giảm thao tác tự quản lý việc học, giữ lịch sử học tập nhất quán, đo được tiến độ và chất lượng phản hồi.
- Phạm vi đầu: một chương trình tiếng Anh cho BS. Minh, nội dung chỉ từ `content/english-lab/`; không mặc định có vai trò giáo viên và không nối dữ liệu bệnh nhân, CRM hay vận hành clinic.
- Chỉ số chấp nhận: hoàn thành bài, thời gian từ nộp đến feedback, tỷ lệ feedback cần chỉnh thủ công và số sự cố lệch trạng thái đa kênh.
- Quyết định mở rộng chỉ sau khi chứng minh restore, cô lập dữ liệu, độ tin cậy giao tin và chất lượng chấm trên dữ liệu pilot.

## Kiến trúc đích

```text
Mobile Web ──HTTPS──┐
                    ├─ English Mini LMS web/API ── PostgreSQL
Existing OpenClaw ──┘             │                  ├─ job queue
  (Zalo channel owner)             ├─ private volume └─ outbox
                                   └─ LMS worker (same release)
```

- repo `english-mini-lms/` (repo riêng): một codebase, module ranh giới rõ cho identity, curriculum, attempts, grading, feedback, messaging và admin.
- `web/API`: session trình duyệt, API/tool endpoints, màn hình mobile-first; stateless ngoài PostgreSQL/private volume.
- `worker`: claim job bằng transaction/row locking, chấm bất đồng bộ, ghi feedback và outbox; chạy đúng cùng image/revision với web để tránh lệch contract.
- Không cần Redis ở pilot. Queue trong database có `available_at`, `locked_at`, `attempt_count`, lease timeout và dead-letter state.
- `content/english-lab/` là nguồn thư viện duy nhất. Artifact index sinh ra trong private runtime state riêng của LMS, tuyệt đối không đặt dưới `docs/index/` và không ghi ngược vào nguồn.
- File và bài làm do BS. Minh gửi là learner artifacts riêng, lưu theo learner/attempt trên private volume, không đưa vào Git, kho nguồn hay index dùng chung.

## Mô hình danh tính và quyền

- Zalo: OpenClaw phải truyền một **trusted actor context** do chính runtime/adapter tạo và ký hoặc chuyển qua kênh nội bộ xác thực. LMS chỉ tin `channel`, `external_subject`, `conversation`, `request_id`, thời điểm và claims đã được OpenClaw xác minh.
- Tuyệt đối không lấy learner ID, số điện thoại hay quyền từ nội dung do model sinh, tool argument tự do hoặc tin nhắn người dùng.
- Bảng liên kết giữ `identity_provider + external_subject -> learner_id`; liên kết mới cần flow có kiểm chứng và audit event, không tự ghép theo tên hiển thị.
- Web: session cookie `HttpOnly`, `Secure`, `SameSite=Lax/Strict`, rotating session ID và CSRF protection cho mutation. Browser account liên kết cùng `learner_id` qua invite/one-time binding flow.
- Tool authorization được kiểm lại trong LMS trên từng action; OpenClaw không phải nơi duy nhất quyết định quyền.

## Hợp đồng bridge tối thiểu

Tên API/tool thực tế phải xác minh ở giai đoạn 1; ví dụ dưới đây chỉ định nghĩa semantics, không khẳng định OpenClaw hỗ trợ tên hay transport cụ thể.

```json
{
  "operation": "submit_attempt",
  "idempotency_key": "oc:<trusted-request-id>",
  "actor_context": {
    "issuer": "existing-openclaw",
    "channel": "zalo",
    "external_subject": "opaque-provider-id",
    "conversation": "opaque-conversation-id",
    "issued_at": "2026-09-19T04:46:00Z",
    "proof": "transport-bound-or-signed-proof"
  },
  "input": {"lesson_id": "lesson_opaque", "answer_ref": "private-upload-ref"}
}
```

```json
{
  "request_id": "lms_request_opaque",
  "attempt_id": "attempt_opaque",
  "status": "accepted",
  "poll_after_seconds": 5
}
```

Giới hạn contract: allowlist operation; schema/version bắt buộc; payload và file size hữu hạn; timeout ngắn; không nhận filesystem path, SQL, prompt hệ thống hay credential; response không trả PII không cần thiết. Mọi mutation lưu request hash cùng idempotency key; dùng lại key với payload khác phải bị từ chối.

## Dữ liệu, đồng thời và tính bền vững

- `attempt` là bản ghi bền vững, immutable cho câu trả lời đã nộp; sửa bài tạo revision/submission mới thay vì ghi đè.
- `feedback_record` chứa rubric/version, provider/model/version nếu có, timestamps, trạng thái và nội dung kết quả. Đây không phải dialogue memory.
- `dialogue_memory` chỉ phục vụ hội thoại, có retention riêng, không được dùng làm nguồn sự thật về tiến độ, điểm hay lần nộp.
- Web và Zalo cùng gọi một command service. Mutation dùng idempotency key, optimistic version hoặc row lock để ngăn nộp kép và lost update.
- Chấm bài: transaction ghi attempt và job trước khi trả `accepted`; worker có thể chạy lại an toàn, kết quả chỉ commit khi trạng thái/version còn hợp lệ.
- Transaction hoàn tất feedback đồng thời ghi outbox. Dispatcher gửi theo `delivery_id`; trạng thái gồm `pending`, `sent`, `confirmed`, `failed`, `delivery_unknown`.
- Timeout sau khi gọi kênh phải thành `delivery_unknown`; đối soát bằng provider/message receipt khi có. Không gửi lại mù vì có thể tạo tin trùng; chỉ resend sau quyết định có bằng chứng hoặc thao tác support có audit.

## Ma trận lỗi và hành vi

| Tình huống | Hành vi bắt buộc | Tín hiệu vận hành |
|---|---|---|
| OpenClaw gọi trùng request | Trả lại cùng kết quả; không tạo attempt thứ hai | idempotency hit rate |
| Web/Zalo nộp đồng thời | Một revision thắng; request còn lại nhận conflict/current state | conflict count |
| Worker chết giữa chấm | Lease hết hạn, job được claim lại; commit idempotent | job age, retries |
| Provider chấm timeout | Retry có backoff trong budget; sau đó review/failed | queue lag, dead letters |
| DB tạm mất | API fail-closed cho mutation, không nhận giả | DB errors, availability |
| Private volume thiếu file | Giữ attempt, đánh dấu input unavailable, không chấm đoán | missing-object alert |
| Gửi Zalo timeout sau request | `delivery_unknown`, đối soát; không resend mù | unknown-delivery age |
| Actor context thiếu/sai proof | 401/403, không auto-bind learner | auth rejection audit |
| Index/source version lệch | Không publish/chấm; yêu cầu rebuild có provenance | index integrity check |

## Triển khai và phục hồi

1. Provision isolated PostgreSQL, encrypted private volume và service identities riêng; LMS subnet/policy không có route hay credential tới clinic stores.
2. Build một immutable release; deploy web và worker với cùng schema-compatibility declaration. Migration là job riêng, không tự chạy đồng thời từ nhiều replica.
3. Trước **mọi** schema/data change: tạo backup nhất quán, ghi checksum/retention, kiểm tra khả năng đọc. Migration phải có dry-run/staging rehearsal và rollback/forward-fix decision.
4. Mục tiêu pilot đề xuất cho bộ PostgreSQL và private files nhất quán: RPO ≤24 giờ, RTO ≤8 giờ, cần BS. Minh duyệt. Chỉ coi đạt khi restore sang môi trường cô lập, chạy integrity checks và ghi thời gian phục hồi thực tế; chưa đạt thì không go-live.
5. Secrets lấy từ secret store/runtime injection, phân quyền tối thiểu, rotate được; không đặt trong repo, log, prompt, index hay actor payload.
6. Log dùng opaque IDs, redaction mặc định; audit identity binding, thay đổi cấu hình/rubric, sửa feedback thủ công và manual resend. Metric không chứa bài làm hay nội dung hội thoại.

## Giai đoạn 1: xác minh trực tiếp trước khi khóa thiết kế

- Inventory phiên bản OpenClaw đang chạy, transport/tool mechanism, cách runtime cung cấp verified channel identity, timeout/retry và delivery receipt thực tế.
- Chạy contract probe trong sandbox bằng actor giả; xác minh auth boundary, payload limit, duplicate request và timeout semantics.
- Xác minh provider/model được phép cho chấm: version pinning, structured output, latency/error behavior và data-handling terms. Không ghi giá, availability hay tên endpoint khi chưa có bằng chứng trực tiếp.
- Inventory cấu trúc thật của `content/english-lab/`, quyền sử dụng, format, provenance và tiêu chí publish; repo hiện chưa có thư mục này tại thời điểm khảo sát.

## Kiểm chứng pilot và cổng phát hành

- Contract tests: forged model IDs bị từ chối; trusted actor map đúng learner; browser binding dùng token một lần; key trùng cùng payload trả cùng kết quả, payload khác bị từ chối.
- Concurrency tests: cùng bài nộp từ web/Zalo; worker crash/reclaim; outbox duplicate; delivery timeout/unknown; source/index mismatch.
- Security tests: LMS credential không đọc được clinic DB/files; upload không escape namespace; logs/secrets scan sạch; admin/override có audit.
- Recovery drill: backup trước migration, restore DB và file vào runtime mới, đối chiếu row count/checksum/referential integrity, chạy smoke journey rồi ghi RPO/RTO thực đo.
- Pilot journey: kích hoạt BS. Minh → bind web/Zalo → học → nộp → async feedback → xem cùng trạng thái ở hai kênh → nhận cập nhật không trùng.
- Go/no-go: không có lỗi cô lập dữ liệu; 100% mutation quan trọng idempotent; không blind resend; restore proof đạt RPO ≤24 giờ và RTO ≤8 giờ đã được BS. Minh duyệt; nội dung/chấm chỉ dùng source đã publish; support runbook được diễn tập.

## Bước tiếp theo

1. Hoàn tất live verification ở giai đoạn 1 và đóng băng contract version 1.
2. Chốt data model, retention và duyệt RPO/RTO với BS. Minh; sau đó lập migration/restore runbook trước implementation.
3. Dựng staging cô lập, ingest một lesson mẫu từ source được duyệt và chạy toàn bộ failure/recovery matrix trước pilot.

## Câu hỏi chưa giải quyết

- Cơ chế verified identity và delivery receipt cụ thể của OpenClaw/Zalo đang chạy là gì?
- Trong pilot một người học, ai giữ quyền vận hành cho liên kết danh tính, chỉnh rubric và manual resend khi BS. Minh cần hỗ trợ?
- Retention/xóa theo yêu cầu cho bài làm, upload và dialogue memory là bao lâu?
- Bộ nội dung `content/english-lab/` sẽ do ai sở hữu, duyệt và version hóa?
