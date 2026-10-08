import { NextResponse } from "next/server";
import { getCurrentLearner } from "@/server/auth";
import { ContentError } from "./content-errors";

/**
 * Chặn non-admin cho mọi API quản lý nội dung (cùng thông điệp với /api/v1/admin/dashboard).
 * Trả null nếu hợp lệ, ngược lại trả sẵn response 401/403.
 */
export async function guardAdmin(): Promise<NextResponse | null> {
  const learner = await getCurrentLearner();
  if (!learner) {
    return NextResponse.json({ error: "Unauthorized — Vui lòng đăng nhập" }, { status: 401 });
  }
  if (learner.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — Chỉ tài khoản Admin mới có quyền truy cập" },
      { status: 403 }
    );
  }
  return null;
}

export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ContentError(400, "Body phải là JSON hợp lệ");
  }
}

export function contentErrorResponse(label: string, error: unknown): NextResponse {
  if (error instanceof ContentError) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
  }
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`${label} error:`, msg);
  return NextResponse.json({ error: "Lỗi quản lý nội dung: " + msg }, { status: 500 });
}
