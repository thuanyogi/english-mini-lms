# Giai đoạn 4 — Các chế độ học và AI

## Liên kết ngữ cảnh

- [Phase 3](phase-03-library-and-learning-core.md); [thiết kế sản phẩm](product-design.md); [hợp đồng dữ liệu/tools](data-and-tools-contract.md).
- [Kiến trúc kỹ thuật](technical-architecture.md); [nghiên cứu trải nghiệm học](research/learning-experience-report.md).

## Tổng quan

- Ưu tiên: P1. Trạng thái: `pending`. Tiến độ: `0%`. Review: `pending`. Effort: **32–48h**.
- Xây worker/provider pipeline và năm mode: speaking, listening, đọc–dịch y, writing thực tế, IELTS; đủ bốn kỹ năng và vòng làm–feedback–sửa.

## Phát hiện chính

- AI được giải thích, hướng dẫn, đưa hint/ví dụ khác trước nộp; không được tự tạo/nộp bài mang tên Minh.
- Pronunciation cần audio thật; transcript-only là `not_assessable`. IELTS cần rubric/source/version đã duyệt; estimate không phải band chính thức.
- Một mode end-to-end chạy sớm là milestone kiểm chứng, không phải full scope complete.

## Yêu cầu

### Chức năng

- Provider interface cho structured text feedback, STT/OCR/audio analysis theo capability P1; timeout/backoff/budget guardrails.
- `assessments` là canonical assessment state; worker tasks chỉ thực thi STT/OCR → validate evidence → evaluate theo dependency. Worker load submission + pinned source/rubric, validate output, rồi ghi feedback + outbox atomically.
- Mỗi mode tạo đúng evidence: audio/transcript/re-record; nghe trước transcript; page-linked translation; draft/revision; IELTS timed conditions.
- Dùng inventory 24 hoạt động đề xuất (4 speaking, 4 listening, 4 đọc–dịch y, 4 writing, 8 IELTS/2 mỗi kỹ năng) làm acceptance matrix; chỉ chạy activity có source/rubric/quyền đã approved. Công mua/biên tập đầy đủ không nằm trong effort dev.
- Feedback append-only gồm evidence location, issue, explanation, short example, next action, limitations, run/rubric refs; review/override có lý do.
- Error observations/review scheduling loại bỏ feedback đã thu hồi; không suy medical advice từ bài đọc y khoa.

### Phi chức năng

- Provider output invalid không thành feedback tốt; retry hữu hạn rồi `needs_input`, review hoặc failed.
- Cost/latency/usage theo job, không lưu chain-of-thought; prompt/rubric/version truy vết được.

## Kiến trúc

- `submission → assessment (canonical) → dependent jobs STT/OCR/evaluate → mode evaluator → provider adapter → schema validator → feedback version + error observations + outbox`.
- Mode evaluator chỉ chọn evidence/rubric và build bounded input; domain service giữ authorization, state, assisted và score types.
- Audio live gate: record/playback, duration/checksum, STT uncertainty, re-record và `not_assessable` phải chạy trên thiết bị thật.
- IELTS gate: exam variant + approved rubric/source bắt buộc; full mock optional, lịch riêng ngoài phiên 30–45 phút, không chia nhỏ rồi gọi full mock.

## Tệp mã liên quan

| Hành động | Đường dẫn đầy đủ | Nội dung dự kiến |
|---|---|---|
| Create | `src/server/providers/assessment-provider.ts` | Provider-neutral structured assessment interface |
| Create | `src/server/assessment/feedback-schema.ts` | Validate feedback, limitations và score type |
| Create | `src/server/assessment/speaking-evaluator.ts` | Audio/transcript/retry evidence |
| Create | `src/server/assessment/shadowing-evaluator.ts` | Đối chiếu audio với verified transcript mốc giây, chấm phát âm/intonation |
| Create | `src/server/assessment/vocab-roleplay-evaluator.ts` | Tạo kịch bản micro-challenge 1 câu và chấm cách dùng từ ngữ cảnh thật |
| Create | `src/server/assessment/listening-evaluator.ts` | Answer-before-transcript semantics |
| Create | `src/server/assessment/medical-translation-evaluator.ts` | Source fidelity, language-only boundary |
| Create | `src/server/assessment/writing-evaluator.ts` | Draft/revision focused feedback |
| Create | `src/server/assessment/ielts-evaluator.ts` | Approved rubric, timed/practice estimate only |
| Create | `src/server/media/audio-evidence-service.ts` | Live audio validation và assessability |
| Create | `src/worker/assessment-worker.ts` | Claim, evaluate, commit feedback/outbox |
| Create | `db/migrations/0003-assessment-feedback.sql` | Canonical assessments, dependent jobs, rubrics, feedback, errors, outbox |
| Create | `tests/integration/learning-modes.test.ts` | Mode gates, schema, retries, revision tests |
| Delete | Không có | Không xóa file ở phase này |

