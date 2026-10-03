import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav, SideNav } from "@/components/bottom-nav";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDevBypass =
    process.env.NODE_ENV === "development" &&
    process.env.DEV_BYPASS_AUTH === "true";

  if (!user && !isDevBypass) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      {/* Sidebar (≥1024px) */}
      <SideNav />

      {/* Main content area — chừa chỗ cho bottom nav (mobile) hoặc sidebar (desktop) */}
      <main className="flex-1 pb-[var(--nav-height)] lg:pb-0 lg:pl-60">
        {children}
      </main>

      {/* Bottom navigation (<1024px) — fixed */}
      <BottomNav />
    </div>
  );
}
