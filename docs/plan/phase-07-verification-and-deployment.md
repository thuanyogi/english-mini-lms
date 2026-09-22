# Giai đoạn 7 — Xác minh và triển khai

## Liên kết ngữ cảnh

- [Phases 1–6](plan.md); [vận hành và nghiệm thu](operations-and-acceptance.md); [kiến trúc kỹ thuật](technical-architecture.md).
- [Hợp đồng dữ liệu/tools](data-and-tools-contract.md); [nghiên cứu kiến trúc tích hợp](research/integration-architecture-report.md).

## Tổng quan

- Ưu tiên: P1. Trạng thái: `pending`. Tiến độ: `0%`. Review: `pending`. Effort: **24–32h**.
- Chạy quality gates, security/concurrency/failure tests, recovery drill, deploy staging/production cô lập và chứng minh rollback.

## Phát hiện chính

- Test local/stub không chứng minh provider, audio, OpenClaw hoặc restore live; cần evidence theo tầng.
- Backup phải chụp DB + private files cùng checkpoint trước migration và admin bulk-data change. Mục tiêu pilot đề xuất RPO ≤24h, RTO ≤8h cần duyệt và đo thật.
- Rollback ưu tiên app image cũ với schema additive; không down-migrate phá bài đã học.

## Yêu cầu

### Chức năng

- Immutable release cho web + worker cùng revision/schema compatibility; migration job single-owner.
- Docker Compose/domain/TLS/service identities/DB/volume/secrets/network riêng; không route/credential đến clinic stores.
- Metrics/alerts cho health, queue age, dead letter, outbox unknown, auth rejects, storage, backup freshness và usage; logs redacted.
- Backup encrypted ngoài VPS, restore DB/files cùng checkpoint sang environment cô lập; áp `deletion_ledger` mới nhất trước mở dịch vụ, purge/tombstone jobs/outbox rồi integrity + smoke.
- Go/no-go report đủ auth, core, sources, five modes, AI, audio, IELTS, mobile, OpenClaw, worker, delivery, recovery và cost controls.

### Phi chức năng

- RPO/RTO chỉ ghi “đạt” sau restore rehearsal có timestamps/checksums; chưa duyệt thì là target proposal.
- Deploy không khởi động lại/kết thúc bot hoặc gateway clinic; long-running process phải ghi PID/port/workdir và cleanup đúng owner.

## Kiến trúc

- Environments local → isolated staging → production; data/secrets/domain riêng, no production content in test.
- Release sequence: backup checkpoint → migrate once → deploy app/worker → smoke → monitor; failure chọn rollback app/forward-fix/restore theo data state.
- Restore sequence: provision empty isolated target → restore DB/files same checkpoint → apply latest separate encrypted `deletion_ledger` → purge deleted data/cancel jobs/outbox → verify checksums/references/permissions → smoke → record actual RPO/RTO. Không có ledger thì service giữ đóng.
- Provider/OpenClaw outages degrade gracefully: DB/files healthy vẫn nhận bài; DB/files unhealthy không trả accepted; Zalo lỗi vẫn xem feedback web.

## Tệp mã liên quan

| Hành động | Đường dẫn đầy đủ | Nội dung dự kiến |
|---|---|---|
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/Dockerfile` | Immutable web/worker release build |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/compose.yaml` | LMS-only services, volumes, health checks |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/scripts/backup-checkpoint.sh` | Consistent DB/file checkpoint + checksum |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/scripts/restore-checkpoint.sh` | Isolated restore + integrity entrypoint |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/scripts/apply-deletion-ledger.ts` | Reapply deletions/tombstones before restore opens |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/scripts/run-migrations.sh` | Single-owner backup-gated migration |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/tests/contracts/api-v1.contract.test.ts` | Public web/tool contract matrix |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/tests/integration/concurrency-and-recovery.test.ts` | Duplicate/race/crash/tombstone tests |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/tests/e2e/pilot-readiness.spec.ts` | Full web/OpenClaw learning journey |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/docs/deployment-runbook.md` | Deploy, migration, rollback, process ownership |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/docs/backup-and-restore-runbook.md` | RPO/RTO, checkpoint, drill steps |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/docs/incident-response-runbook.md` | DB/file/provider/OpenClaw/security incidents |
| Delete | Không có | Không xóa file ở phase này |

