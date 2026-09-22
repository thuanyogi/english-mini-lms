# Giai đoạn 8 — Pilot và bàn giao

## Liên kết ngữ cảnh

- [Phase 7](phase-07-verification-and-deployment.md); [vận hành và nghiệm thu](operations-and-acceptance.md); [thiết kế sản phẩm](product-design.md).
- [Bản gửi anh Minh](ban-gui-anh-minh.md); [nghiên cứu trải nghiệm học](research/learning-experience-report.md); [cơ sở và quyết định](evidence-and-decisions.md).

## Tổng quan

- Ưu tiên: P1. Trạng thái: `pending`. Tiến độ: `0%`. Review: `pending`. Effort: **16–24h hỗ trợ kỹ thuật trong 4 tuần calendar**.
- Onboard một người học, vận hành pilot, thu bằng chứng học/độ ổn định/chi phí, xử lý lỗi và bàn giao. Effort không gồm toàn bộ thời gian học của Minh hay biên tập/mua quyền nội dung.

## Phát hiện chính

- Pilot chứng minh sản phẩm dùng được và tạo bằng chứng so sánh; không chứng minh đạt IELTS 7.5–8.0 hay hiệu quả giáo dục nói chung.
- Baseline và cuối kỳ phải là nhiệm vụ tương đương, khác nội dung nhưng cùng điều kiện/mức hỗ trợ; independent và `assisted` báo cáo riêng.
- Full mock IELTS là optional và có lịch riêng; không chia một mock qua nhiều phiên 30–45 phút rồi gọi full mock.

## Yêu cầu

### Chức năng

- Trước pilot: xác nhận consent/retention, owner/support, schedule, source/rubric/audio, web D1, reminder opt-in và budget cap.
- Tuần 1: onboarding + baseline L/S/R/W trong 3–4 phiên; ghi variant IELTS, device, điều kiện và mức hỗ trợ.
- Tuần 2–3: dùng đủ five modes; theo dõi completion, queue/delivery, review requests, feedback quality, cost và incident.
- Tuần 4: nhiệm vụ tương đương + interview trải nghiệm; report ≥12 phiên, đủ 4 skills, ≥2 đọc–dịch y, ≥2 IELTS, ≥4 revisions, có hội nghị/công việc.
- Handover source/release/access ownership, runbooks, approved manifests, backup/restore evidence, unresolved backlog và support contacts.

### Phi chức năng

- Không mặc định reminder; opt-in có tần suất/khung giờ và tắt ngay được.
- Report ghi “chưa đủ bằng chứng” khi sample/điều kiện thiếu; không quy đổi nội bộ thành official band.

## Kiến trúc

- Production remains one-learner pilot; weekly review dùng dashboard redacted + evidence links, không export raw content không cần thiết.
- Pack 24 hoạt động chỉ là inventory đề xuất: baseline/follow-up dùng hai activity khác nội dung nhưng tương đương; phần còn lại luyện/sửa. Slot chưa có nguồn/rubric/quyền approved không được tính là sẵn sàng.
- Comparison dataset khóa task form, device/time/rubric/source version và assistance condition; reviewer mù danh tính/lần đầu-cuối khi khả thi.
- Incident/change workflow: triage → preserve evidence → patch staging → regression/recovery checks → approved release; không hot-edit production data không backup.
- End-of-pilot decision: maintain/tune/pause/expand; thêm learner/tutor/classroom là scope mới, không bật ngầm.

## Tệp mã liên quan

| Hành động | Đường dẫn đầy đủ | Nội dung dự kiến |
|---|---|---|
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/docs/learner-guide.md` | Login, study, hint, audio, revision, data/support |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/docs/admin-guide.md` | Sources, jobs, costs, review, export/delete |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/docs/pilot-protocol.md` | 4-week protocol, equivalent tasks, evidence rules |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/docs/pilot-report.md` | Usage, reliability, cost, learning evidence, decision |
| Create | `/Volumes/SSD ME/AI4A/english-mini-lms/docs/handover-checklist.md` | Owners, access, release, runbooks, backlog |
| Modify | `/Volumes/SSD ME/AI4A/english-mini-lms/docs/incident-response-runbook.md` | Cập nhật từ incident thực tế đã review |
| Modify | `/Volumes/SSD ME/AI4A/english-mini-lms/docs/backup-and-restore-runbook.md` | Cập nhật actual owner/timing từ drill/pilot |
| Delete | Không có | Retention deletion chỉ qua flow đã duyệt, không xóa thủ công |

