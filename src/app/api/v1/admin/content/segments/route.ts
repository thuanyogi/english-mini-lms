import { NextResponse } from "next/server";
import { contentErrorResponse, guardAdmin, readJsonBody } from "@/server/admin/admin-guard";
import { createContentSegment, listContentSegments } from "@/server/admin/content-sources-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json({ segments: await listContentSegments() });
  } catch (error) {
    return contentErrorResponse("GET /api/v1/admin/content/segments", error);
  }
}

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  try {
    const segment = await createContentSegment(await readJsonBody(req));
    return NextResponse.json({ segment }, { status: 201 });
  } catch (error) {
    return contentErrorResponse("POST /api/v1/admin/content/segments", error);
  }
}
