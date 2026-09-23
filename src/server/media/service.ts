import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { mediaObjects } from "@/db/schema";

export class MediaValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 422) {
    super(message);
    this.name = "MediaValidationError";
    this.statusCode = statusCode;
  }
}

const ALLOWED_AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/mpeg",
  "audio/x-m4a",
  "audio/aac",
];

const MAX_AUDIO_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const BUCKET_NAME = "learner-media";

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase credentials are not set in environment");
  }

  return createClient(url, key);
}

function getFileExtension(mimeType: string): string {
  const baseMime = mimeType.split(";")[0].trim().toLowerCase();
  switch (baseMime) {
    case "audio/webm":
      return "webm";
    case "audio/mp4":
    case "audio/x-m4a":
      return "m4a";
    case "audio/ogg":
      return "ogg";
    case "audio/wav":
      return "wav";
    case "audio/mpeg":
      return "mp3";
    default:
      return "audio";
  }
}

/**
 * 1. Upload file âm thanh vào Supabase Storage bucket private "learner-media"
 * và tạo bản ghi media_objects (pending -> ready sau khi kiểm tra MIME/size).
 */
export async function uploadLearnerMedia(
  learnerId: string,
  buffer: Buffer,
  mimeType: string,
  durationSeconds?: number
) {
  // Chuẩn hóa MIME type (loại bỏ parameters như codecs=opus)
  const baseMime = mimeType.split(";")[0].trim().toLowerCase();

  // Kiểm tra MIME hợp lệ
  if (!ALLOWED_AUDIO_MIME_TYPES.includes(baseMime)) {
    throw new MediaValidationError(
      `Định dạng âm thanh "${mimeType}" không được hỗ trợ. Chỉ chấp nhận webm, mp4, ogg, wav, m4a, mp3.`,
      415
    );
  }

  // Kiểm tra kích thước (tối đa 20MB)
  if (buffer.length > MAX_AUDIO_SIZE_BYTES) {
    throw new MediaValidationError(
      `Dung lượng file (${(buffer.length / 1024 / 1024).toFixed(1)} MB) vượt quá giới hạn cho phép (20 MB).`,
      413
    );
  }

  const ext = getFileExtension(mimeType);
  const mediaId = randomUUID();
  const storageKey = `learner_${learnerId}/${Date.now()}_${mediaId}.${ext}`;

  // Bước 1: Tạo bản ghi pending
  await db
    .insert(mediaObjects)
    .values({
      id: mediaId,
      learnerId,
      storageKey,
      mimeType: baseMime,
      sizeBytes: buffer.length,
      durationSeconds: durationSeconds || null,
      status: "pending",
    });

  // Bước 2: Upload lên Supabase Storage bucket "learner-media"
  const supabase = getStorageClient();

  try {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storageKey, buffer, {
        contentType: baseMime,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError);
      // Đánh dấu failed nếu lỗi storage
      await db
        .update(mediaObjects)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(mediaObjects.id, mediaId));

      throw new Error(`Upload vào storage thất bại: ${uploadError.message}`);
    }

    // Cập nhật media_objects thành ready
    const [readyMedia] = await db
      .update(mediaObjects)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(mediaObjects.id, mediaId))
      .returning();

    return readyMedia;
  } catch (err) {
    await db
      .update(mediaObjects)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(mediaObjects.id, mediaId));

    throw err;
  }
}

/**
 * 2. Lấy thông tin media_object và xác thực quyền sở hữu
 */
export async function getMediaObject(mediaId: string, learnerId: string) {
  const [media] = await db
    .select()
    .from(mediaObjects)
    .where(and(eq(mediaObjects.id, mediaId), eq(mediaObjects.learnerId, learnerId)))
    .limit(1);

  if (!media) {
    throw new MediaValidationError("Không tìm thấy tệp âm thanh.", 404);
  }

  return media;
}

/**
 * 3. Tạo Signed URL thời hạn 10 phút (600 giây) để nghe lại an toàn
 */
export async function getMediaSignedUrl(storageKey: string, expiresInSeconds = 600) {
  const supabase = getStorageClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storageKey, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Không thể tạo signed URL: ${error?.message || "Unknown error"}`);
  }

  return data.signedUrl;
}

/**
 * 4. Tải file âm thanh dưới dạng Buffer để truyền cho Gemini evaluateSpeaking
 */
export async function downloadMediaBuffer(storageKey: string): Promise<Buffer> {
  const supabase = getStorageClient();
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(storageKey);

  if (error || !data) {
    throw new Error(`Không thể tải audio từ storage: ${error?.message || "File rỗng"}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
