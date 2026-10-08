# M3 — Quản lý nội dung & trải nghiệm học — English Mini LMS (05/10/2026)

Phần bổ sung sau [M2](m2-nang-cap-trai-nghiem-2026-10-02.md). Làm khi app đã chạy ổn định (đã vá lỗi + deploy + M2 xong).

Cách làm y hệt: **mỗi phiên chat Antigravity làm đúng 1 bước**, dán prompt, đọc Implementation Plan rồi mới duyệt, xong tự kiểm tay theo mục "Xong khi".

5 việc: **Thư viện theo chủ đề** · **Admin quản lý nội dung trong app** · **Đồng bộ nội dung từ Google Drive** · **Ôn từ kiểu quẹt trái/phải** · **Làm rõ luồng học hằng ngày & điều hướng** (rà soát UX).

> Lý do lớn nhất của đợt này: hiện muốn thêm/sửa bài học phải sửa file trong `content/english-lab/` rồi chạy `npm run seed` qua agent — rất mất thời gian và không ai kia tự làm được. Sau đợt này anh Minh **tự đăng bài, tự duyệt, tự sắp chủ đề ngay trong app**, còn Google Drive làm "kho nguyên liệu" để kéo nội dung vào khi cần.

**Nhìn nhanh toàn cảnh 5 việc và thứ tự làm:**

![Tổng quan 5 nâng cấp](images/m3-01-tong-quan.svg)

---

## Nâng cấp 1 — Thư viện chọn chủ đề trước rồi mới chọn bài

**Mục tiêu:** vào `/library` thấy các **nhóm chủ đề** trước — chọn 1 chủ đề mới thấy danh sách bài trong chủ đề đó, thay vì một danh sách phẳng trộn lẫn như hiện nay.

![Thư viện theo chủ đề](images/m3-02-thu-vien-chu-de.svg)

**Danh sách chủ đề đã chốt** (4 chủ đề, gán sẵn cho 16 bài hiện có — không cần quyết thêm):

| Chủ đề (key `topic:`) | Tên hiển thị | Bài hiện có gán vào |
|---|---|---|
| `giao-tiep-hoi-nghi` | 🎤 Hội nghị &amp; email học thuật | W1, W4 · S1, S3 · L1, L4 — 6 bài |
| `doc-sach-y-khoa` | 📚 Đọc–dịch &amp; kỹ thuật y khoa | R1, R2, R3, R4 · W2 · L3 — 6 bài |
| `giao-tiep-lam-sang` | 🩺 Giao tiếp lâm sàng | W3 · S2, S4 · L2 — 4 bài |
| `luyen-ielts` | 📝 Luyện IELTS | (chưa có bài — chủ đề chờ sẵn cho bài IELTS sau) |

**Prompt:**

```
Thêm tầng "chủ đề" (topic) vào thư viện.

1. Schema: thêm cột topic (text, nullable) vào bảng activities trong src/db/schema.ts,
   tạo migration mới bằng drizzle-kit (không sửa tay file SQL cũ). Giữ additive —
   không đổi/đổi tên cột cũ.
2. src/server/library/service.ts: thêm hàm getTopics() trả về danh sách chủ đề
   distinct từ activities đã approved kèm số bài; getApprovedActivities nhận thêm
   tham số topicFilter. Trường topic đưa vào ActivityListItem.
   QUYẾT ĐỊNH ĐÃ CHỐT (ghi trong Implementation Plan): 1 bài chỉ thuộc 1 chủ đề
   (topic là cột text đơn). Ở quy mô hiện tại là đủ; nếu sau này cần nhiều chủ
   đề/bài thì nâng lên bảng quan hệ ở v2.
3. /library (page.tsx + activity-list.tsx): màn đầu hiện lưới thẻ CHỦ ĐỀ (icon,
   tên, số bài, số bài đã học nếu dễ lấy). Chọn chủ đề → hiện danh sách bài của
   chủ đề đó, vẫn giữ thanh lọc mode hiện tại bên trong. Có nút "← Tất cả chủ đề"
   để quay lại. Bài chưa có topic gom vào nhóm "Chưa phân loại". Không phá
   data-tour="library-card" và layout desktop đã có.
4. Manifest: thêm key `topic:` vào từng activity trong content/english-lab/manifest.yaml
   theo DANH SÁCH ĐÃ CHỐT trong file plan (giao-tiep-hoi-nghi, doc-sach-y-khoa,
   giao-tiep-lam-sang, luyen-ielts); cập nhật scripts/seed.ts đọc key này ghi vào
   cột topic.
5. Deep-link: /library/[id] chi tiết bài hiện chip chủ đề; nút quay lại về đúng
   chủ đề đó (?topic=...).
6. Gợi ý trong chủ đề: tách phần chọn bài rule-based của /today ra hàm dùng
   chung (src/server/today/service.ts → module chia sẻ), gắn nhãn "💡 Gợi ý"
   cho 1 bài đầu mỗi chủ đề trong /library — chấp nhận refactor nhỏ này.

Lập Implementation Plan trước, chờ tôi duyệt. Sau sửa chạy npm run typecheck + lint + build.
```