## Các bước triển khai

1. Chốt structured feedback schema, provider capability matrix và budget/error policy từ evidence P1.
2. Implement canonical assessment state machine; tạo dependent jobs theo `assessment_id`, không evaluate trước khi media/STT/OCR prerequisite thành công. Re-grade tăng `run_version`, giữ snapshot; historical unique theo submission/kind/run, partial unique chỉ một active run và chuyển active trong transaction.
3. Implement worker orchestration; tombstone/version check trước commit; feedback và outbox cùng transaction.
4. Dựng một vertical slice mode ít rủi ro để kiểm chứng toàn vòng; ghi rõ milestone, không đổi definition full scope.
5. Mở rộng speaking/listening với live audio, STT uncertainty và replay; không chấm pronunciation từ text. Triển khai Shadowing evaluator bám sát verified transcript của đoạn clip 30–60s đã thẩm định.
6. Implement medical reading/translation và writing, giữ source locator, original/revision, phản tư thay đổi. Triển khai Vocab roleplay evaluator cho các thử thách ôn từ nhanh qua Zalo.
7. Implement IELTS bốn kỹ năng chỉ với approved source/rubric; practice estimate có limitation; kết quả thi xác minh bên ngoài là dữ liệu riêng, model không tạo nhãn chính thức.
8. Thêm review request, human override/withdraw và rebuild error/progress projections.
9. Planned checks, **chưa chạy ở lượt lập plan**: `npm run test:integration -- learning-modes`, `npm run test:worker`, `npm run test:audio-device`.

## Việc cần làm

- [ ] Mỗi mode có fixture từ source đã duyệt và expected evidence.
- [ ] 24 activity slots có trạng thái/source owner; slot thiếu nguồn không được AI tự bù hoặc publish.
- [ ] Hint/reveal trước nộp tạo `assisted`; giải thích/ví dụ khác vẫn được phép.
- [ ] Invalid provider output, timeout, stale job và duplicate worker commit được test.
- [ ] Assessment state không suy từ job; dependency failure không chạy evaluate hoặc ghi feedback giả.
- [ ] Re-grade giữ mọi run cũ; feedback trỏ đúng assessment/run; không có hai active runs cho cùng submission/kind.
- [ ] Feedback withdrawn không còn đóng góp progress/error schedule.
- [ ] Shadowing evaluation đối chiếu trực tiếp với verified transcript đã thẩm định trong DB, không phụ thuộc YouTube caption API lúc runtime.
- [ ] Vocab roleplay evaluator tạo được tình huống thực tế bám sát chuyên môn và chấm đúng độ tự nhiên của câu trả lời.
- [ ] Live audio và IELTS rubric/source gate được ký duyệt trước full-scope pass.

## Tiêu chí thành công

- Năm mode chạy end-to-end; đủ L/S/R/W; mỗi feedback tham chiếu immutable submission và pinned source/rubric.
- Speaking/listening thiếu audio trả `not_assessable`/`needs_input`, không tạo score giả; live device record/playback/re-record pass.
- IELTS không có source/rubric/variant duyệt trả 422; không có field cho model ghi `official_ielts_result`.
- Worker crash/reclaim, provider timeout, schema invalid, stale revision và duplicate completion pass integration tests.

## Rủi ro

| Rủi ro | Khả năng × tác động | Ứng phó | Rollback |
|---|---|---|---|
| AI feedback sai/tự tin quá mức | Cao × Cao = **Cao** | Evidence + limitations + sampling/human review | Withdraw version, rebuild projection, pin/disable provider revision |
| Audio/STT không đủ chất lượng | Trung bình × Cao = **Cao** | Uncertainty + confirmation + web fallback | Giữ artifact, không chấm dimension; chặn full scope |
| Rubric IELTS thiếu/sai | Cao × Cao = **Cao** | Publish gate + reviewer/version | Tắt IELTS scoring, giữ generic practice không gắn band |
| Chi phí/latency vượt budget | Trung bình × Trung bình = Trung bình | Bounded input, usage event, rate/budget limit | Pause provider jobs, không mất submission; resume sau phê duyệt |

## Bảo mật

- Provider chỉ nhận đoạn tối thiểu; không secret, raw channel identity, clinic/patient data hoặc toàn bộ thư viện.
- Sanitize output trước UI; coi source/submission là untrusted data, chặn prompt-to-tool escalation.
- Egress worker allowlist; media qua handle nội bộ, không tải URL tùy ý do model/source cung cấp.

## Bước tiếp theo

- Cung cấp service contract ổn định cho P5; sau full mode contract, mở P6 tools/OpenClaw. Không gọi milestone một mode là MVP hoàn chỉnh.
