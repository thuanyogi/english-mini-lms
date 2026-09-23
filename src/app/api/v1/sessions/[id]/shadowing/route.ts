import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { mediaObjects, learningSessions } from "@/db/schema";
import { getCurrentLearner } from "@/server/auth";
import { downloadMediaBuffer } from "@/server/media/service";
import { evaluateSpeaking } from "@/server/providers/gemini";

const ShadowingSchema = z.object({
  media_id: z.string().uuid(),
  sentence: z.string().min(1),
  startSeconds: z.number().optional(),
  endSeconds: z.number().optional(),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const body = await req.json();
    const parsed = ShadowingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: parsed.error.format() },
        { status: 422 }
      );
    }

    // Kiểm tra phiên học thuộc về học viên
    const [session] = await db
      .select({ id: learningSessions.id })
      .from(learningSessions)
      .where(and(eq(learningSessions.id, sessionId), eq(learningSessions.learnerId, learner.id)))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: "Phiên học không tồn tại" }, { status: 404 });
    }

    // Kiểm tra media_object đã sẵn sàng
    const [media] = await db
      .select()
      .from(mediaObjects)
      .where(and(eq(mediaObjects.id, parsed.data.media_id), eq(mediaObjects.learnerId, learner.id)))
      .limit(1);

    if (!media || media.status !== "ready") {
      return NextResponse.json(
        { error: "Tệp âm thanh chưa sẵn sàng hoặc không tồn tại" },
        { status: 422 }
      );
    }

    // Tải audio buffer từ Supabase Storage
    const audioBuffer = await downloadMediaBuffer(media.storageKey);

    // Chấm speaking cho câu shadowing bám theo verified_transcript của chính câu đó
    const prompt = `Đây là bài luyện Shadowing câu tiếng Anh: "${parsed.data.sentence}". Hãy so sánh phát âm và độ chính xác của người học so với câu mẫu này.`;
    const evalResult = await evaluateSpeaking(
      { buffer: audioBuffer, mimeType: media.mimeType },
      prompt,
      parsed.data.sentence
    );

    return NextResponse.json({
      success: true,
      feedback: evalResult.feedback,
    });
  } catch (error) {
    console.error("Lỗi POST /api/v1/sessions/[id]/shadowing:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
