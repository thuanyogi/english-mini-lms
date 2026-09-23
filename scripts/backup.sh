#!/usr/bin/env bash
set -e

# ==============================================================
# Script sao lưu English Mini LMS
# 1. pg_dump Postgres database từ DATABASE_URL
# 2. Tải toàn bộ media learner từ Supabase Storage bucket learner-media
# Thư mục đích: ./backups/YYYY-MM-DD/
# ==============================================================

DATE=$(date +%Y-%m-%d)
BACKUP_DIR="./backups/$DATE"

echo "=========================================="
echo "  English Mini LMS — Bắt đầu Sao Lưu"
echo "  Ngày: $DATE"
echo "  Thư mục: $BACKUP_DIR"
echo "=========================================="

mkdir -p "$BACKUP_DIR"

# 1. Đọc DATABASE_URL từ .env.local nếu chưa có trong env
if [ -z "$DATABASE_URL" ] && [ -f .env.local ]; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

if [ -z "$DATABASE_URL" ]; then
  echo "⚠️ CẢNH BÁO: Không tìm thấy biến DATABASE_URL. Bỏ qua bước pg_dump."
  echo "Vui lòng kiểm tra lại file .env.local hoặc xuất biến môi trường DATABASE_URL."
else
  echo "[1/2] Đang sao lưu cơ sở dữ liệu Postgres bằng pg_dump..."
  if command -v pg_dump &> /dev/null; then
    pg_dump "$DATABASE_URL" --clean --if-exists -F p -f "$BACKUP_DIR/database.sql"
    echo "✓ Đã lưu database dump: $BACKUP_DIR/database.sql"
  else
    echo "⚠️ Lệnh pg_dump chưa được cài đặt trên hệ thống."
    echo "   Bạn có thể xuất dump qua Supabase Dashboard -> Database -> Backups,"
    echo "   hoặc cài đặt postgresql-client."
  fi
fi

# 2. Tải toàn bộ audio từ bucket learner-media
echo "[2/2] Đang sao lưu media files từ bucket learner-media..."
npx tsx scripts/backup-media.ts "$BACKUP_DIR/media"

echo "=========================================="
echo "✓ Sao lưu hoàn tất vào thư mục: $BACKUP_DIR"
echo "=========================================="