**Xong khi:** vào Thư viện thấy các thẻ chủ đề; vào "Giao tiếp hội nghị" chỉ thấy bài thuộc chủ đề đó, vẫn lọc được theo Viết/Nói/Nghe/Đọc; bài cũ chưa gán chủ đề nằm ở "Chưa phân loại"; chạy `npm run db:migrate && npm run seed` xong DB có topic.

## Nâng cấp 2 — Admin quản lý nội dung ngay trong app (không cần agent/seed tay)

**Mục tiêu:** trang `/admin` có thêm mục **"Nội dung học"**: xem/tạo/sửa bài (title, objective, mode, topic, đề bài, hướng dẫn chấm, transcript, câu hỏi nghe, link video), đổi `review_state` (nháp → đang xét → đã duyệt / lưu trữ) bằng 1 nút. Toàn bộ ghi thẳng vào DB — bảng `activities`, `sources`, `source_segments` đều đã có sẵn cột text nên **không cần file trong repo nữa**; `content/english-lab/` chỉ còn là bản gốc tham khảo.

![Admin quản lý nội dung](images/m3-03-admin-noi-dung.svg)

**Prompt:**

```
Xây giao diện quản lý nội dung học trong /admin — chỉ role admin mới vào được
(tái dùng cách trang admin đang chặn 403).

1. API mới (src/app/api/v1/admin/...):
   - GET  /api/v1/admin/content/activities?state=all — danh sách đầy đủ field
   - POST /api/v1/admin/content/activities — tạo activity mới (mặc định draft)
   - PATCH /api/v1/admin/content/activities/[id] — sửa title/objective/mode/topic/
     durationMinutes/difficulty/purpose/promptText/feedbackGuide/questions/
     segmentIds; đổi reviewState qua cùng endpoint
   - Tương tự cho sources + source_segments (tạo/sửa, nhập textContent/
     transcriptContent trực tiếp, nhập url video YouTube)
   - Validate phía server: id theo pattern sẵn có (W5, R5, L5, S5...), mode thuộc
     enum, reviewState thuộc enum. Từ chối request của non-admin (403).
   - TUYỆT ĐỐI không cho API này xoá vật lý: chỉ cho reviewState -> retired.
2. UI /admin thêm tab/section "📚 Nội dung học":
   - Bảng danh sách bài (có sẵn) + cột chủ đề + nút "Sửa" mở form.
   - Form sửa/tạo: đủ field trên, textarea lớn cho promptText & transcript,
     JSON editor nhẹ cho questions — KHÔNG chỉ check "JSON hợp lệ": validate đúng
     schema câu hỏi mà màn listening đang đọc (mỗi item bắt buộc field question
     + answer/options theo format questions yaml hiện có trong
     content/english-lab/texts/l*-questions.yaml; đọc code đọc questions trong
     session.service.ts để khớp chính xác), báo lỗi đúng tên field thiếu —
     tránh lưu JSON đúng cú pháp nhưng màn learn lỗi runtime.
     Dropdown reviewState, dropdown topic (cho phép gõ chủ đề mới).
   - Nút "＋ Bài mới" tạo draft; "＋ Nguồn mới" tạo source; gắn segment vào
     activity bằng multi-select danh sách segment.
3. KHÔNG đụng submissions/assessments/vocabulary — chỉ quản lý nội dung.
   Giữ nguyên các section dashboard hiện có.

Lập Implementation Plan trước, chờ tôi duyệt. Sau sửa chạy npm run typecheck + lint + build.
```

