# ==============================================================
# PowerShell script sao lưu English Mini LMS cho Windows
# 1. pg_dump Postgres database từ DATABASE_URL
# 2. Tải toàn bộ media learner từ Supabase Storage bucket learner-media
# Thư mục đích: ./backups/YYYY-MM-DD/
# ==============================================================

$dateStr = Get-Date -Format "yyyy-MM-dd"
$backupDir = "./backups/$dateStr"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  English Mini LMS — Bắt đầu Sao Lưu" -ForegroundColor Cyan
Write-Host "  Ngày: $dateStr" -ForegroundColor Cyan
Write-Host "  Thư mục: $backupDir" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if (-not (Test-Path -Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# 1. Đọc DATABASE_URL từ .env.local nếu cần
$dbUrl = $env:DATABASE_URL
if (-not $dbUrl -and (Test-Path -Path ".env.local")) {
    $envLines = Get-Content ".env.local"
    foreach ($line in $envLines) {
        if ($line -match "^DATABASE_URL=(.*)$") {
            $dbUrl = $matches[1].Trim('"').Trim("'")
            break
        }
    }
}

if (-not $dbUrl) {
    Write-Host "⚠️ CẢNH BÁO: Không tìm thấy biến DATABASE_URL. Bỏ qua pg_dump." -ForegroundColor Yellow
} else {
    Write-Host "[1/2] Đang sao lưu cơ sở dữ liệu Postgres bằng pg_dump..." -ForegroundColor Green
    $pgDumpCmd = Get-Command "pg_dump" -ErrorAction SilentlyContinue
    if ($pgDumpCmd) {
        & pg_dump "$dbUrl" --clean --if-exists -F p -f "$backupDir/database.sql"
        Write-Host "✓ Đã lưu database dump: $backupDir/database.sql" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Lệnh pg_dump chưa được cài đặt trên máy. Bạn có thể sao lưu trực tiếp trên Supabase Dashboard." -ForegroundColor Yellow
    }
}

# 2. Tải toàn bộ audio từ bucket learner-media
Write-Host "[2/2] Đang sao lưu media files từ bucket learner-media..." -ForegroundColor Green
npx.cmd tsx scripts/backup-media.ts "$backupDir/media"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✓ Sao lưu hoàn tất vào thư mục: $backupDir" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
