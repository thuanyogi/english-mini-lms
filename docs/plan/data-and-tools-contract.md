# Hợp đồng dữ liệu, API và tools

Trạng thái: thiết kế đề xuất v1; chưa có migration/endpoint chạy thật. Liên quan: [kiến trúc](technical-architecture.md), [sản phẩm](product-design.md).

## Mô hình dữ liệu

IDs nội bộ là opaque ID; timestamps UTC, hiển thị múi giờ `Asia/Ho_Chi_Minh`. Khóa ngoại và quyền kiểm ở server. Các bảng phụ có thể gộp nếu giữ được invariant dưới đây.

| Bảng/nhóm | Trường chính | Quy tắc |
|---|---|---|
| `users`, `web_sessions` | user, role, auth reference, expiry | Mật khẩu/phiên do thư viện auth quản lý; learner/admin riêng |
| `invites`, `identity_binding_requests` | token_hash, target_user/learner, purpose, expires_at, used_at, revoked_at | Consume atomic một lần; đối chiếu cả browser account và actor kênh đã xác minh |
| `learners` | user_id, goals, preferences, baseline_status, timezone | Không tự gán IELTS band/CEFR từ chat |
| `external_identities` | issuer, channel, channel_account, subject, learner_id, verified_at | Unique theo định danh kênh đầy đủ; binding có audit |
| `sources`, `source_versions` | title, owner, permission, hash, storage_key, language, review_state | `draft → reviewing → approved/rejected/retired`; chỉ approved được publish |
| `source_segments` | source_version_id, page/start/end, text/audio_ref, checksum, start_seconds, end_seconds, verified_transcript | Trích được đúng trang/đoạn; với video/audio shadowing lưu mốc giây và transcript chuẩn đã kiểm duyệt; không dùng nguồn clinic index |
| `rubric_versions` | skill, exam_variant, criteria, provenance, reviewer, state | Rubric mới không sửa kết quả cũ; official claim bị khóa |
| `activities`, `activity_versions` | mode, objectives, source_refs, rubric_ref, duration, difficulty, answer_key_ref | Content publish đóng băng phiên bản; đáp án không gửi trước thời điểm reveal |
| `learning_sessions` | learner_id, activity_version_id, target_minutes, status, version, active_seconds | Một hoạt động đang luyện chính; pause/resume lưu điều kiện thực |
| `drafts`, `session_events` | session, content_ref, version, hints/reveals/pause | Nháp cập nhật optimistic version; reveal hỗ trợ có dấu thời gian |
| `media_objects` | owner, storage_key, hash, MIME, size, duration, status | `pending → ready/failed`; chỉ ready được nộp; không nhận path người dùng tự nhập |
| `vocabulary_vault` | learner_id, phrase, ipa, context_meaning, original_sentence, source_type, source_ref, my_attempt, mastery_level, due_at, created_at, updated_at | Sổ từ ngữ cảnh dạng tuple; không lưu từ đơn lẻ không ngữ cảnh; cập nhật lịch sử Spaced Repetition |
| `vocabulary_reviews` | vocabulary_id, learner_id, review_channel, prompt_scenario, user_response, response_modality, ai_assessment, result_status, next_due_at, reviewed_at | Lịch sử ôn từ qua Web hoặc Zalo roleplay; kênh Zalo nhận text/voice micro-challenge |
| `submissions` | session_id, revision, parent_id, modality, body/media_ref, assisted, submitted_at | Immutable; sửa tạo bản mới; nguồn/ngữ cảnh khóa tại thời điểm nộp |
| `assessments` | submission_id, kind, run_version, source/rubric snapshot, state, active_job_id, result_ref | Nguồn sự thật của trạng thái đánh giá; một active run mỗi submission/kind, chuyển active trong transaction |
| `feedback_versions` | assessment_id, run_version, submission_id, rubric_version, model/run, evidence, limitations, review_state | Schema validated, không overwrite; overrides có người và lý do |
| `error_observations`, `review_items` | learner, source feedback, category, evidence, due_at, confidence | Lỗi là quan sát có thể sai; xóa khỏi thống kê khi feedback bị thu hồi |
| `jobs`, `job_attempts` | type, input_ref, state, lease, tries, next_at, cost_units | Unique logical job, claim transaction, retry hữu hạn |
| `idempotency_records` | actor, operation, key, request_hash, response_ref | Cùng key/body trả cùng kết quả; khác body 409 |
| `outbox_events`, `delivery_attempts` | event_id, result_ref, bound_target, state, attempt_id, lease_owner/until, receipt | Gửi do OpenClaw thực hiện; claim/ack runtime-only, không giữ credential Zalo |
| `deletion_ledger` | opaque subject/entity IDs, requested/committed_at, purge_state | Giữ tối thiểu lâu hơn backup dài nhất; lưu riêng để áp lại sau restore |
| `audit_events`, `usage_events` | actor_ref, action, entity, timestamp, usage | Không chứa secret/toàn bài; export và xóa có kiểm soát |