**Xong khi:** vào `/admin` → Nội dung học → tạo 1 bài draft mới, sửa đề bài, bấm chuyển sang "Đã duyệt" → vào `/library` thấy ngay bài đó (không cần seed); chuyển về "Lưu trữ" thì bài biến khỏi thư viện nhưng lịch sử học vẫn còn; tài khoản thường gọi API bị 403.

## Nâng cấp 3 — Google Drive làm kho nội dung, đồng bộ vào app bằng 1 nút

**Mục tiêu:** anh Minh soạn/bỏ tài liệu vào **1 thư mục Google Drive** (file .md, .txt, .yaml giữ đúng format như `content/english-lab/` hiện nay — kèm 1 `manifest.yaml`), trong `/admin` bấm **"Đồng bộ từ Drive"** là app kéo nội dung về ghi vào DB theo đúng luồng seed hiện tại (chỉ nạp `review_state: approved`).

![Đồng bộ Google Drive](images/m3-04-drive-sync.svg)

**Kiến trúc đã chốt: Service Account.** Tạo service account trong Google Cloud, share thư mục Drive cho `client_email` của nó (quyền Viewer), app dùng thư viện `googleapis` đọc file server-side. Chọn cách này vì **không cần OAuth consent screen / không phải verify app với Google**, phù hợp dự án cá nhân 1 người dùng. Cách OAuth "đăng nhập Google của tôi" bị loại: app chưa verify sẽ hiện màn cảnh báo xấu và phải tự lo refresh token.

**Prompt:**

```
Tích hợp Google Drive làm nguồn nội dung, đồng bộ một chiều Drive → DB.

1. Setup (hướng dẫn tôi làm tay, ghi vào docs): tạo Google Cloud project, bật
   Drive API, tạo service account, tải JSON key; share thư mục nội dung Drive
   cho client_email của service account (quyền Viewer).
2. Env mới (gitignore, khai báo trong .env.example): GOOGLE_SERVICE_ACCOUNT_JSON
   (chuỗi JSON minify hoặc base64), GOOGLE_DRIVE_FOLDER_ID.
3. Thêm dependency googleapis (pinned version) — giải thích lý do trước khi add.
4. src/server/admin/drive-sync.ts: tái dùng parser đã tách sẵn ở
   src/server/seed/manifest-parser.ts (đã dùng chung scripts/ + server/ — kiểm
   tra và import lại, không copy-paste). Liệt kê file trong folder Drive với
   CẤU TRÚC CỐ ĐỊNH y hệt content/english-lab/: manifest.yaml ở gốc + các
   subfolder texts/, transcripts/, rubrics/ (không lồng sâu tuỳ ý); file nằm
   sai chỗ → báo lỗi rõ, không suy diễn.
   Upsert theo id giống seed: chỉ ghi khi review_state=approved, log số bản ghi
   thêm/sửa/bỏ qua.
   LUẬT CHỐNG GHI ĐÈ (bắt buộc): thêm cột origin (text, default 'admin') vào
   activities/sources — hàng tạo qua Drive sync đánh dấu 'drive', hàng seed/admin
   giữ 'admin'/'seed'. Drive sync CHỈ được cập nhật hàng origin='drive' hoặc
   tạo mới; gặp id trùng với hàng do admin soạn tay trong app (NC2) → báo xung
   đột trong kết quả sync, KHÔNG ghi đè (admin tự quyết định đổi id hoặc retired
   bản tay). Cùng luật với bài người học đã học: upsert chỉ cập nhật nội dung,
   giữ nguyên id.
5. API POST /api/v1/admin/content/sync-drive (chỉ admin): chạy đồng bộ, trả về
   {added, updated, skipped, conflicts[], errors[]}. UI /admin: nút
   "☁️ Đồng bộ từ Drive" + hiện kết quả/lỗi rõ ràng; nút "Xem thử" (dry-run)
   BẮT BUỘC gọi đúng cùng hàm parse+diff với lần ghi thật, chỉ khác flag —
   không viết code path riêng (tránh preview lệch thực thi).
6. Xử lý lỗi TÁCH LOẠI: file sai YAML/format → báo lỗi file đó, các file khác
   vẫn nạp; lỗi quota/network Drive API → báo riêng, ngừng sync, không ghi nửa
   chừng; manifest lỗi tổng → không ghi gì.

Lập Implementation Plan trước, chờ tôi duyệt. Sau sửa chạy npm run typecheck + lint + build.
```

