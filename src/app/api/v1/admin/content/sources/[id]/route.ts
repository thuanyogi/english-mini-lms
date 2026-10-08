import { NextResponse } from "next/server";
import { contentErrorResponse, guardAdmin, readJsonBody } from "@/server/admin/admin-guard";
import { updateContentSource } from "@/server/admin/content-sources-service";

export const dynamic = "force-dynamic";

// Cố ý KHÔNG có DELETE: gỡ nguồn bằng PATCH { reviewState: "retired" }.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  try {
    const { id } = await ctx.params;
    const source = await updateContentSource(id, await readJsonBody(req));
    return NextResponse.json({ source });
  } catch (error) {
    return contentErrorResponse("PATCH /api/v1/admin/content/sources/[id]", error);
  }
}
