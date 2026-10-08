# Hướng dẫn tích hợp Google Drive

Tài liệu này hướng dẫn từng bước thiết lập Google Drive làm nguồn nội dung học.  
Chỉ cần làm **một lần**. Sau đó dùng nút "Đồng bộ Google Drive" trong trang `/admin`.

---

## Tổng quan

```
Google Drive folder (Viewer)
        ↓  (Drive API v3, Service Account)
   drive-sync.ts
        ↓  upsert
   Supabase Postgres (activities, sources, source_segments)
```

- Đồng bộ **một chiều**: Drive → DB (không ghi ngược lại Drive)
- Chỉ import bài có `review_state: approved`
- Bài do admin tạo trực tiếp (`origin=admin`) **không bị ghi đè**

---

## Bước 1 — Tạo Google Cloud Project

1. Truy cập [console.cloud.google.com](https://console.cloud.google.com)
2. Click **"Select a project"** → **"New Project"**
3. Đặt tên: `english-mini-lms` (hoặc tên tuỳ chọn)
4. Click **"Create"**

---

## Bước 2 — Bật Drive API

1. Trong project vừa tạo, vào **"APIs & Services" → "Library"**
2. Tìm `Google Drive API`
3. Click **"Enable"**

---

## Bước 3 — Tạo Service Account

1. Vào **"APIs & Services" → "Credentials"**
2. Click **"Create Credentials" → "Service Account"**
3. Điền thông tin:
   - **Service account name**: `lms-drive-reader`
   - **Service account ID**: tự động điền
   - **Description**: `Read-only access to content folder`
4. Click **"Create and Continue"**
5. **Role**: bỏ qua (không cần role gì ở cấp project) → **"Continue"**
6. Click **"Done"**

---

## Bước 4 — Tải JSON Key

1. Trong trang **"Credentials"**, click vào service account vừa tạo
2. Tab **"Keys"** → **"Add Key" → "Create new key"**
3. Chọn **JSON** → **"Create"**
4. File `*.json` tự động tải về — **giữ file này bí mật, không commit lên git**

---

## Bước 5 — Share thư mục Drive

1. Mở [drive.google.com](https://drive.google.com)
2. Tạo (hoặc chọn) thư mục chứa nội dung học
3. **Cấu trúc bắt buộc** trong thư mục:
   ```
   manifest.yaml          ← bắt buộc, ở gốc thư mục
   texts/                 ← thư mục chứa file .txt cho bài đọc
   transcripts/           ← thư mục chứa file .txt cho transcript nghe
   rubrics/               ← thư mục chứa file .yaml cho rubric
   ```
4. Click chuột phải vào thư mục → **"Share"**
5. Dán `client_email` từ file JSON key (dạng `xxx@yyy.iam.gserviceaccount.com`)
6. Chọn quyền **"Viewer"** → **"Send"**
7. Sao chép **Folder ID** từ URL:
   ```
   https://drive.google.com/drive/folders/1abc123XYZ...
                                          ↑ đây là Folder ID
   ```

---

## Bước 6 — Thiết lập biến môi trường

Mở file `.env.local` (hoặc tạo nếu chưa có), thêm:

```env
# Google Drive Integration
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"...","client_email":"...@....iam.gserviceaccount.com",...}
GOOGLE_DRIVE_FOLDER_ID=1abc123XYZ...
```

> **Cách lấy `GOOGLE_SERVICE_ACCOUNT_JSON`:**  
> Mở file JSON key đã tải, xoá xuống dòng, nén thành 1 dòng:
> ```bash
> # macOS / Linux
> cat service-account-key.json | tr -d '\n'
> 
> # PowerShell (Windows)
> (Get-Content service-account-key.json -Raw) -replace "`n","" -replace "`r",""
> ```
> Dán kết quả vào giá trị của `GOOGLE_SERVICE_ACCOUNT_JSON`.

---

## Kiểm tra nhanh

Sau khi thiết lập, vào trang `/admin` → tab **"Đồng bộ"** → chọn **Dry-run** → **Đồng bộ Google Drive**.  
Nếu kết nối thành công sẽ hiện kết quả parse manifest. Nếu lỗi sẽ hiện thông báo cụ thể.

---

## Lưu ý bảo mật

| ✅ Làm | ❌ Không làm |
|--------|-------------|
| Lưu JSON key trong `.env.local` | Commit JSON key lên git |
| Giới hạn quyền Drive ở mức Viewer | Cấp quyền Editor/Owner |
| Xoay key định kỳ (6 tháng/lần) | Để key cũ không dùng |
| Chỉ share đúng thư mục cần thiết | Share toàn bộ My Drive |
