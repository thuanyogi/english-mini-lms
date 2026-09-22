---
title: "Kế hoạch triển khai English Mini LMS cho BS. Minh"
description: "Xây mini LMS cá nhân kết hợp mobile web và OpenClaw/Zalo, có bằng chứng học tập, AI hỗ trợ có kiểm soát và vận hành cô lập."
status: pending
progress: 0%
review: pending
priority: P2
effort: "180–248h"
branch: master
tags: [feature, frontend, backend, database, api, auth, ai, infra]
created: 2026-09-19
---

# Kế hoạch triển khai English Mini LMS cho BS. Minh

## Kết quả cần đạt

Một mini LMS cho một người học, hỗ trợ phiên 30–45 phút, đủ nghe/nói/đọc/viết, giao tiếp đời sống–công việc–hội nghị, đọc–dịch y khoa và luyện hướng tới IELTS 7.5–8.0. Hệ thống lưu bài gốc, mức hỗ trợ, phản hồi và bản sửa; không hứa thời hạn hay chứng nhận band.

## Phạm vi và ranh giới

- Baseline đề xuất: modular monolith mới tại repo `english-mini-lms/` (repo riêng), Next.js + TypeScript, PostgreSQL, private filesystem volume, Node worker cùng release; phiên bản/provider/thư viện auth phải xác minh ở Phase 1.
- D1 đã được người đặt dự án xác nhận ngày 19/09/2026: Zalo để trò chuyện qua OpenClaw hiện hữu; web để học với tài liệu, làm bài và xem tiến độ. Không setup/build Zalo adapter.
- Nguồn học duy nhất: `content/english-lab/`; runtime copy tại `/srv/english-mini-lms/content/english-lab/`; index LMS nằm trong private state, không dùng `docs/index/`.
- Không dùng dữ liệu clinic/bệnh nhân. LMS có DB, secrets, volume, service identity và backup riêng.
- Đây là draft triển khai, không phải runtime workflow. Không tạo source/config ở lượt lập plan.

## Giai đoạn

| # | Giai đoạn | Trạng thái | Tiến độ | Effort | Phụ thuộc |
|---|---|---|---:|---:|---|
| 1 | [Khảo sát và khóa hợp đồng](phase-01-discovery-and-contracts.md) | Pending | 0% | 12–16h | — |
| 2 | [Nền tảng, auth và lưu trữ](phase-02-foundation-auth-and-storage.md) | Pending | 0% | 24–32h | P1 |
| 3 | [Thư viện và lõi học tập](phase-03-library-and-learning-core.md) | Pending | 0% | 24–32h | P2 |
| 4 | [Các chế độ học và AI](phase-04-ai-learning-modes.md) | Pending | 0% | 32–48h | P3 |
| 5 | [Mobile learning web](phase-05-mobile-learning-web.md) | Pending | 0% | 32–40h | P3; song song P4 khi UI/service contract đã khóa |
| 6 | [Tích hợp OpenClaw](phase-06-openclaw-integration.md) | Pending | 0% | 16–24h | P2, P3, contract P4 |
| 7 | [Xác minh và triển khai](phase-07-verification-and-deployment.md) | Pending | 0% | 24–32h | P1–P6 |
| 8 | [Pilot và bàn giao](phase-08-pilot-and-handover.md) | Pending | 0% | 16–24h | P7 |

## Dependency và mốc

`P1 → P2 → P3 → P4`; P5 bắt đầu sau P3 và chỉ song song P4 khi tách ownership UI/services; P6 chờ P2 + P3 + contract P4; P7 chờ toàn bộ; P8 chờ P7. Một mode chạy sớm chỉ là milestone kỹ thuật, không phải full scope complete.

Ownership mặc định tuần tự. Khi P4/P5 song song: P4 chỉ sở hữu `src/server/assessment`, `src/server/providers`, `src/worker`, migration `0003` và test mode; P5 chỉ sở hữu `src/app`, UI client và E2E web. Thay đổi shared contract phải review, không edit chéo.

## Effort và lịch tham khảo

- Trước pilot: 164–224h kỹ thuật, tương đương khoảng 5–7 tuần nếu có 32h/tuần kỹ thuật.
- Pilot: thêm 4 tuần calendar và 16–24h hỗ trợ kỹ thuật; tổng 180–248h.
- Nhánh biên tập 24 hoạt động dự trù thêm 24–48h nếu nguồn/quyền đã đủ; tổng kỹ thuật + biên tập 204–296h. Vẫn không gồm mua quyền, xử lý nguồn thiếu nặng hoặc toàn bộ thời gian học của Minh; không phải báo giá/cam kết timeline.

## Cổng nghiệm thu toàn bộ

- Luồng web và OpenClaw dùng chung service; actor trusted không đến từ model arguments; mutations idempotent; attempt/job cùng transaction; feedback/revision append-only.
- Live audio và source/rubric IELTS đã duyệt là gate bắt buộc để full scope pass. Full mock IELTS là tùy chọn, phải đặt lịch riêng ngoài hộp 30–45 phút.
- Backup trước migration/admin bulk-data change; restore rehearsal DB + file cùng checkpoint đạt mục tiêu đề xuất RPO ≤24h, RTO ≤8h; rollback app giữ schema additive.
- Pilot 4 tuần: ≥12 phiên, đủ 4 kỹ năng, ≥2 đọc–dịch y, ≥2 IELTS, ≥4 bài sửa và có nhiệm vụ hội nghị; so sánh điều kiện tương đương, tách `assisted`, không chứng nhận band.

## Nhánh Lite để tự xây với Antigravity (bổ sung 22/09/2026)

Plan gốc P1–P8 là đích v2 cho đội kỹ thuật. Để anh Minh tự xây bằng Antigravity, đi trước bằng [Lite MVP Track](lite-mvp-track.md) (web-first, không worker/outbox/Zalo, giữ nguyên invariant học tập) theo [hướng dẫn từng bước](huong-dan-xay-dung-voi-antigravity.md); luật cho agent tại [AGENTS.md](../../AGENTS.md) và `.agents/`. Nguồn học khởi tạo tại `content/english-lab/`. Ngày 22/09/2026 toàn bộ dự án LMS đã tách khỏi repo `dr-minh-clinic` thành repo riêng `english-mini-lms` (cô lập dữ liệu phòng khám). Đánh giá chi tiết: [readiness check](reports/plan-readiness-check-2026-09-22.md).

## Tài liệu điều phối

[Cơ sở và quyết định](evidence-and-decisions.md) · [Thiết kế sản phẩm](product-design.md) · [Kiến trúc kỹ thuật](technical-architecture.md) · [Hợp đồng dữ liệu/tools](data-and-tools-contract.md) · [Vận hành và nghiệm thu](operations-and-acceptance.md) · [Bản gửi anh Minh](ban-gui-anh-minh.md) · [Lite MVP Track](lite-mvp-track.md) · [Hướng dẫn Antigravity](huong-dan-xay-dung-voi-antigravity.md)
