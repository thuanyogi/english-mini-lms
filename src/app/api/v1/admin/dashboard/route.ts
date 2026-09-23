import { NextResponse } from "next/server";
import { getCurrentLearner } from "@/server/auth";
import { getAdminDashboardData } from "@/server/admin/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const learner = await getCurrentLearner();
    if (!learner) {
      return NextResponse.json(
        { error: "Unauthorized — Vui lòng đăng nhập" },
        { status: 401 }
      );
    }

    if (learner.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden — Chỉ tài khoản Admin mới có quyền truy cập" },
        { status: 403 }
      );
    }

    const data = await getAdminDashboardData();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/v1/admin/dashboard error:", errorMsg);
    return NextResponse.json(
      { error: "Lỗi tải dữ liệu quản trị: " + errorMsg },
      { status: 500 }
    );
  }
}
