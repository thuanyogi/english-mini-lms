/**
 * Tests for drive-sync.ts
 * Dùng vi.mock để mock Drive client — không gọi thật Google Drive API.
 * Dùng DB thật (Supabase) cho các test conflict + dry-run.
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, sources } from "@/db/schema";

// ── Mock googleapis trước khi import drive-sync ──────────────────────────────
// Dùng vi.hoisted() để các biến mock được khởi tạo TRƯỚC khi vi.mock factory chạy
const {
  mockDownloadFileText,
  mockListFolderContents,
  mockFindFileByName,
  mockFindSubFolderId,
  mockGetDriveClient,
  mockGetDriveFolderId,
} = vi.hoisted(() => ({
  mockDownloadFileText: vi.fn(),
  mockListFolderContents: vi.fn(),
  mockFindFileByName: vi.fn(),
  mockFindSubFolderId: vi.fn(),
  mockGetDriveClient: vi.fn(() => ({})),
  mockGetDriveFolderId: vi.fn(() => "fake-folder-id"),
}));

vi.mock("@/server/providers/google-drive", () => ({
  getDriveClient: mockGetDriveClient,
  getDriveFolderId: mockGetDriveFolderId,
  listFolderContents: mockListFolderContents,
  downloadFileText: mockDownloadFileText,
  findFileByName: mockFindFileByName,
  findSubFolderId: mockFindSubFolderId,
}));

// Cần import SAU khi mock
import { syncDriveContent } from "@/server/admin/drive-sync";

// ── Test data ────────────────────────────────────────────────────────────────

const MANIFEST_VALID = `
version: 1
sources:
  - id: src-drive-test
    title: "Drive Test Source"
    kind: video
    review_state: approved
    url: https://youtube.com/watch?v=test

segments: []

activities:
  - id: W97
    mode: writing
    title: "Drive Sync Test Activity"
    review_state: approved
    duration_minutes: 15
    topic: medical
`;

const MANIFEST_INVALID_YAML = `
version: 1
activities: [unclosed
`;

const MANIFEST_NO_APPROVED = `
version: 1
activities:
  - id: W97
    mode: writing
    title: "Draft Only"
    review_state: draft
`;

// IDs dùng trong test — sẽ được clean up sau
const TEST_ACTIVITY_ID = "W97";
const TEST_SOURCE_ID = "src-drive-test";

// ── Setup: đảm bảo mock trả đúng folder structure ────────────────────────────

function setupMockDriveStructure(manifestContent: string) {
  // Root folder contents: manifest.yaml + 3 subfolder entries (returned by listFolderContents)
  mockListFolderContents.mockResolvedValue([
    { id: "manifest-file-id", name: "manifest.yaml", mimeType: "text/plain" },
    { id: "texts-folder-id", name: "texts", mimeType: "application/vnd.google-apps.folder" },
  ]);

  // manifest.yaml download
  mockDownloadFileText.mockImplementation(async (_drive: unknown, fileId: string) => {
    if (fileId === "manifest-file-id") return manifestContent;
    return null;
  });

  // Subfolder lookups
  mockFindSubFolderId.mockImplementation(async (_drive: unknown, _parentId: string, name: string) => {
    if (name === "texts") return "texts-folder-id";
    if (name === "transcripts") return "transcripts-folder-id";
    if (name === "rubrics") return null; // optional
    return null;
  });

  // No additional files needed (activity W97 has no prompt_file/rubric_file)
  mockFindFileByName.mockResolvedValue(null);
}

// ── Cleanup DB before AND after tests ────────────────────────────────────────

async function cleanupTestData() {
  // Xoá vật lý W97 test row để đảm bảo clean state (đây là test data, không phải production)
  await db.delete(activities).where(eq(activities.id, TEST_ACTIVITY_ID));
  await db.delete(sources).where(eq(sources.id, TEST_SOURCE_ID));
}

beforeAll(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("syncDriveContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDriveClient.mockReturnValue({});
    mockGetDriveFolderId.mockReturnValue("fake-folder-id");
  });

  it("dry-run: parse manifest hợp lệ → trả added list, không ghi DB", async () => {
    setupMockDriveStructure(MANIFEST_VALID);

    const result = await syncDriveContent({ dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.errors.filter((e) => !e.message.startsWith("[warning]"))).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
    // W97 chưa có trong DB → phải nằm trong added (dry-run nên DB không bị thay đổi)
    const allMentioned = [...result.added, ...result.updated];
    expect(allMentioned).toContain("activity:W97");

    // Kiểm tra DB KHÔNG có W97 (vì dry-run)
    const dbRow = await db
      .select()
      .from(activities)
      .where(eq(activities.id, TEST_ACTIVITY_ID));
    expect(dbRow).toHaveLength(0);
  });

  it("live sync: ghi activity vào DB với origin=drive", async () => {
    setupMockDriveStructure(MANIFEST_VALID);

    const result = await syncDriveContent({ dryRun: false });

    expect(result.errors.filter((e) => !e.message.startsWith("[warning]"))).toHaveLength(0);
    // Phải nằm trong added hoặc updated (idempotent)
    const allMentioned = [...result.added, ...result.updated];
    expect(allMentioned).toContain("activity:W97");

    // Kiểm tra DB
    const dbRow = await db
      .select()
      .from(activities)
      .where(eq(activities.id, TEST_ACTIVITY_ID));
    expect(dbRow).toHaveLength(1);
    expect(dbRow[0].origin).toBe("drive");
    expect(dbRow[0].title).toBe("Drive Sync Test Activity");
  });

  it("conflict: activity có origin=admin không bị ghi đè", async () => {
    // Đặt origin=admin cho W97 (giả lập bài do admin tạo)
    await db
      .update(activities)
      .set({ origin: "admin" })
      .where(eq(activities.id, TEST_ACTIVITY_ID));

    setupMockDriveStructure(MANIFEST_VALID);

    const result = await syncDriveContent({ dryRun: false });

    expect(result.conflicts.length).toBeGreaterThan(0);
    const conflict = result.conflicts.find((c) => c.id === TEST_ACTIVITY_ID);
    expect(conflict).toBeDefined();
    expect(conflict?.kind).toBe("activity");

    // Restore: đặt lại về drive để cleanup hoạt động
    await db
      .update(activities)
      .set({ origin: "drive" })
      .where(eq(activities.id, TEST_ACTIVITY_ID));
  });

  it("lỗi: manifest YAML không hợp lệ → trả errors, không ghi DB", async () => {
    setupMockDriveStructure(MANIFEST_INVALID_YAML);

    const result = await syncDriveContent({ dryRun: false });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.added).toHaveLength(0);
    expect(result.updated).toHaveLength(0);
  });

  it("không có bài approved → kết quả rỗng, không lỗi", async () => {
    setupMockDriveStructure(MANIFEST_NO_APPROVED);

    const result = await syncDriveContent({ dryRun: true });

    expect(result.errors.filter((e) => !e.message.startsWith("[warning]"))).toHaveLength(0);
    expect(result.added).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it("lỗi cấu hình: thiếu env GOOGLE_SERVICE_ACCOUNT_JSON → error ngay lập tức", async () => {
    mockGetDriveClient.mockImplementation(() => {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set.");
    });

    const result = await syncDriveContent({ dryRun: true });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain("GOOGLE_SERVICE_ACCOUNT_JSON");
  });

  it("lỗi cấu trúc: không có manifest.yaml trong folder → error", async () => {
    mockListFolderContents.mockResolvedValue([
      // Không có manifest.yaml
      { id: "texts-folder-id", name: "texts", mimeType: "application/vnd.google-apps.folder" },
    ]);
    mockFindSubFolderId.mockResolvedValue("some-folder-id");

    const result = await syncDriveContent({ dryRun: true });

    expect(result.errors.some((e) => e.message.includes("manifest.yaml"))).toBe(true);
  });
});
