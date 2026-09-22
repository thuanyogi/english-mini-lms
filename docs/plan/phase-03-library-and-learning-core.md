# Giai đoạn 3 — Thư viện và lõi học tập

## Liên kết ngữ cảnh

- [Phase 2](phase-02-foundation-auth-and-storage.md); [thiết kế sản phẩm](product-design.md); [hợp đồng dữ liệu/tools](data-and-tools-contract.md).
- [Kiến trúc kỹ thuật](technical-architecture.md); [nghiên cứu trải nghiệm học](research/learning-experience-report.md).

## Tổng quan

- Ưu tiên: P1. Trạng thái: `pending`. Tiến độ: `0%`. Review: `pending`. Effort: **24–32h**.
- Xây nguồn đã duyệt, activity/version, learning session, draft, submission/revision, job và progress projection dùng chung cho web/OpenClaw.

## Phát hiện chính

- `content/english-lab/` là nguồn học duy nhất; source/rubric chưa duyệt không được publish.
- Submission và feedback là append-only; progress là projection có thể rebuild, không phải điểm tự gán từ số ngày/bài.
- AI được dạy và gợi ý trước nộp; xem lời giải chính bài đang làm phải tạo reveal event và đánh dấu `assisted` server-side.

## Yêu cầu

### Chức năng

- Import manifest, source/version/segment, provenance, permission, checksum, review state; index LMS riêng.
- Upload trang/tài liệu người học giữ trong private artifacts và `pending_review`; muốn thành source phải được authorized curator đưa vào `content/english-lab/` kèm manifest/hash/review rồi mới đồng bộ/publish.
- Author/publish activity version với objective, mode, duration, difficulty, source/rubric và answer reveal policy.
- Inventory pack khởi đầu **đề xuất** 24 hoạt động: 4 speaking, 4 listening, 4 đọc–dịch y, 4 writing, 8 IELTS (2 mỗi kỹ năng). Đây là scope biên tập để lập kế hoạch, không khẳng định source/rubric đã có; thiếu nguồn có quyền thì activity giữ `draft/not_ready`.
- Start/pause/resume/finish learning session 30/45 phút; optimistic version; lưu nháp và hint/reveal events.
- Sổ từ vựng ngữ cảnh (Vocabulary Vault): lưu trữ tuple (từ + IPA + nghĩa ngữ cảnh + câu gốc + nguồn/locator + câu tự dùng + Spaced Repetition status); hỗ trợ endpoint lấy từ đến hạn ôn và preview 1-Click capture.
- Hỗ trợ phân đoạn media cho bài Shadowing/Listening: `source_segments` lưu `start_seconds`, `end_seconds` và `verified_transcript` đã được curator thẩm định.
- Submission immutable, revision liên kết parent, `assisted` do server tính; submission + canonical assessment record + first job trong một transaction.
- Progress/review projection dẫn link về bằng chứng, phân biệt independent/assisted và sufficient/insufficient evidence.

### Phi chức năng

- Import repeatable theo checksum; không ghi ngược source; không index clinic hoặc private learner artifacts vào source index.
- API `/api/v1` kiểm role/owner và trả 409/413/422/429/503 đúng contract; không báo lưu thành công khi transaction fail.

## Kiến trúc

- Pipeline: approved manifest → private runtime copy → validate/segment/index → admin review → immutable published activity version.
- Command services cho session/draft/event/submission; query services cho library/progress/reviews; cùng được web và tools gọi.
- `POST submission` khóa session/version, xác minh media `ready`, ghi submission + canonical assessment record + first job + event atomically.
- Recommendation v1 là rule giải thích được: bài dở/bài sửa → lỗi đến lượt → kỹ năng ít luyện → khớp thời lượng/nguồn/độ khó; người học được đổi.

## Tệp mã liên quan

| Hành động | Đường dẫn đầy đủ | Nội dung dự kiến |
|---|---|---|
| Create | `src/server/library/source-import-service.ts` | Validate manifest, provenance, checksum, segments |
| Create | `src/server/library/activity-publication-service.ts` | Review/publish immutable activity version |
| Create | `src/server/learning/session-service.ts` | Session state machine và events |
| Create | `src/server/learning/submission-service.ts` | Immutable submissions/revisions + transactional job |
| Create | `src/server/learning/vocabulary-service.ts` | Quản lý Vocabulary Vault, Spaced Repetition, 1-Click capture preview |
| Create | `src/server/learning/progress-projection.ts` | Evidence-backed progress/review due |
| Create | `src/server/learning/recommendation-rules.ts` | Quy tắc gợi ý giải thích được |
| Create | `src/app/api/v1/sessions/route.ts` | Start/list sessions qua services |
| Create | `src/app/api/v1/sessions/[session-id]/submissions/route.ts` | Submit text/media idempotently |
| Create | `src/app/api/v1/vocabulary/route.ts` | CRUD Vocabulary Vault và danh sách từ đến hạn ôn |
| Create | `src/app/api/v1/vocabulary/quick-capture/route.ts` | Endpoint trích xuất ngữ cảnh và gợi ý cho 1-Click capture |
| Create | `db/migrations/0002-learning-core.sql` | Sources, segments (start/end/transcript), activities, sessions, submissions, vocabulary_vault, vocabulary_reviews |
| Create | `scripts/import-approved-sources.ts` | Controlled import, dry-run, report |
| Create | `tests/integration/library-learning-core.test.ts` | State/transaction/provenance tests |
| Delete | Không có | Không xóa file ở phase này |

