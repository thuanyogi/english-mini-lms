# Giai đoạn 2 — Nền tảng, auth và lưu trữ

## Liên kết ngữ cảnh

- [Phase 1](phase-01-discovery-and-contracts.md); [kiến trúc kỹ thuật](technical-architecture.md); [hợp đồng dữ liệu/tools](data-and-tools-contract.md).
- [Cơ sở và quyết định](evidence-and-decisions.md); [nghiên cứu kiến trúc tích hợp](research/integration-architecture-report.md).

## Tổng quan

- Ưu tiên: P1. Trạng thái: `pending`. Tiến độ: `0%`. Review: `pending`. Effort: **24–32h**.
- Dựng modular monolith, PostgreSQL, private storage và invite auth dựa trên lựa chọn đã xác minh ở P1; chưa xây learning modes.

## Phát hiện chính

- Web/API và worker phải cùng release và dùng chung domain services để tránh lệch trạng thái đa kênh.
- Pilot chỉ có learner và admin hỗ trợ; learner không bao giờ có quyền admin, không có public signup.
- Attempts + jobs phải ghi cùng transaction; file private cần namespace an toàn và lifecycle gắn với database.

## Yêu cầu

### Chức năng

- Scaffold Next.js + TypeScript và Node worker theo version/P1; health/readiness, config validation và structured logging.
- PostgreSQL riêng; migration additive; repository/unit-of-work cho identity, session, file object, job và audit.
- Invite/binding records tách purpose, token hash, expiry và lifecycle; activate/complete consume token atomically. Learner/admin qua invite-only; binding chỉ complete từ trusted actor tuple; revoke/expire/rotate có audit.
- Private filesystem abstraction: staging upload, checksum, MIME/size allowlist, atomic publish, quarantine và cleanup.

### Phi chức năng

- Không Redis ở pilot. Database jobs có lease, retry budget, dead-letter và idempotent completion.
- Config fail-closed; secret không có default; log dùng opaque ID và redaction.

## Kiến trúc

- `web/API → application services → repositories/file store`; worker dùng cùng services và schema.
- Bảng nền: users, identities, sessions, invite/binding records, one-time token hashes, file_objects, jobs, idempotency_records, audit_events, schema metadata.
- Authorization luôn ở service boundary. Route/tool chỉ parse, authenticate, gọi command/query, map error.
- DB tham chiếu storage key; client không gửi absolute path. Upload tạm chỉ publish sau transaction hợp lệ.

## Tệp mã liên quan

| Hành động | Đường dẫn đầy đủ | Nội dung dự kiến |
|---|---|---|
| Create | `src/server/config.ts` | Validate runtime config/secrets |
| Create | `src/server/auth/invite-auth.ts` | Invite, binding, roles, session lifecycle |
| Create | `src/server/storage/private-file-store.ts` | Namespace/checksum/atomic file operations |
| Create | `src/server/database/transaction.ts` | Transaction boundary dùng chung |
| Create | `src/server/jobs/database-job-queue.ts` | Claim/lease/retry/dead-letter |
| Create | `src/app/api/v1/health/route.ts` | Health/readiness không lộ secret |
| Create | `package.json` | Pinned manifest/scripts theo P1 |
| Create | `src/contracts/api-v1.ts` | Typed contract hiện thực hóa spec P1 |
| Create | `db/migrations/0001-foundation.sql` | Schema additive nền tảng |
| Create | `tests/foundation/` | Auth/storage/transaction/job tests |
| Delete | Không có | Không xóa file ở phase này |

## Các bước triển khai

1. Scaffold codebase với strict TypeScript, scripts lint/typecheck/test/build và one release identifier cho web + worker.
2. Tạo config schema, secret injection, DB pool, transaction helper và migration runner single-owner.
3. Implement auth library adapter: invite activate consume atomic theo purpose/hash/expiry; binding start cần web session, complete cần trusted actor tuple + one-time token; revoke/replay/expiry, learner/admin roles, session rotation, CSRF và audit.
4. Implement private file store; chống traversal/symlink, validate bytes thật, cleanup orphan và không cache public.
5. Implement DB queue với `available_at`, lease, retry/dead-letter; kiểm thử worker crash/reclaim.
6. Trước migration: tạo backup/check khả năng đọc; chạy migration staging; planned checks **chưa chạy ở lượt lập plan**: `npm run test:foundation`, `npm run typecheck`, `npm run build`.

## Việc cần làm

- [ ] Web và worker build từ cùng revision/schema declaration.
- [ ] Public signup không tồn tại; invite/binding khác purpose; expiry/replay/revoke và atomic consume được test.
- [ ] Learner bị chặn khỏi mọi admin action.
- [ ] Upload lỗi không tạo file mồ côi hoặc DB record giả.
- [ ] Job crash/reclaim và duplicate completion an toàn.

## Tiêu chí thành công

- `test:foundation`, `typecheck`, `build` pass trên staging version đã khóa.
- Auth tests bao gồm expired/replayed/wrong-purpose invite/binding, concurrent atomic consume, incomplete actor tuple, CSRF, revoked session, role escalation và session fixation.
- Storage tests bao gồm traversal, wrong MIME, oversize, checksum mismatch, atomic publish và cleanup.
- Transaction test chứng minh business mutation + job commit cùng nhau hoặc rollback toàn bộ.

## Rủi ro

| Rủi ro | Khả năng × tác động | Ứng phó | Rollback |
|---|---|---|---|
| Auth library không phù hợp sau tích hợp | Thấp × Cao = Trung bình | Giữ adapter mỏng, contract độc lập library | Quay về lựa chọn P1 khác trước dữ liệu thật |
| DB/file lệch trạng thái | Trung bình × Cao = **Cao** | Staging + checksum + compensating cleanup | Restore checkpoint; không xóa artifact chưa đối soát |
| Worker giữ lease vĩnh viễn | Trung bình × Trung bình = Trung bình | Lease timeout + heartbeat + bounded retry | Dừng worker, release lease theo runbook |
| Migration lỗi | Thấp × Cao = Trung bình | Backup trước đổi schema; rehearsal | Rollback app, giữ schema additive; forward-fix nếu rollback dữ liệu không an toàn |

## Bảo mật

- Cookie `HttpOnly`, `Secure`, `SameSite`; CSRF; password/token hashing theo auth library đã duyệt.
- Volume, DB user, service account, secrets riêng; file mode tối thiểu; không serve path trực tiếp.
- Audit invite, binding, role/config change và admin file action; không log nội dung bài/voice.

## Bước tiếp theo

- Mở Phase 3 khi foundation tests pass, migration/backup procedure được review và source volume chỉ-read đã mount đúng boundary.
