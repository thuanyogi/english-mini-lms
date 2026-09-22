# Xử lý rà soát bộ plan

Ngày 19/09/2026. Phạm vi: tính nhất quán và khả năng triển khai của tài liệu. Không có code/build/provider/runtime test trong lượt này.

| Nhận xét trong [review](architecture-review.md) | Quyết định và bằng chứng xử lý |
|---|---|
| Thiếu owner assessment state | Chấp nhận; thêm bảng `assessments` làm nguồn sự thật, jobs chỉ thực thi task có dependency. Cập nhật data/tools và phase 4. |
| Outbox thiếu claim/ack contract | Chấp nhận; thêm bridge-only claim/ack với attempt/lease token/owner/target, unique claim và unknown khi hết lease. Không expose ack cho model. |
| Ví dụ actor tuple không đầy đủ | Chấp nhận; bắt buộc issuer/channel/account/subject cùng timestamp/proof; credential không thay verified sender. Bỏ fallback có thể hiểu là chỉ tin thread. |
| Upload trang sách có thể vượt source root | Chấp nhận; upload giữ private, curate sang `content/english-lab/` với manifest/hash/review trước khi publish. |
| Restore có thể hồi sinh dữ liệu đã xóa | Chấp nhận; deletion ledger riêng, thời hạn dài hơn backup và phải áp lại trước mở dịch vụ. Mốc lưu/purge là đề xuất cần duyệt. |
| Invite/binding thiếu lifecycle | Chấp nhận; thêm record/token purpose/hash/expiry, consume atomic, các thao tác activate/start/complete/revoke và kiểm actor. |
| Hai PDF không có trong source | Không chấp nhận kết luận file biến mất: kiểm tra lại `rg --files --no-ignore docs/sources` ngày 19/09/2026 trả đúng hai PDF đã ghi. File bị ignore. Vẫn giữ gate chưa có học liệu/rubric approved cho LMS. |

Rà soát nội bộ bổ sung: tool `submit-attempt` phải nhận reference của inbound bài gốc có verified author/checksum, không tin text model tự soạn là bài Minh; web lấy bài từ authenticated learner session. Đã thêm vào contracts và nghiệm thu.

Vòng đọc lại độc lập xác nhận các findings ban đầu đã xử lý ở mức plan; reviewer rút lại nhận xét hai PDF không tồn tại. Nhận xét bổ sung về unique re-grade đã sửa: historical unique bao gồm run_version, partial unique cho một active run, feedback liên kết assessment/run. Không được hiểu là hệ thống đã vượt kiểm thử runtime.

Trạng thái cuối cùng phụ thuộc kiểm tra liên kết/cấu trúc và vòng đọc lại phase. Các unknown runtime, nguồn, chi phí, web D1 và thông tin đầu vào của Minh vẫn được ghi trong sổ quyết định; chưa được coi là đã duyệt.
