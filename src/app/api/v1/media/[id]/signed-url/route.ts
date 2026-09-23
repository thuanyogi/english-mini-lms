import { NextRequest, NextResponse } from "next/server";
import { getCurrentLearner } from "@/server/auth";
import {
  getMediaObject,
  getMediaSignedUrl,
  MediaValidationError,
} from "@/server/media/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await params;
    const media = await getMediaObject(id, learner.id);
    const signedUrl = await getMediaSignedUrl(media.storageKey, 600); // 10 phút

    return NextResponse.json({
      media_id: media.id,
      signed_url: signedUrl,
      expires_in_seconds: 600,
    });
  } catch (error) {
    if (error instanceof MediaValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Lỗi GET /api/v1/media/[id]/signed-url:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
