import { getCurrentLearner } from "@/server/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminView from "./admin-view";

export const metadata = {
  title: "Quản trị hệ thống — English Mini LMS",
};

export default async function AdminPage() {
  const learner = await getCurrentLearner();
  if (!learner) {
    redirect("/login");
  }

  if (learner.role !== "admin") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-4xl">🔒</div>
        <h1 className="text-xl font-bold text-slate-800">Quyền truy cập bị giới hạn</h1>
        <p className="text-sm text-slate-600">
          Chỉ tài khoản Quản trị viên (Admin) mới có quyền truy cập trang này.
        </p>
        <Link
          href="/today"
          className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
        >
          Quay lại Hôm nay
        </Link>
      </div>
    );
  }

  return <AdminView />;
}
