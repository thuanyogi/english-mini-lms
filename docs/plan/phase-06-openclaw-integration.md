# Giai đoạn 6 — Tích hợp OpenClaw

## Liên kết ngữ cảnh

- [Phase 1](phase-01-discovery-and-contracts.md); [Phase 4](phase-04-ai-learning-modes.md); [hợp đồng dữ liệu/tools](data-and-tools-contract.md).
- [Kiến trúc kỹ thuật](technical-architecture.md); [nghiên cứu kiến trúc tích hợp](research/integration-architecture-report.md).

## Tổng quan

- Ưu tiên: P1. Trạng thái: `pending`. Tiến độ: `0%`. Review: `pending`. Effort: **16–24h**.
- Xuất bản thin tool client và agent instructions cho OpenClaw hiện hữu. Không tạo/setup Zalo adapter, không sửa connector để né contract runtime.

## Phát hiện chính

- Transport/plugin cụ thể chỉ được chọn từ probe P1; HTTP tools là baseline logic, MCP chỉ dùng nếu runtime verified yêu cầu.
- Full actor tuple/service credential/request ID phải do runtime gắn ngoài model arguments. LMS authorize lại từng action; thiếu verified subject thì chặn mutation.
- Feedback được lưu và xem trên web độc lập; OpenClaw poll result outbox và ack delivery. Timeout sau send là `delivery_unknown`, không resend mù.

## Yêu cầu

### Chức năng

- Implement model-visible tools: profile, activities, session, source segment, hint/reveal, media, submit, feedback/reviews/progress, và 3 tools từ vựng (`get-review-words`, `save-quick-word`, `log-review-session`). Claim/ack results là bridge-only runtime endpoints, không là tool model-visible.
- Xử lý ngữ cảnh mơ hồ (Context Disambiguation): Agent không tự suy diễn khi câu hỏi thiếu ngữ cảnh; kích hoạt luồng hỏi lại để người học cung cấp câu trích hoặc định vị bài học.
- `submit-attempt` chỉ tham chiếu text/media nguyên gốc từ trusted inbound event hoặc media handle đã ingest; model không được tự viết payload rồi ghi thành bài của Minh.
- Bind full tuple `(issuer, channel, channel_account_ref, verified_subject_ref)` với learner qua flow xác minh/audit; credential/conversation không thay verified sender, không map theo display name/phone/model arg.
- Chuyển voice/image/text thành bounded media handle; tool response có opaque IDs, status, poll hint và authenticated web link.
- Bridge claim result theo bound target với unique `delivery_attempt_id`, lease owner/token/until; ack cùng attempt/token/target thành `sent/confirmed/failed/delivery_unknown`. Web luôn đọc feedback đã commit.
- Runtime skill/workflow hướng agent dùng tools đúng thứ tự; reminder chủ động mặc định tắt, chỉ có sau opt-in riêng.

### Phi chức năng

- Thin client không chứa business rules/database access. Contract version bắt buộc; allowlist operations; timeout ngắn; retry mutation chỉ với stable idempotency key.
- Không cấp shell, clinic tools/data, `docs/index/` hoặc credential Zalo cho learning agent.

## Kiến trúc

- `Zalo adapter hiện hữu → OpenClaw trusted runtime → learning agent/skills → authenticated LMS tools → shared application services`.
- Model-visible input chỉ có learning data/input handle; runtime-attached context chứa full actor tuple, actor proof, service credential, conversation và stable request ID.
- Transaction feedback + outbox; bridge-only claim theo bound target/lease, send qua channel owner rồi ack idempotently. Lease hết hạn/missing reliable receipt thành `delivery_unknown` để đối soát, không tự requeue send.
- Agent memory chỉ là hội thoại tạm; session/submission/feedback/progress lấy từ LMS mỗi lần cần source of truth.

## Tệp mã liên quan

| Hành động | Đường dẫn đầy đủ | Nội dung dự kiến |
|---|---|---|
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/src/server/integrations/openclaw/tool-client.ts` | Thin authenticated client theo contract v1 |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/src/server/integrations/openclaw/trusted-actor-context.ts` | Verify issuer/proof/binding ngoài model args |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/src/server/integrations/openclaw/result-outbox-service.ts` | Bridge-only claim lease/ack/unknown semantics |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/src/app/api/v1/tools/route.ts` | Versioned allowlisted tool endpoint nếu P1 chọn HTTP |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/tests/contracts/openclaw-tools.contract.test.ts` | Actor, idempotency, media, polling tests |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/.agents/skills/en-session-coach/SKILL.md` | Session/onboarding/tool-use instruction |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/.agents/skills/en-output-gate/SKILL.md` | Assisted/submission/feedback boundary |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/.agents/skills/en-speaking-loop/SKILL.md` | Speaking/audio loop |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/.agents/skills/en-listening-loop/SKILL.md` | Listening/reveal loop |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/.agents/skills/en-medical-page/SKILL.md` | Approved medical-source language use |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/.agents/skills/en-vocab-review/SKILL.md` | Điều phối Micro-challenge roleplay 1 câu qua Zalo & lưu từ nhanh |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/.agents/skills/en-writing-feedback/SKILL.md` | Writing/revision loop |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/.agents/skills/en-ielts-task/SKILL.md` | IELTS rubric/timer limits |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/.agents/workflows/english-lab-zalo.md` | Runtime learning flow, không phải plan workflow |
| Delete | Không có | Không xóa/sửa Zalo adapter hiện hữu |

