# Rà soát kiến trúc English Mini LMS

---
date: 2026-09-19
scope: plan-only
verdict: done-with-concerns
---

## Kết luận

Bộ plan giữ đúng hướng một người học, dùng OpenClaw/Zalo hiện hữu, app/DB/file riêng và không tuyên bố provider/runtime đã chạy. Tuy nhiên, năm hợp đồng dưới đây cần khóa trước hoặc trong Phase 1–2; nếu để nguyên, các phase triển khai có thể tạo state không truy vấn được, gửi kết quả trùng, bind sai danh tính hoặc nhập nguồn ngoài ranh giới đã duyệt.

Không có test/build/runtime nào được chạy trong lượt rà soát tài liệu này; đây không phải bằng chứng local/staging/live pass.

## Findings

### 1. [Cao] Không có canonical assessment record dù API và worker phụ thuộc vào nó

**Evidence:** `data-and-tools-contract.md:9-27` liệt kê model nhưng không có `assessments`; `:35-37` lại định nghĩa assessment state và unique commit; `:52-54` yêu cầu API trả `assessment_status`/feedback. Job chỉ có `type, input_ref, state...`, chưa chỉ ra nơi giữ assessment state, dependency STT/OCR → chấm và active run.

**Tác động:** worker không có owner rõ cho state chuyển tiếp; `GET submission` không có nguồn sự thật ổn định; retry hoặc re-grade dễ tạo hai kết quả active.

**Fix nhỏ nhất:** thêm `assessments` với `submission_id`, kind, source/rubric snapshot, state, active run/version, job/result refs và unique invariant; hoặc tuyên bố rõ `jobs` chính là canonical assessment rồi bổ sung đúng các trường/trạng thái trên. Chọn một, không duy trì hai state machine song song.

### 2. [Cao] Outbox có trạng thái nhưng thiếu hợp đồng claim/ack chống gửi trùng

**Evidence:** `data-and-tools-contract.md:26` có outbox target/state; `:64` chỉ nêu `poll-results` và `ack-delivery`; `:68` tách trusted context khỏi model args; `:107-111` yêu cầu claim/lease, `delivery_unknown` và không resend mù nhưng không định nghĩa claim token, lease owner, transition hay ràng buộc thread khi ack.

**Tác động:** hai poller/runtime instance có thể cùng lấy một event; ack giả/sai thread có thể đóng event; crash giữa poll và send không có transition xác định.

**Fix nhỏ nhất:** ghi contract bridge-only `claim-results(limit)` trả `event_id + delivery_attempt_id + lease_until`; `ack-delivery` chỉ nhận attempt đang lease và trạng thái `confirmed|delivery_unknown|failed` kèm receipt nếu có. Recipient/thread phải lấy từ trusted runtime context và khớp outbox, không nhận từ model.

### 3. [Cao] Identity tuple được yêu cầu nhưng ví dụ contract làm mất hai thành phần

**Evidence:** `data-and-tools-contract.md:13` unique identity theo `issuer + channel + channel_account + subject`; `:68` nói runtime gắn channel account; nhưng ví dụ `:76-80` chỉ có issuer, subject, conversation và request ID. `technical-architecture.md:105` còn cho fallback credential riêng + agent/thread nếu runtime thiếu trusted context.

**Tác động:** implementer có thể bind chỉ theo subject/thread hoặc coi service credential là bằng chứng người học; điều này mâu thuẫn yêu cầu actor phải đến từ ngữ cảnh OpenClaw đã xác minh.

**Fix nhỏ nhất:** chuẩn hóa một `TrustedActorContext` bắt buộc đủ issuer/channel/channel_account/subject/request_id/issued_at và proof ở transport. Service credential chỉ xác thực caller, không bind learner. Nếu không có verified subject thì mutation Zalo fail-closed; bỏ mọi cách hiểu rằng thread ID hoặc model arg tự nó đủ tin cậy.

### 4. [Cao] Trang gửi qua Zalo có thể trở thành nguồn ngoài thư viện duy nhất

**Evidence:** `plan.md:24` khóa nguồn duy nhất tại `content/english-lab/` và index private; `technical-architecture.md:94-95` cũng tách source với learner artifacts; nhưng `technical-architecture.md:96` cho trang sách qua Zalo ở `pending_review` rồi được dùng sau kiểm tra quyền. `data-and-tools-contract.md:14-15` dùng `storage_key` chung, chưa bắt importer/publisher kiểm root/provenance.

**Tác động:** learner upload riêng có thể đi vòng quy trình nguồn, làm source provenance và backup/retention nhập nhằng; implementation drift khỏi ranh giới đã duyệt.

