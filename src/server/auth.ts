import { eq } from "drizzle-orm";
import { db } from "@/db";
import { learners } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export interface CurrentLearner {
  id: string;
  userId: string;
  displayName: string | null;
  role: "learner" | "admin";
}

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Lấy thông tin learner hiện tại từ Supabase Auth session.
 * Tự động tạo bản ghi learners nếu người dùng mới đăng nhập lần đầu.
 * Hỗ trợ dev bypass khi bật biến DEV_BYPASS_AUTH=true.
 */
export async function getCurrentLearner(): Promise<CurrentLearner | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const [existing] = await db
      .select({
        id: learners.id,
        userId: learners.userId,
        displayName: learners.displayName,
        role: learners.role,
      })
      .from(learners)
      .where(eq(learners.userId, user.id))
      .limit(1);

    if (existing) {
      return existing;
    }

    // Tự động tạo bản ghi learner đầu tiên cho user
    const [created] = await db
      .insert(learners)
      .values({
        userId: user.id,
        displayName: user.email ? user.email.split("@")[0] : "BS. Minh",
        role: "learner",
      })
      .returning({
        id: learners.id,
        userId: learners.userId,
        displayName: learners.displayName,
        role: learners.role,
      });

    return created;
  }

  // Chế độ phát triển dev bypass
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_BYPASS_AUTH === "true"
  ) {
    const [devLearner] = await db
      .select({
        id: learners.id,
        userId: learners.userId,
        displayName: learners.displayName,
        role: learners.role,
      })
      .from(learners)
      .where(eq(learners.userId, DEV_USER_ID))
      .limit(1);

    if (devLearner) {
      return devLearner;
    }

    const [createdDev] = await db
      .insert(learners)
      .values({
        userId: DEV_USER_ID,
        displayName: "BS. Minh (Dev)",
        role: "learner",
      })
      .returning({
        id: learners.id,
        userId: learners.userId,
        displayName: learners.displayName,
        role: learners.role,
      });

    return createdDev;
  }

  return null;
}