## Các bước triển khai

1. Chọn transport/tool registration theo P1 evidence; backup runtime config trước mọi chỉnh cấu hình được duyệt.
2. Implement full actor tuple verification/binding, timestamp/audience/replay checks và per-action authorization; service credential chỉ xác thực caller, không thay verified sender.
3. Implement thin tools mapping vào shared services; validate schema/version/payload, idempotency và error mapping.
4. Implement media ingest handles và full text/image/voice contract trên account/thread test đã chỉ định.
5. Ràng buộc submit input với trusted inbound content reference; test model-generated replacement/paraphrase bị từ chối làm learner submission.
6. Implement bridge-only result claim/ack với bound target, unique attempt, opaque lease token/owner/until; test two pollers, stale lease, wrong target, timeout/crash và no-receipt reconciliation.
7. Viết eight skills (`en-session-coach`, `en-output-gate`, `en-speaking-loop`, `en-listening-loop`, `en-medical-page`, `en-vocab-review`, `en-writing-feedback`, `en-ielts-task`) + one workflow chỉ hướng hành vi/tool order; invariant vẫn do LMS enforce.
8. Register release trong runtime verified, không sửa `openclaw.json` local làm bằng chứng production.
9. Planned checks, **chưa chạy ở lượt lập plan**: `npm run test:contract -- openclaw-tools`, `npm run test:integration -- openclaw-outbox`, `npm run smoke:openclaw-sandbox`.

## Việc cần làm

- [ ] Forged/missing actor context và model-supplied role/learner ID bị từ chối.
- [ ] Model không thể thay learner text/media bằng nội dung tự sinh rồi submit dưới tên Minh.
- [ ] Cùng request/body trả cùng result; cùng key/body khác trả 409.
- [ ] Web/Zalo nhìn cùng session/submission/feedback; không có state store thứ hai.
- [ ] 3 tools từ vựng (`get-review-words`, `save-quick-word`, `log-review-session`) hoạt động đồng bộ với DB của LMS; roleplay micro-challenge qua Zalo cập nhật đúng Spaced Repetition.
- [ ] Context Disambiguation chặn đứng việc AI tự đoán mò ngữ cảnh khi câu hỏi của người học không rõ ràng.
- [ ] Delivery unknown không tự resend; support action có audit.
- [ ] Model không thấy/call được claim/ack credentials hoặc lease token; hai bridge pollers không lấy cùng event.
- [ ] Reminder không gửi khi chưa opt-in; không tạo Zalo adapter thứ hai.

## Tiêu chí thành công

- Contract tests pass cho toàn bộ tools, actor binding, payload limits, stable idempotency, media và contract version mismatch.
- Live sandbox journey: start/resume → submit verified `input_ref` text/voice → queued → bridge claim/ack result; web thấy feedback trước hoặc đồng thời, không phụ thuộc Zalo delivery.
- Duplicate inbound event không tạo submission/outbox duplicate; send timeout không tạo blind resend.
- Agent không thể gọi shell/clinic tools, đọc clinic data hoặc bypass source/assisted/IELTS/audio gates.

## Rủi ro

| Rủi ro | Khả năng × tác động | Ứng phó | Rollback |
|---|---|---|---|
| Runtime không có full verified actor tuple | Trung bình × Cao = **Cao** | Chỉ cho read-only/public-safe operation trong phạm vi đã duyệt | Chặn Zalo mutation; giữ web, không dùng credential/thread làm danh tính |
| Media/receipt thiếu | Trung bình × Cao = **Cao** | Web audio fallback; poll next turn; unknown state | Disable affected tool/capability, không build adapter mới |
| Agent dùng tool sai thứ tự | Trung bình × Trung bình = Trung bình | Skill guidance + LMS state enforcement | Thu hồi skill release, rollback runtime config backup |
| Tin trùng | Trung bình × Cao = **Cao** | Stable event ID + outbox ack/reconciliation | Dừng dispatcher, đối soát theo delivery ref, resend có audit |

## Bảo mật

- Service credential/proof chỉ ở transport/runtime secret; không lộ trong JSON, prompt, web link hoặc log.
- Allowlist account/thread pilot; rate limit; opaque conversation refs; sanitize model-visible source and feedback.
- Runtime agent privilege tối thiểu; skills không thay thế server authorization và không được đọc toàn workspace.

## Bước tiếp theo

- P7 chỉ bắt đầu khi contract/live sandbox test có evidence, runtime config có backup/rollback và không còn đường mutation tin model-provided identity.