`progress` là view/projection từ session, submission và feedback; có thể rebuild. Số phút, số bài, năng lực quan sát được và kết quả IELTS là các chỉ số riêng. Không có công thức đổi số bài hoàn thành sang band.

## Trạng thái học và chấm

Session: `ready → active ↔ paused → completed/abandoned`. Chỉ hoàn thành khi có submission, kết quả/nhận xét đã xem hoặc xác nhận chưa thể chấm, và bước kết thúc được người học xác nhận. Việc bỏ dở không bị biến thành hoàn thành. Đến hạn 30/45 phút pause hoặc lưu kết thúc; timer thi chốt bản riêng.

Assessment: `queued → processing → needs_input | feedback_ready | failed`. Bảng `assessments` giữ trạng thái này; `jobs` chỉ giữ trạng thái thực thi task. Các task STT/OCR → validate evidence → evaluate có dependency theo `assessment_id`, không chạy chấm khi prerequisite chưa thành công. Người học sửa tạo submission/revision mới và assessment mới. Feedback cũ vẫn xem được nhưng không bị dùng lẫn với bản sửa. Source/rubric bị thu hồi thì đánh dấu feedback liên quan cần xem lại.

Job: `queued → leased → succeeded | retry_wait | dead_letter | cancelled`. Lease hết hạn có thể claim lại; giới hạn thử mặc định 3 với backoff, còn ngân sách mới retry. Lịch sử assessment unique trên `(submission_id, assessment_kind, run_version)`; partial unique chỉ cho một active run trên `(submission_id, assessment_kind)`. Đánh giá lại cấp run_version mới, giữ rubric snapshot của run đó; chuyển active trong transaction. Feedback tham chiếu `assessment_id/run_version`, commit idempotent theo job/run. Không để hai worker cùng ghi hai kết quả active.

## API công khai của LMS cho web

Mọi route dưới `/api/v1` đều qua auth, role và ownership; health công khai chỉ báo readiness tổng quát.

Ngoại lệ auth được công khai nhưng rate-limit: activate/login/recovery theo thư viện auth đã chọn. `POST /auth/activate` consume invite token hash + purpose + expiry atomically, thiết lập credential/phiên rồi vô hiệu token. `POST /identity-bindings/start` yêu cầu web session hợp lệ; `POST /identity-bindings/complete` chỉ cho trusted runtime với actor đã kiểm chứng và token binding một lần. `DELETE /identity-bindings/:id` yêu cầu re-auth/admin đã được phép và audit. Invite và binding là hai purpose/token riêng, không dùng link học để đăng nhập hoặc tự liên kết tài khoản. Admin phát hành/revoke invite qua API quản trị riêng; không có public signup.

| Method/path | Input/response tối thiểu | Quyền/hành vi |
|---|---|---|
| `GET /me` | learner + preferences | Không truyền learner ID tùy ý |
| `GET /activities` | filters → approved metadata | Không trả answer key |
| `POST /sessions` | activity_id, target_minutes, idempotency → session_id/version | Gắn actor từ auth |
| `GET /sessions/:id` | state + current draft + permitted source | Kiểm owner mỗi lần |
| `PATCH /sessions/:id/draft` | body, expected_version → version | 409 giữ nháp local khi conflict; không last-write-wins âm thầm |
| `POST /sessions/:id/events` | pause/resume/hint/reveal/finish, version | Server quản thời điểm reveal và assisted |
| `POST /media` | bounded binary metadata/upload → media_id | Tệp được xác thực type/size và ghi private |
| `POST /sessions/:id/submissions` | text hoặc ready media IDs, expected_version, parent | Transaction submission + assessment job; 202 + submission_id |
| `GET /submissions/:id` | immutable answer + assessment status | Pending không trả điểm giả |
| `GET /submissions/:id/feedback` | valid feedback + limitations | Không leak rubric answer key của bài chưa nộp khác |
| `GET /vocabulary` | filters (topic, mastery, due) → vocabulary items | Lấy danh sách sổ từ vựng theo ngữ cảnh của learner |
| `POST /vocabulary/quick-capture` | selected_text, surrounding_text, source_ref → suggested tuple | AI trích câu ngữ cảnh, tra IPA, nghĩa chuyên ngành cơ xương khớp và câu mẫu để người học bấm lưu 1-click |
| `POST /vocabulary` | phrase, ipa, context_meaning, original_sentence, source_ref, my_attempt | Lưu chính thức vào Vocabulary Vault |
| `PATCH /vocabulary/:id` | context_meaning, notes, mastery_level | Chỉnh sửa ghi chú cá nhân hoặc đánh dấu đã thuộc |
| `GET /vocabulary/due` | limit → due items for spaced repetition | Lấy các từ đến hạn ôn để hiển thị dashboard hoặc cấp cho Zalo |
| `GET /progress`, `GET /reviews` | aggregates + evidence links | Phân biệt independent/assisted, sufficient/insufficient evidence |
| `POST /feedback/:id/review-request` | reason | Giữ feedback gốc; gắn cờ, quản trị hỗ trợ theo quyền |
| `POST /admin/sources`, `POST /admin/activities/:id/publish` | source manifest / approved version | Chỉ admin; source/rubric chưa duyệt trả 422 |
| `POST /me/export`, `POST /me/deletion-request` | confirmation | Job có audit; xóa thực hiện theo chính sách và xác nhận cụ thể |