**Xong khi:** bỏ 1 file `texts/w5-test.md` + khai báo trong `manifest.yaml` trên Drive → vào `/admin` bấm Đồng bộ (dry-run thấy 1 bài sẽ thêm) → bấm đồng bộ thật → `/library` có bài mới; sửa nội dung trên Drive rồi đồng bộ lại → nội dung trong app cập nhật; file YAML sai báo lỗi đúng tên file.

## Nâng cấp 4 — Màn ôn từ quẹt trái/quẹt phải (flashcard)

**Mục tiêu:** thêm cách ôn từ **nhanh không cần gõ chữ**: mỗi từ là 1 thẻ — mặt trước hiện cụm từ (+IPA), chạm lật thẻ xem nghĩa/câu gốc, rồi **quẹt phải = đã thuộc**, **quẹt trái = chưa thuộc**; app tự xếp lại lịch SRS theo kết quả quẹt. Bổ sung, không thay thế, màn "Ôn từ theo lịch" (micro-challenge gõ/nói câu) hiện có.

![Flashcard quẹt trái phải](images/m3-05-flashcard.svg)

**Prompt:**

```
Thêm màn ôn từ flashcard vuốt trái/phải tại /vocab/flashcards.

1. API: GET /api/v1/vocabulary/review?mode=quick&limit=20 lấy từ đến hạn (hoặc
   tất cả nếu chọn "ôn tự do"). POST /api/v1/vocabulary/review chấp nhận thêm
   mode "quick": {vocab_id, result: "know"|"dont_know"} — map know→correct,
   dont_know→incorrect, dùng đúng logic SRS (interval + masteryLevel) đang có
   trong src/server/vocabulary/service.ts; ghi vocabulary_reviews với
   reviewChannel="web-flashcard", responseModality=null. KHÔNG gọi Gemini ở
   mode này (miễn phí, nhanh) — vẫn ghi usage_events với token=0 cho thống kê.
2. UI /vocab/flashcards (client component):
   - Bộ bài thẻ: mặt trước = phrase + IPA + nút loa (Web Speech API
     speechSynthesis đọc từ — không cần lib); chạm thẻ = lật xem
     contextMeaning + câu gốc + nguồn.
   - Vuốt phải = ĐÃ THUỘC (viền xanh + bay sang phải), vuốt trái = CHƯA THUỘC
     (viền đỏ + bay sang trái). Cài touch events/pointer events thủ công bằng
     transform translateX + rotate, KHÔNG thêm dependency (react-tinder-card v.v.).
   - Kèm 2 nút ✗/✓ dưới thẻ cho desktop/người không vuốt; phím ←/→ trên desktop.
   - Nút "Hoàn tác" lấy lại thẻ vừa quẹt nhầm. QUYẾT ĐỊNH ĐÃ CHỐT: batch kết
     quả trong state, chỉ POST khi hết bộ hoặc bấm "Kết thúc" — gọn, tránh race
     ghi API giữa chừng. Đánh đổi có chủ ý: rời trang giữa bộ = mất batch (rủi
     ro thấp, chấp nhận); thêm cảnh báo beforeunload khi đã quẹt mà chưa gửi.
   - Hết bộ → màn tổng kết: số từ biết/chưa biết, nút ôn lại từ sai, link về
     màn ôn micro-challenge cho từ chưa thuộc.
3. Từ trang /vocab thêm nút "🃏 Ôn nhanh bằng thẻ" cạnh nút "Ôn từ theo lịch";
   thêm data-tour phù hợp. /today gợi ý ôn nhanh khi có từ đến hạn.
4. Mobile-first: thẻ chiếm ~70% chiều cao màn hình, swipe mượt 60fps, không
   scroll-xung-đột (khóa scroll dọc khi đang kéo ngang).

Lập Implementation Plan trước, chờ tôi duyệt. Sau sửa chạy npm run typecheck + lint + build.
```