## Các bước triển khai

1. Provision isolated staging; inject secrets; mount source read-only và private state đúng paths; verify no clinic access.
2. Chạy unit → integration PostgreSQL/worker → contract → E2E → build; lưu command, revision, exit status và report.
3. Chạy threat/failure matrix: auth bypass, traversal/SSRF, prompt injection, races, worker crash, provider timeout, outbox unknown và log/secret scan.
4. Test live audio/device, approved IELTS rubric/source và OpenClaw sandbox; stub results không thay live evidence.
5. Tạo checkpoint DB+files; restore sang target cô lập; lấy ledger độc lập mới nhất, apply/purge, kiểm jobs/outbox/tombstones rồi verify counts/hashes/references/roles và smoke; đo actual RPO/RTO. Thiếu ledger thì không mở target.
6. Rehearse migration failure: rollback app image khi schema compatible; forward-fix additive; restore chỉ từ validated checkpoint và đối soát.
7. Deploy approved immutable production release; smoke chỉ account/thread pilot; theo dõi rồi ký go/no-go.
8. Planned checks, **chưa chạy ở lượt lập plan**: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:integration`, `npm run test:e2e`, `npm run build`.

## Việc cần làm

- [ ] Full test matrix có report/revision/exit status, không hide failure.
- [ ] Live audio và IELTS source/rubric approved; five modes/four skills pass.
- [ ] Isolation test chứng minh LMS credential không đọc clinic DB/files.
- [ ] Restore drill DB+files same checkpoint đạt target đã duyệt hoặc go-live bị chặn.
- [ ] Restore drill chứng minh dữ liệu đã xóa không hồi sinh; worker/outbox không commit/gửi lại tombstoned entity.
- [ ] Rollback/forward-fix và incident contacts được diễn tập.

## Tiêu chí thành công

- Tất cả planned commands pass; security/contract/concurrency/E2E failure matrix có evidence.
- Production smoke: login/bind → approved source → session → text/voice submit → async feedback → revision → same state web/OpenClaw, không duplicate.
- Restore target chạy full smoke, checksums/references đúng, deletion ledger đã áp; actual RPO ≤24h và RTO ≤8h nếu các target này được duyệt.
- Không lỗi làm mất bài, sai người, lộ data/secret, blind resend hoặc score không có evidence; chưa đạt thì no-go.

## Rủi ro

| Rủi ro | Khả năng × tác động | Ứng phó | Rollback |
|---|---|---|---|
| Restore không đạt | Trung bình × Cao = **Cao** | Tăng tần suất/đổi backup topology và drill lại | Không go-live/pilot với dữ liệu thật |
| Shared VPS thiếu tài nguyên/cô lập | Trung bình × Cao = **Cao** | Capacity/isolation test trước production | Giữ contracts, đổi placement sau phê duyệt |
| Migration production lỗi | Thấp × Cao = Trung bình | Backup gate + rehearsal + single runner | Rollback app với additive schema; forward-fix/restore có đối soát |
| Provider/OpenClaw outage | Trung bình × Trung bình = Trung bình | Queue/persist first, web fallback, alerts | Disable integration/provider, giữ submissions và resume sau |

## Bảo mật

- Least privilege services/network/volumes; secret rotation; encrypted off-host backup; TLS và admin allowlist.
- Scan dependency/image/secrets; sanitize logs; audit binding, config/rubric, feedback override, export/delete và manual resend.
- Chỉ account/thread pilot nhận live message; không dùng patient/clinic data trong load, smoke hay demo.

## Bước tiếp theo

- Mở P8 chỉ sau signed go/no-go, retention/budget/owner được duyệt, backup/restore evidence đạt và full-scope gates không còn blocker.
