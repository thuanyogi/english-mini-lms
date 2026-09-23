import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { getCurrentLearner } from "@/server/auth";
import { db } from "@/db";
import {
  learners,
  vocabularyVault,
  learningSessions,
  submissions,
  assessments,
  feedbackVersions,
  mediaObjects,
} from "@/db/schema";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json(
        { error: "Unauthorized — Vui lòng đăng nhập" },
        { status: 401 }
      );
    }

    // 1. Thông tin học viên
    const [learnerProfile] = await db
      .select()
      .from(learners)
      .where(eq(learners.id, learner.id))
      .limit(1);

    // 2. Sổ từ vựng
    const vocabList = await db
      .select()
      .from(vocabularyVault)
      .where(eq(vocabularyVault.learnerId, learner.id));

    // 3. Các phiên học
    const sessionsList = await db
      .select()
      .from(learningSessions)
      .where(eq(learningSessions.learnerId, learner.id));

    // 4. Các bài nộp (chỉ bài chưa bị xóa)
    const submissionsList = await db
      .select()
      .from(submissions)
      .where(
        eq(submissions.learnerId, learner.id)
      );
    const activeSubmissions = submissionsList.filter((s) => !s.deletedAt);

    // 5. Đánh giá và nhận xét AI
    const submissionIds = activeSubmissions.map((s) => s.id);
    let assessmentsList: Array<typeof assessments.$inferSelect> = [];
    let feedbackList: Array<typeof feedbackVersions.$inferSelect> = [];

    if (submissionIds.length > 0) {
      assessmentsList = await db
        .select()
        .from(assessments)
        .where(inArray(assessments.submissionId, submissionIds));

      const assessmentIds = assessmentsList.map((a) => a.id);
      if (assessmentIds.length > 0) {
        feedbackList = await db
          .select()
          .from(feedbackVersions)
          .where(inArray(feedbackVersions.assessmentId, assessmentIds));
      }
    }

    // 6. Danh sách media objects và tạo Signed URLs tải file (hạn 24 giờ)
    const mediaList = await db
      .select()
      .from(mediaObjects)
      .where(eq(mediaObjects.learnerId, learner.id));

    const supabase = getStorageClient();
    const mediaWithDownloadUrls = await Promise.all(
      mediaList.map(async (m) => {
        let downloadUrl: string | null = null;
        if (supabase && m.storageKey) {
          try {
            const { data } = await supabase.storage
              .from("learner-media")
              .createSignedUrl(m.storageKey, 86400); // 24h
            if (data?.signedUrl) {
              downloadUrl = data.signedUrl;
            }
          } catch (e) {
            console.warn("Could not create signed url for media:", m.id, e);
          }
        }
        return {
          id: m.id,
          storageKey: m.storageKey,
          mimeType: m.mimeType,
          sizeBytes: m.sizeBytes,
          durationSeconds: m.durationSeconds,
          status: m.status,
          createdAt: m.createdAt,
          downloadUrl,
        };
      })
    );

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      app: "English Mini LMS",
      version: "1.0",
      learner: learnerProfile,
      vocabularyVault: vocabList,
      learningSessions: sessionsList,
      submissions: activeSubmissions,
      assessments: assessmentsList,
      feedbackVersions: feedbackList,
      mediaObjects: mediaWithDownloadUrls,
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="english-mini-lms-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Export data error:", errorMsg);
    return NextResponse.json(
      { error: "Lỗi khi xuất dữ liệu: " + errorMsg },
      { status: 500 }
    );
  }
}