**Xong khi:** vào `/vocab` → "Ôn nhanh bằng thẻ" → lật thẻ xem nghĩa, quẹt phải/trái trên điện thoại mượt; từ quẹt phải được hẹn lịch xa hơn (kiểm trong Sổ từ), từ quẹt trái hẹn ngày mai; quẹt nhầm bấm Hoàn tác được; hết bộ thấy tổng kết; không tốn token Gemini.

---

## Nâng cấp 5 — Làm rõ luồng học hằng ngày & điều hướng (vá điểm "mông lung")

**Bối cảnh:** rà soát code hiện tại thấy vài điểm gãy khiến người học khó hình dung "hôm nay học gì, học xong xem lại ở đâu":

- Mục **"Học"** trên thanh điều hướng dẫn tới `/learn` — chỉ là trang placeholder ("sẽ có ở Bước 3"), ngõ cụt.
- `/my-work/[submissionId]` tồn tại nhưng **không có trang danh sách `/my-work`** và không có trong menu — bài đã nộp + feedback AI không tra lại được trừ khi nhớ link.
- Thẻ bài trong Thư viện không cho biết bài nào **đã học rồi / đang dở** — chọn bài lúc nào cũng như lần đầu.
- Trang Hôm nay chỉ gợi ý 1 bài, không có **chuỗi ngày học (streak)** hay mục "tiếp tục phiên dở" cố định.
- Sổ từ hiện nhãn "⏳ Ngày mai ôn" kể cả khi lịch ôn xa hơn ngày mai — gây hiểu nhầm.

**Mục tiêu:** luồng mỗi ngày rõ một đường: Hôm nay → (ôn từ đến hạn) → làm bài gợi ý → xem feedback → về Hôm nay thấy streak/phiên dở. Mọi bài đã nộp tra lại được trong 1 chỗ.

![Luồng học hằng ngày sau khi vá](images/m3-06-luong-hoc-hang-ngay.svg)

**Prompt:**

