import { NextResponse } from "next/server";
import { contentErrorResponse, guardAdmin, readJsonBody } from "@/server/admin/admin-guard";
import { ContentError } from "@/server/admin/content-errors";
import { createContentSource, listContentSources } from "@/server/admin/content-sources-service";
import { REVIEW_STATES, isOneOf } from "@/lib/content-constants";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  try {
    const state = new URL(req.url).searchParams.get("state") ?? "all";
    if (state !== "all" && !isOneOf(REVIEW_STATES, state)) {
      throw new ContentError(422, "state phải là all hoặc một reviewState hợp lệ");
    }
    return NextResponse.json({ sources: await listContentSources(state) });
  } catch (error) {
    return contentErrorResponse("GET /api/v1/admin/content/sources", error);
  }
}

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  try {
    const source = await createContentSource(await readJsonBody(req));
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    return contentErrorResponse("POST /api/v1/admin/content/sources", error);
  }
}