Mã lỗi: `401/403` thiếu quyền; `409` version/idempotency conflict; `413` quá giới hạn; `422` source/media/rubric chưa sẵn sàng; `429` rate/budget limit; `503` dependency unavailable. Không báo “đã lưu” khi DB/upload thất bại.

## Tools cho agent OpenClaw

Đề xuất tool names model được gọi:
- Nhóm phiên học & bài tập: `learning.get-profile`, `learning.list-activities`, `learning.start-session`, `learning.get-session`, `learning.get-source-segment`, `learning.request-hint`, `learning.reveal-support`, `learning.ingest-media`, `learning.submit-attempt`, `learning.get-feedback`, `learning.list-reviews`, `learning.get-progress`.
- Nhóm sổ từ vựng & ôn tập ngữ cảnh (3 Tools trọng tâm):
  1. `learning.get-review-words`: Input `{ limit: number }`. Lấy danh sách 2–3 từ/cụm từ đến hạn ôn tập (`due_at <= now()`) kèm câu gốc và ngữ cảnh để agent tạo prompt nhập vai (Micro-challenge Roleplay).
  2. `learning.save-quick-word`: Input `{ word: string, context_sentence: string, source_note?: string }`. Cho phép anh Minh nhắn trên Zalo *"Lưu giúp tôi cụm 'post-operative rehabilitation' vào sổ nhé"* -> Agent trích xuất câu ngữ cảnh và lưu thẳng về LMS.
  3. `learning.log-review-session`: Input `{ word_id: string, user_response_type: 'voice' | 'text', ai_assessment: string, is_correct: boolean }`. Ghi nhận kết quả sau khi anh Minh hoàn thành lượt roleplay trên Zalo, tính toán mốc `next_due_at` theo thuật toán Spaced Repetition.

Model chỉ yêu cầu tra kết quả; `learning.poll-results`/`learning.claim-results` và `learning.ack-delivery` thuộc bridge runtime, không lộ quyền claim/ack cho model.

**Xử lý ngữ cảnh mơ hồ trên Zalo (Context Disambiguation):**
Nếu anh Minh hỏi trên Zalo câu mơ hồ kiểu *"Từ này nghĩa là gì?"* mà không kèm câu trích hoặc không trong phiên học cụ thể:
- Agent không được tự suy diễn hoặc đoán nội dung anh đang xem trên website khác.
- Agent kích hoạt giao thức làm rõ: nhẹ nhàng hỏi lại câu văn hoặc bài học cụ thể mà anh vừa bắt gặp từ đó, hoặc đề nghị anh dán cả câu chứa từ đó để giải thích chính xác theo ngữ cảnh chuyên môn.

Tools gọi các domain services/API ở trên. Transport là extension/HTTP tools phù hợp bản OpenClaw đang có, chốt trong P1. Không mặc định phải xây MCP server. Nếu OpenClaw chỉ có MCP phù hợp thì bọc đúng các thao tác trên, không thêm backend nghiệp vụ thứ hai.

Phần **model thấy** chỉ có tham số học như activity/session và input/media handle. Phần **runtime gắn** gồm service credential, actor subject đã xác minh, channel account, conversation, request ID, timestamp/proof. LMS bỏ qua/khước từ actor hay role được nhét trong model args.