```
Vá các điểm gãy điều hướng và làm rõ luồng học hằng ngày (chỉ UI/UX + query có sẵn,
không đổi data model):

1. Trang "Bài của tôi": tạo /my-work/page.tsx + view — danh sách submissions của
   learner (join activities để lấy title/mode), mỗi dòng: tiêu đề bài, mode,
   revision, ngày nộp, trạng thái chấm (đang chấm/xong/lỗi), badge assisted.
   Link vào /my-work/[submissionId] có sẵn. Sắp xếp mới nhất trước, lọc theo mode.
   API GET /api/v1/submissions nếu chưa có — kiểm tra trước khi viết mới.
   Thêm sẵn bộ lọc theo trạng thái chấm (tất cả / đang chấm / có feedback /
   đã gắn cờ) — lọc client-side trên dữ liệu đã fetch, không cần API riêng.
2. bottom-nav: đổi mục "Học" (/learn) thành "Bài của tôi" (/my-work) với icon
   phù hợp; XOÁ DUY NHẤT file src/app/(main)/learn/page.tsx (route gốc) và
   redirect /learn -> /library (hoặc -> phiên đang dở nếu có) — GIỮ NGUYÊN
   TOÀN BỘ /learn/[sessionId]/* (đó là nơi học thật, tuyệt đối không xoá).
3. Thư viện: mỗi thẻ bài hiện trạng thái học của learner — "Chưa học" /
   "Đang học dở" (có session active/paused) / "Đã nộp N lần". Lấy qua query
   gộp trong getApprovedActivities (left join learning_sessions + submissions,
   group theo activity) — không query lẻ từng thẻ.
4. Hôm nay: (a) thêm chip "🔥 X ngày liên tiếp" tính từ learning_sessions có
   completed trong các ngày liên tiếp gần nhất; (b) mục "Tiếp tục phiên đang dở"
   luôn hiện khi có session active/paused (nút về thẳng /learn/[sessionId]);
   (c) sau khi wrap-up xong 1 phiên, nút "Bài tiếp theo" quay về /today.
5. Sổ từ: sửa nhãn trạng thái động — "Đến hạn" / "Ôn sau N ngày nữa" tính từ
   dueAt thay vì chữ cứng "Ngày mai ôn".
6. Tour (guided-tour + tour-steps.ts): cập nhật bước trỏ vào "Bài của tôi" thay
   mục Học cũ.
7. Banner cảnh báo nội dung DEMO: hiện reading-session-view.tsx:85-94 và
   listening-session-view.tsx:418 đang fallback sang đoạn văn mẫu cứng / 1 video
   YouTube cố định khi activity thiếu segment/videoUrl — người học đang học
   nội dung giả mà không hay biết. Thêm banner vàng "⚠️ Bài này thiếu
   đoạn trích/video thật — nội dung demo tạm" khi segment/videoUrl null.
   Chỉ thêm điều kiện render, không đổi logic.
8. Today báo lỗi rõ: today-view.tsx:68-71 fetch /api/v1/today lỗi chỉ
   console.error, màn hình đứng im. Thêm state error + card lỗi + nút
   "Thử lại" theo pattern sẵn có trong settings-view.tsx.

Lập Implementation Plan trước, chờ tôi duyệt. Sau sửa chạy npm run typecheck + lint + build.
```

**Xong khi:** menu không còn mục dẫn tới trang placeholder; vào "Bài của tôi" thấy mọi bài đã nộp kèm trạng thái chấm; thẻ thư viện phân biệt bài mới/đang dở/đã làm; trang Hôm nay hiện streak và phiên đang dở; sổ từ hiện đúng ngày ôn tới.

## Thứ tự đề xuất làm

1. **NC5** (vá luồng học + điều hướng) — nhỏ, không đổi schema, vá điểm "mông lung" ngay; làm đầu.
2. **NC1** (chủ đề) — thêm cột `topic`, dùng cho NC2/NC3.
3. **NC2** (admin nội dung) — mở khoá tự quản bài.
4. **NC3** (Drive sync) — cần NC2 xong (nút đồng bộ nằm trong mục nội dung); phần setup Google Cloud làm tay ~45–60 phút lần đầu.
5. **NC4** (flashcard) — độc lập, làm lúc nào cũng được; nên làm sau NC1 để gắn gợi ý theo chủ đề.

## Việc anh Minh cần làm tay (không qua agent)

- [ ] Tạo Google Cloud project → bật Drive API → tạo service account → tải key JSON (NC3 — người làm lần đầu dự phòng ~45–60 phút).
- [ ] Tạo thư mục Drive "english-lab-content", share quyền Viewer cho email service account.
- [ ] Dán key vào `.env` local + Vercel env (không commit).

Các quyết định khác đều đã chốt sẵn trong từng prompt — danh sách chủ đề ở NC1, phương án Service Account ở NC3 — a Minh chỉ cần dán prompt và duyệt Implementation Plan.