## Các bước triển khai

1. Run pilot-readiness review và nhận consent/decision record; tạo learner/admin riêng, bind web/Zalo có xác minh.
2. Onboard Minh; test mic/audio/browser; làm baseline chia 3–4 phiên trong hộp 30–45 phút, không tự gán band.
3. Hỗ trợ 4 tuần; daily ops check trong pilot, weekly feedback/source/cost/backup review; fix theo controlled release.
4. Theo dõi target pilot và sample feedback AI/human; mọi override/withdraw giữ reason/audit và rebuild projection.
5. Thực hiện endline equivalent tasks; tách independent/assisted, timed/untimed, source/rubric/model versions.
6. Tổng hợp reliability, delivery, cost, usability và evidence learning; nêu limitations và câu hỏi còn mở.
7. Diễn tập người nhận bàn giao: deploy/rollback, add approved source, review failed job, backup/restore, export/delete, disable reminder/integration.
8. Planned checks, **chưa chạy ở lượt lập plan**: `npm run test:e2e -- pilot-readiness`, `npm run report:pilot-integrity`, `npm run verify:backup-freshness`.

## Việc cần làm

- [ ] ≥12 sessions, đủ L/S/R/W, ≥2 medical translation, ≥2 IELTS, ≥4 revisions, ≥1 conference/work task.
- [ ] Baseline/endline conditions và assistance labels đầy đủ; missing evidence được ghi rõ.
- [ ] Không incident mất/sai người/lộ data hoặc official-band claim sai; incident khác có closure/owner.
- [ ] Minh xác nhận usability/usefulness và decision reminder/retention/export.
- [ ] Người nhận bàn giao thực hiện được runbook, không chỉ đọc tài liệu.

## Tiêu chí thành công

- Pilot target đạt hoặc report giải thích chính xác phần chưa đạt; không tô hồng completion thành learning progress.
- So sánh equivalent tasks cho thấy thay đổi quan sát được theo dimension có rubric; `assisted` không trộn independent; không cấp chứng nhận band.
- Technical SLO/recovery/cost actuals được ghi; backup vẫn restorable và support incidents nằm trong quy trình.
- Handover checklist có owner/credential transfer ngoài repo, release hash, runbook drill, backlog/risk và quyết định tiếp theo.

## Rủi ro

| Rủi ro | Khả năng × tác động | Ứng phó | Rollback/response |
|---|---|---|---|
| Minh ít phiên/khác điều kiện | Trung bình × Trung bình = Trung bình | Flexible schedule, resume, ghi condition | Báo insufficient evidence; kéo dài/chỉnh pilot chỉ khi được duyệt |
| Feedback gây hiểu sai y khoa/IELTS | Trung bình × Cao = **Cao** | Human sample review + limitation | Withdraw feedback, chặn rubric/source/provider, sửa và đối soát |
| Incident privacy/loss | Thấp × Cao = Trung bình | Incident runbook + backup/recovery | Dừng affected flow, preserve evidence, notify owner, restore/rotate |
| Chi phí vượt cap | Trung bình × Trung bình = Trung bình | 80% alert, 100% stop new AI jobs | Vẫn lưu bài/nháp; resume sau budget approval |

## Bảo mật

- Consent xác định ai xem bài/voice, retention và quyền export/delete; admin access review trước/sau pilot.
- Không đưa patient identifiers vào task; dùng tình huống tổng hợp/khử định danh và approved medical sources.
- Khi handover, chuyển secrets qua kênh bảo mật, rotate credential tạm và xác nhận xoá quyền không còn cần.

## Bước tiếp theo

- Review báo cáo pilot với Minh/chủ dự án; chọn maintain, tune, pause hoặc lập plan mở rộng. Không thêm learner/tutor, bật reminder hay mua dịch vụ nếu chưa có quyết định mới.