## Các bước triển khai

1. Thêm additive migration, constraints và state transitions; tạo backup/checkpoint trước migrate.
2. Implement source import dry-run; reject path ngoài source root, permission thiếu, checksum mismatch và unapproved publish.
3. Implement curator flow: private upload không tự thành source; chỉ manifest đã duyệt dưới `content/english-lab/` mới đi vào runtime source/index.
4. Implement activity authoring/version/publish, answer locking và source/rubric pinning.
5. Lập inventory 24 activity slots đề xuất; map từng slot tới source/rubric/owner/review gate, không tự lấp bằng nguồn ngoài hoặc nhãn chính thức.
6. Implement session/draft/event services với expected version; timer lưu active time, pause không biến thành completed.
7. Implement immutable submission/revision; xác định `assisted` từ hint/reveal events; enqueue assessment cùng transaction.
8. Implement progress/recommendation projection và rebuild command; không quy đổi completion thành IELTS band.
9. Planned checks, **chưa chạy ở lượt lập plan**: `npm run test:integration -- library-learning-core`, `npm run import:sources -- --dry-run`, `npm run test:contract`.

## Việc cần làm

- [ ] Source/segment/activity truy ngược được tới manifest, version, location và reviewer.
- [ ] Private upload không tự publish/index; curator path vào `content/english-lab/` có manifest/hash/audit.
- [ ] Inventory 24 activity slots hiển thị rõ ready/not-ready; không coi hai PDF hiện có là đủ pack.
- [ ] Answer key/transcript bị khóa tới đúng reveal condition.
- [ ] Bảng `vocabulary_vault` và `vocabulary_reviews` hỗ trợ lưu ngữ cảnh đầy đủ và tính toán lịch Spaced Repetition chính xác.
- [ ] Phân đoạn Shadowing lưu trữ đủ `start_seconds`, `end_seconds` và `verified_transcript` đã thẩm định.
- [ ] Nộp trùng cùng key trả cùng submission; key cũ/body khác trả 409.
- [ ] Revision không ghi đè bản trước; progress rebuild cho cùng kết quả.
- [ ] Không có path/import/index chạm `docs/index/`.

## Tiêu chí thành công

- Integration tests pass cho publish gate, pause/resume, optimistic conflict, hint/reveal/assisted và transaction rollback.
- Import dry-run báo rõ accepted/quarantined/rejected, không sửa source và không tạo record khi validation fail.
- API ownership tests chứng minh learner chỉ đọc/sửa entity của mình; admin action có audit.
- Progress hiển thị evidence links và không tuyên bố band/năng lực khi bằng chứng thiếu.

## Rủi ro

| Rủi ro | Khả năng × tác động | Ứng phó | Rollback |
|---|---|---|---|
| OCR/segment sai | Cao × Trung bình = **Cao** | Quarantine, page locator, human review | Retire source version; giữ lịch sử, rebuild index/projection |
| Race web/Zalo | Trung bình × Cao = **Cao** | Expected version + idempotency | Trả current state, giữ local draft; không last-write-wins |
| Publish nhầm nguồn | Thấp × Cao = Trung bình | Hai trạng thái review/publish, immutable version | Retire version; chặn bài mới, đánh dấu feedback cần review |
| Migration/data import lỗi | Trung bình × Cao = **Cao** | Dry-run + backup trước bulk change | Rollback app với schema additive; restore checkpoint nếu dữ liệu sai |

## Bảo mật

- Source parser coi tài liệu là data, không thực thi instruction/macro/URL; chặn traversal, symlink và SSRF.
- Answer key/rubric không lộ qua activity list, log hoặc client payload trước reveal.
- Artifact người học không trở thành source/index; audit import, publish, retire và manual override.

## Bước tiếp theo

- Khi core contracts/tests pass, P4 xây assessment/modes; P5 có thể bắt đầu UI trên contract đã freeze, không sửa service cùng lúc.