**Fix nhỏ nhất:** quy định Zalo/web upload luôn là private learner artifact, không phải `source`. Muốn thành học liệu phải có thao tác curate riêng đưa bản được phép vào `content/english-lab/`, tạo manifest/hash/version rồi approve. Publisher từ chối source version không có provenance từ root này; index chỉ ở private LMS runtime state.

### 5. [Trung bình] Xóa dữ liệu và backup restore chưa có invariant chống “hồi sinh”

**Evidence:** `data-and-tools-contract.md:58` có deletion request; `:105` yêu cầu tombstone/hủy job; `:113-123` đề xuất bài/voice 90 ngày và backup 30 ngày nhưng “không tự xóa khi chưa báo trước”. `operations-and-acceptance.md:93-95` restore cả DB+file cùng checkpoint nhưng không nêu cách áp lại yêu cầu xóa sau checkpoint.

**Tác động:** implementer không biết khi nào hard-delete, giữ tombstone bao lâu, xử lý job/outbox đang lease ra sao; restore backup cũ có thể tái xuất hiện bài/voice đã xóa.

**Fix nhỏ nhất:** trước dữ liệu thật, chốt một retention matrix có `expire_at`, grace/notice, hard-delete state và backup expiry. Giữ deletion ledger/tombstone lâu hơn backup dài nhất và bắt restore runbook áp lại ledger trước khi mở dịch vụ; worker/outbox kiểm tombstone ngay trước commit/send.

### 6. [Trung bình] Browser invite/binding được mô tả nhưng chưa có lifecycle trong contract

**Evidence:** `technical-architecture.md:103,107` yêu cầu tài khoản tạo trước, invite/binding một lần và recovery ngoài luồng; `data-and-tools-contract.md:11-13` chỉ có users/sessions/learners/external identities; API `:43-58` không có activate/bind/revoke flow.

**Tác động:** Phase 2 có thể tự chọn cơ chế khác với identity invariant, hoặc token invite bị replay và gắn nhầm learner.

**Fix nhỏ nhất:** thêm contract tối thiểu cho invite/binding record: token hash, learner/user target, purpose, expiry, used/revoked timestamps, atomic consume và audit; browser session chỉ được tạo sau consume thành công. Không cần public signup hay quản lý lớp.

### 7. [Trung bình] Claim về source hiện trạng cần sửa trước khi dùng làm evidence

**Evidence:** `evidence-and-decisions.md:25` khẳng định `docs/sources/` có hai PDF y khoa, trong khi read-only listing ở lượt review không thấy file nào dưới thư mục này và chưa có `content/english-lab/`. Chính `plan.md:24` coi `english-lab` là nguồn bắt buộc.

**Tác động:** Phase 1 có thể tưởng đầu vào đã tồn tại và ước lượng sai công nhập nguồn; một claim workspace không còn tái lập được.

**Fix nhỏ nhất:** đổi evidence thành snapshot có ngày/lệnh kiểm tra và trạng thái thực tế; coi thư viện, audio và rubric là gate chưa đạt cho đến khi manifest dưới `content/english-lab/` được duyệt. Không suy ra nội dung từ README hay file đã biến mất.

## Điểm đã nhất quán, không cần mở rộng

- Một learner BS. Minh, không có quản lý lớp; vai trò hỗ trợ không đồng nghĩa đã thuê giáo viên (`evidence-and-decisions.md:33-40`, `operations-and-acceptance.md:13-15`).
- Không build Zalo adapter mới; OpenClaw contract/media/receipt phải live-verify ở Phase 1 (`plan.md:23`, `evidence-and-decisions.md:59`).
- Practice estimate tách official IELTS claim và phải có rubric/bằng chứng (`product-design.md:21,73-81`, `data-and-tools-contract.md:94-98`).
- Recovery proposal RPO ≤24h/RTO ≤8h cần Minh chấp thuận và restore proof; chưa đạt thì chưa pilot (`plan.md:55`, `operations-and-acceptance.md:81-95`).

## Thứ tự xử lý tối thiểu

1. Phase 1 khóa trusted actor + bridge/outbox contract và sửa source evidence/boundary.
2. Phase 2 khóa assessment/job owner, invite lifecycle và deletion/restore invariant trước migration.
3. Chỉ sau đó mới viết phase implementation chi tiết, migration và contract tests tương ứng.

## Câu hỏi chưa giải quyết

- OpenClaw runtime thực tế có stable verified subject, event ID và delivery receipt ở transport nào?
- Ai được chỉ định làm operator cho invite/recovery, source approval và manual delivery reconciliation?
