import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Đọc biến môi trường từ .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });

const BUCKET_NAME = "learner-media";

async function main() {
  const targetDir =
    process.argv[2] ||
    path.join(
      process.cwd(),
      "backups",
      new Date().toISOString().slice(0, 10),
      "media"
    );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "[Backup Media] Cảnh báo: NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình. Bỏ qua tải media."
    );
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log(`[Backup Media] Đang kết nối tới Supabase bucket "${BUCKET_NAME}"...`);
  fs.mkdirSync(targetDir, { recursive: true });

  try {
    // 1. Lấy danh sách thư mục gốc / learners trong bucket
    const { data: rootItems, error: rootError } = await supabase.storage
      .from(BUCKET_NAME)
      .list();

    if (rootError) {
      console.warn(`[Backup Media] Lỗi khi liệt kê bucket (có thể bucket rỗng hoặc chưa cấp quyền): ${rootError.message}`);
      return;
    }

    if (!rootItems || rootItems.length === 0) {
      console.log(`[Backup Media] Bucket "${BUCKET_NAME}" hiện không có file nào.`);
      return;
    }

    let totalFiles = 0;

    for (const item of rootItems) {
      // Nếu là folder learner_xxx
      if (!item.id && item.name) {
        const { data: subFiles, error: subError } = await supabase.storage
          .from(BUCKET_NAME)
          .list(item.name);

        if (subError) {
          console.warn(`[Backup Media] Không thể đọc folder ${item.name}: ${subError.message}`);
          continue;
        }

        if (subFiles) {
          for (const subFile of subFiles) {
            if (subFile.name && subFile.id) {
              const remotePath = `${item.name}/${subFile.name}`;
              const localSubDir = path.join(targetDir, item.name);
              fs.mkdirSync(localSubDir, { recursive: true });
              const localFilePath = path.join(localSubDir, subFile.name);

              const { data: blob, error: dlError } = await supabase.storage
                .from(BUCKET_NAME)
                .download(remotePath);

              if (dlError) {
                console.error(`[Backup Media] Lỗi tải file ${remotePath}: ${dlError.message}`);
              } else if (blob) {
                const arrayBuffer = await blob.arrayBuffer();
                fs.writeFileSync(localFilePath, Buffer.from(arrayBuffer));
                console.log(`[Backup Media] ✓ Đã lưu: ${remotePath} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`);
                totalFiles++;
              }
            }
          }
        }
      } else if (item.name) {
        // File trực tiếp ở root
        const remotePath = item.name;
        const localFilePath = path.join(targetDir, item.name);
        const { data: blob, error: dlError } = await supabase.storage
          .from(BUCKET_NAME)
          .download(remotePath);

        if (!dlError && blob) {
          const arrayBuffer = await blob.arrayBuffer();
          fs.writeFileSync(localFilePath, Buffer.from(arrayBuffer));
          console.log(`[Backup Media] ✓ Đã lưu: ${remotePath} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`);
          totalFiles++;
        }
      }
    }

    console.log(`[Backup Media] Hoàn thành: Đã tải ${totalFiles} file âm thanh về ${targetDir}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Backup Media] Lỗi trong quá trình sao lưu media: ${errorMsg}`);
  }
}

main();