`learning.submit-attempt` chỉ nhận `input_ref` trỏ tới text/voice gốc của người học đã được bridge ghi từ inbound event, hoặc media handle có cùng provenance. Bridge ghi checksum, event ID và tác giả từ metadata tin cậy trước khi model xử lý; model không được thay body hay tự tạo `input_ref` mang tác giả người học. Text agent viết là nội dung hỗ trợ, không thành submission của Minh. Bài viết trên web nhận trực tiếp từ phiên đăng nhập của Minh. Đây là kiểm tra bắt buộc để thực thi nguyên tắc không làm hộ, không chỉ lời nhắc trong skill.

Ví dụ hợp đồng logic, không phải OpenClaw config thật:

```json
{
  "contract_version": "1",
  "operation": "learning.submit-attempt",
  "trusted_context": {
    "issuer": "openclaw-learning-runtime",
    "channel": "zalo",
    "channel_account_ref": "opaque-channel-account",
    "verified_subject_ref": "opaque-bound-subject",
    "conversation_ref": "opaque-learning-thread",
    "request_id": "stable-inbound-event-id",
    "issued_at": "2026-09-19T05:00:00Z"
  },
  "input": {
    "session_id": "session_example",
    "expected_version": 3,
    "input_ref": "verified_learner_input_example"
  }
}
```

Service credential và proof đi trong transport/header, không ở JSON do model tạo. `issuer + channel + channel_account_ref + verified_subject_ref` là tuple binding bắt buộc, cùng timestamp hợp lệ/chống replay và audience đúng LMS. Credential chỉ xác thực caller, không thay cho danh tính người học. Thiếu verified subject phải chặn mutation Zalo. Nếu runtime không có stable event ID, bridge tạo event token lưu bền vững từ metadata đã kiểm chứng trước khi gọi model; không hash nội dung rồi coi hai tin giống nhau là cùng một lần nộp.

Response nhận bài gồm `request_id`, `submission_id`, `status: accepted`, `assessment_status: queued`, `poll_after_seconds`, link web yêu cầu đăng nhập. Link không chứa session token đăng nhập lâu dài, PII hoặc credential.

## Phản hồi có cấu trúc

Mỗi feedback gồm: `submission_id`, `rubric_version`, `assessable_dimensions`, `observations[]` (vị trí, câu/đoạn, lý do, gợi ý sửa), `strengths`, `next_action`, `limitations`, `model_run_ref`, `created_at`. `scores` là nullable và mang loại `practice_estimate`, rubric/dimension, điều kiện bài; không có trường để model đặt `official_ielts_result`.

Audio lỗi/không có thì pronunciation `not_assessable`; OCR mờ thì translation fidelity `needs_source_confirmation`. Output provider không đúng schema không được ghi thành feedback tốt; chuyển retry/review. Prompt/rubric/version được lưu để truy vết; không ghi chain-of-thought nội bộ.

## Idempotency, đồng thời và kết quả đến muộn

- Idempotency scope `(actor, operation, request_id)`; giữ tối thiểu 30 ngày ở pilot, lưu liên kết submission bền vững lâu bằng bài nộp. Khoảng retry thực tế được kiểm ở P1; không xóa dấu request còn có thể replay.
- Hai kênh sửa cùng draft dùng expected_version; bên thua thấy bản mới và giữ local draft để tự hòa giải. Hai lần nộp cùng event trả cùng submission; hai nộp có chủ ý tạo revision khác sau kiểm parent/version.
- Chấm bám submission immutable. Nếu đang chấm bản 1 mà Minh nộp bản 2, bản 1 vẫn ghi đúng lịch sử, không chuyển thành feedback của bản 2.
- Khi xóa bài/hồ sơ, đặt tombstone và hủy jobs; worker/outbox kiểm tombstone trước commit/gửi để không tái tạo dữ liệu đã xóa.

## Outbox và giao tin OpenClaw

Kết quả được lưu và xem trên web độc lập với gửi Zalo. OpenClaw polling khi thread đang hoạt động hoặc dùng hook/lịch nội bộ nếu khả năng đã xác minh; chưa hỗ trợ background thì phản hồi trạng thái và link web, lần nhắn sau đọc tiếp kết quả.

Trạng thái outbox: `pending → claimed → sent/confirmed | failed | delivery_unknown`. Mốc `confirmed` chỉ khi có receipt đủ tin cậy; timeout hoặc crash sau gọi send là `delivery_unknown`, không tự gửi lại mù. Event đã `claimed` hết lease nhưng chưa có receipt cũng vào unknown trước đối soát. Tin kết quả là trả lời phiên đang học; nhắc học chủ động là một tính năng opt-in riêng.

