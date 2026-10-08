import { NextResponse } from "next/server";
import { contentErrorResponse, guardAdmin, readJsonBody } from "@/server/admin/admin-guard";
import { updateContentSegment } from "@/server/admin/content-sources-service";

export const dynamic = "force-dynamic";

// Cố ý KHÔNG có DELETE: segment không có trạng thái, chỉ có thể gỡ khỏi bài (PATCH segmentIds của activity).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  try {
    const { id } = await ctx.params;
    const segment = await updateContentSegment(id, await readJsonBody(req));
    return NextResponse.json({ segment });
  } catch (error) {
    return contentErrorResponse("PATCH /api/v1/admin/content/segments/[id]", error);
  }
}
