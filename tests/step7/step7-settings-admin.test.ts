import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { db } from "@/db";
import {
  learners,
  learningSessions,
  submissions,
  activities,
  usageEvents,
} from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { getAdminDashboardData } from "@/server/admin/service";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

describe("Bước 7: Vercel Deploy, PWA, Backup, Settings & Admin", () => {
  let learnerId: string;

  beforeAll(async () => {
    // Đảm bảo có learner dev
    const [existing] = await db
      .select()
      .from(learners)
      .where(eq(learners.userId, TEST_USER_ID))
      .limit(1);

    if (existing) {
      learnerId = existing.id;
    } else {
      const [created] = await db
        .insert(learners)
        .values({
          userId: TEST_USER_ID,
          displayName: "BS. Minh (Test Step 7)",
          role: "admin",
          preferences: { remindEnabled: false, remindTime: "20:00" },
        })
        .returning();
      learnerId = created.id;
    }
  });

  describe("1. PWA tối thiểu & Vercel Config", () => {
    it("File manifest.json tồn tại và có cấu trúc hợp lệ", () => {
      const manifestPath = path.join(process.cwd(), "public", "manifest.json");
      expect(fs.existsSync(manifestPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      expect(content.name).toContain("English Mini LMS");
      expect(content.short_name).toBeDefined();
      expect(content.start_url).toBe("/today");
      expect(content.display).toBe("standalone");
      expect(content.icons.length).toBeGreaterThanOrEqual(2);
    });

    it("Icons PWA 192 và 512 tồn tại trong thư mục public/icons/", () => {
      const icon192 = path.join(process.cwd(), "public", "icons", "icon-192.svg");
      const icon512 = path.join(process.cwd(), "public", "icons", "icon-512.svg");
      expect(fs.existsSync(icon192)).toBe(true);
      expect(fs.existsSync(icon512)).toBe(true);
    });

    it("Service Worker sw.js chỉ cache app shell, tuyệt đối không cache audio và API", () => {
      const swPath = path.join(process.cwd(), "public", "sw.js");
      expect(fs.existsSync(swPath)).toBe(true);

      const swContent = fs.readFileSync(swPath, "utf-8");
      // Phải có logic bypass /api/ và audio
      expect(swContent.toLowerCase()).toContain("/api/");
      expect(swContent.toLowerCase()).toContain("audio");
      expect(swContent.toLowerCase()).toContain("learner-media");
      expect(swContent.toLowerCase()).toContain("app shell");
    });
  });

  describe("2. Sao lưu (Backup Scripts) và Runbook Vận hành", () => {
    it("Scripts backup.sh và backup.ps1 tồn tại", () => {
      const shPath = path.join(process.cwd(), "scripts", "backup.sh");
      const ps1Path = path.join(process.cwd(), "scripts", "backup.ps1");
      const mediaScript = path.join(process.cwd(), "scripts", "backup-media.ts");

      expect(fs.existsSync(shPath)).toBe(true);
      expect(fs.existsSync(ps1Path)).toBe(true);
      expect(fs.existsSync(mediaScript)).toBe(true);
    });

    it(".gitignore đã bao gồm thư mục backups/ và *.sql", () => {
      const gitignore = fs.readFileSync(path.join(process.cwd(), ".gitignore"), "utf-8");
      expect(gitignore).toContain("backups/");
      expect(gitignore).toContain("*.sql");
    });

    it("docs/RUNBOOK.md đầy đủ 4 hướng dẫn vận hành", () => {
      const runbookPath = path.join(process.cwd(), "docs", "RUNBOOK.md");
      expect(fs.existsSync(runbookPath)).toBe(true);

      const content = fs.readFileSync(runbookPath, "utf-8");
      expect(content).toContain("Sao lưu định kỳ");
      expect(content).toContain("Khôi phục dữ liệu");
      expect(content).toContain("đổi API Key");
      expect(content).toContain("usage_events");
      expect(content).toContain("chi phí");
    });
  });

  describe("3. Cài đặt (/settings) & Soft Delete bài làm", () => {
    it("Cập nhật preferences (tắt/bật nhắc học) lưu đúng vào database", async () => {
      const newPrefs = {
        remindEnabled: true,
        remindTime: "21:30",
        updatedAt: new Date().toISOString(),
      };

      await db
        .update(learners)
        .set({ preferences: newPrefs })
        .where(eq(learners.id, learnerId));

      const [updated] = await db
        .select({ preferences: learners.preferences })
        .from(learners)
        .where(eq(learners.id, learnerId))
        .limit(1);

      const savedPrefs = updated?.preferences as typeof newPrefs;
      expect(savedPrefs.remindEnabled).toBe(true);
      expect(savedPrefs.remindTime).toBe("21:30");
    });

    it("Soft delete: đánh dấu deleted_at và bị loại khỏi các truy vấn hoạt động", async () => {
      // 1. Tạo session mẫu
      const [act] = await db.select().from(activities).limit(1);
      if (!act) return;

      const [session] = await db
        .insert(learningSessions)
        .values({
          learnerId,
          activityId: act.id,
          targetMinutes: 30,
          status: "completed",
        })
        .returning();

      // 2. Tạo submission
      const [sub] = await db
        .insert(submissions)
        .values({
          sessionId: session.id,
          learnerId,
          body: "Bản nháp kiểm tra soft delete",
          modality: "text",
        })
        .returning();

      // Kiểm tra ban đầu chưa xoá
      const [activeBefore] = await db
        .select()
        .from(submissions)
        .where(and(eq(submissions.id, sub.id), isNull(submissions.deletedAt)));
      expect(activeBefore).toBeDefined();

      // Thực hiện soft delete
      await db
        .update(submissions)
        .set({ deletedAt: new Date() })
        .where(eq(submissions.id, sub.id));

      // Kiểm tra sau khi soft delete
      const activeAfter = await db
        .select()
        .from(submissions)
        .where(and(eq(submissions.id, sub.id), isNull(submissions.deletedAt)));
      expect(activeAfter.length).toBe(0);

      // Bản ghi vẫn còn trong DB để đảm bảo tính toàn vẹn
      const [record] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.id, sub.id));
      expect(record.deletedAt).not.toBeNull();
    });
  });

  describe("4. Quản trị (/admin) & Token Tracking", () => {
    it("Admin service trả về danh sách activities kèm review_state", async () => {
      const data = await getAdminDashboardData();
      expect(data.activities).toBeDefined();
      expect(Array.isArray(data.activities)).toBe(true);

      if (data.activities.length > 0) {
        const first = data.activities[0];
        expect(first.id).toBeDefined();
        expect(first.title).toBeDefined();
        expect(first.mode).toBeDefined();
        expect(first.reviewState).toBeDefined();
      }
    });

    it("Admin service tổng hợp token và chi phí tháng này chính xác", async () => {
      // Ghi một usage event mẫu
      await db.insert(usageEvents).values({
        learnerId,
        action: "evaluate_writing_test",
        tokenInput: 1500,
        tokenOutput: 300,
        modelName: "gemini-2.5-flash",
        costEstimate: 0.00045,
      });

      const data = await getAdminDashboardData();
      expect(data.usage).toBeDefined();
      expect(data.usage.totalRequests).toBeGreaterThanOrEqual(1);
      expect(data.usage.totalInputTokens).toBeGreaterThanOrEqual(1500);
      expect(data.usage.totalOutputTokens).toBeGreaterThanOrEqual(300);
      expect(data.usage.totalEstimatedCostUsd).toBeGreaterThan(0);

      const foundAction = data.usage.actionBreakdown.find(
        (a) => a.action === "evaluate_writing_test"
      );
      expect(foundAction).toBeDefined();
      expect(foundAction?.count).toBeGreaterThanOrEqual(1);
    });
  });
});