Bridge-only `POST /bridge/results/claim` nhận `limit`, actor/thread đã xác minh; transaction claim chỉ những event đúng bound target và chưa claim. Trả `event_id`, `delivery_attempt_id`, opaque lease token, `lease_until`, result payload. `POST /bridge/results/:id/ack` bắt buộc cùng attempt/token/lease owner và bound target, status `sent|confirmed|failed|delivery_unknown`; receipt và provider message ref nếu có. Ack idempotent; stale lease/khác thread trả 409/403. Hai poller không lấy cùng lease. Hết lease không tái queue send tự động; đối soát trước. Credential claim/ack chỉ cấp runtime, không nằm trong tool model-visible.

## Hợp đồng nội dung bên thứ ba và Media nhúng

### Giới hạn kỹ thuật và giải pháp cho Video/Audio Shadowing
- **YouTube Iframe Player API:** Hỗ trợ phát, tạm dừng, chuyển tới mốc giây (`seekTo(seconds)`), và thay đổi tốc độ phát. Dùng để nhúng video mẫu trên Web LMS cho bài luyện nghe và Shadowing.
- **Giới hạn Caption của YouTube API:** API chính thức `captions.download` (YouTube Data API v3) yêu cầu quyền sở hữu kênh/video ủy quyền (OAuth scope). Ứng dụng bên thứ ba không thể tự ý tải phụ đề gốc của video bất kỳ. Do đó:
  - **Với MVP (24 bài tuyển chọn):** Bắt buộc lưu `verified_transcript` và mốc thời gian (`start_seconds`, `end_seconds`) vào bảng `source_segments` trong DB của LMS sau khi đã được curator thẩm định. Không gọi API phụ đề ngoài lúc runtime.
  - **Với link do người học tự cung cấp (Phase mở rộng):** Xử lý qua pipeline trích xuất audio/Whisper STT có kiểm duyệt, hoặc chỉ chấp nhận video có sẵn phụ đề chuẩn (CC) đã được công khai trên giao diện web.
- **Quy tắc bảo vệ bản quyền:** LMS chỉ lưu trữ siêu dữ liệu (metadata), link tham chiếu, mốc thời gian và transcript văn bản phục vụ học tập. Không lưu bản sao video/audio của bên thứ ba trái phép vào storage của hệ thống.

## Thời hạn lưu đề xuất cho pilot

| Dữ liệu | Mặc định đề xuất | Cần làm |
|---|---|---|
| Bài/feedback/voice | 90 ngày trước khi cùng Minh rà soát giữ/xóa | Cài configurable; không tự xóa khi chưa báo trước |
| Log vận hành redacted | 30 ngày | Không payload bài làm/credential |
| File tạm upload lỗi | 24 giờ | Chỉ xóa unreferenced sau audit/check |
| Backup mã hóa | 30 ngày luân phiên | Lưu ngoài máy chủ chính; xóa yêu cầu có độ trễ được thông báo |
| Nguồn học có bản quyền | Theo quyền đã được ghi | Không copy nội dung sang shared index/public bucket |

Các mốc trên cần Minh duyệt trước thu dữ liệu thật. Mỗi lệnh migration hoặc chỉnh dữ liệu quản trị hàng loạt phải có backup/restore point trước; request học bình thường dùng transaction và cơ chế backup định kỳ.

Trước pilot, chốt `expire_at`, thời gian báo trước/gia hạn và hard-delete policy trong cài đặt được duyệt; mặc định 90 ngày là mốc rà soát, chưa phải lệnh xóa tự động. Khi yêu cầu xóa được xác nhận: tombstone ngay, hủy job và chặn outbox; purge online trong 7 ngày (đề xuất), backup hết vòng tối đa 30 ngày. `deletion_ledger` giữ opaque tombstone tối thiểu 60 ngày, ít nhất dài hơn mọi backup còn giữ; bản mã hóa riêng được đối soát trước restore. Restore backup cũ phải áp ledger mới nhất, purge dữ liệu đã xóa và kiểm job/outbox trước khi mở truy cập. Nếu chưa truy cập được ledger thì giữ dịch vụ đóng, không phục hồi công khai với dữ liệu cũ.

## Còn mở

Provider/auth adapter/runtime transport cụ thể; khả năng receipt; TTL file OpenClaw; nguồn IELTS; các giới hạn thực tế trên điện thoại và chính sách lưu Minh chấp thuận. P1 có test hợp đồng để chốt các lựa chọn này.
