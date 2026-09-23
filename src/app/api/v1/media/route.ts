import { NextRequest, NextResponse } from "next/server";
import { getCurrentLearner } from "@/server/auth";
import { uploadLearnerMedia, MediaValidationError } from "@/server/media/service";

export async function POST(req: NextRequest) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const durationRaw = formData.get("durationSeconds") || formData.get("duration_seconds");
    const durationSeconds = durationRaw ? parseInt(String(durationRaw), 10) : undefined;

    if (!file) {
      return NextResponse.json(
        { error: "Vui lòng chọn hoặc đính kèm tệp âm thanh 'file'" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const media = await uploadLearnerMedia(
      learner.id,
      buffer,
      file.type || "audio/webm",
      durationSeconds
    );

    return NextResponse.json(
      {
        media_id: media.id,
        status: media.status,
        storage_key: media.storageKey,
        size_bytes: media.sizeBytes,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof MediaValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Lỗi POST /api/v1/media:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
