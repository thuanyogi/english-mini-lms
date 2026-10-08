import { NextResponse } from "next/server";
import {
  contentErrorResponse,
  guardAdmin,
  readJsonBody,
} from "@/server/admin/admin-guard";
import { syncDriveContent } from "@/server/admin/drive-sync";

export const dynamic = "force-dynamic";
// Drive API có thể chậm — tăng timeout lên 60s
export const maxDuration = 60;

/**
 * POST /api/v1/admin/content/sync-drive
 * Body: { dryRun?: boolean }
 * Response: SyncResult
 *
 * Admin-only. Đồng bộ nội dung từ Google Drive về DB.
 */
export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const body = await readJsonBody(req);
    const bodyTyped = body as Record<string, unknown> | null;
    const dryRun = Boolean(bodyTyped?.dryRun ?? false);

    const result = await syncDriveContent({ dryRun });
    return NextResponse.json(result);
  } catch (error) {
    return contentErrorResponse("POST /api/v1/admin/content/sync-drive", error);
  }
}
