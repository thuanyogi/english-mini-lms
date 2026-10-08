import { NextResponse } from "next/server";
import { contentErrorResponse, guardAdmin, readJsonBody } from "@/server/admin/admin-guard";
import { updateContentActivity } from "@/server/admin/content-service";

export const dynamic = "force-dynamic";

// Cố ý KHÔNG có DELETE: muốn gỡ bài thì PATCH { reviewState: "retired" }.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  try {
    const { id } = await ctx.params;
    const activity = await updateContentActivity(id, await readJsonBody(req));
    return NextResponse.json({ activity });
  } catch (error) {
    return contentErrorResponse("PATCH /api/v1/admin/content/activities/[id]", error);
  }
}
