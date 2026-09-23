import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#f8fafc",
      }}
    >
      {/* Main content area — scrollable, with padding for bottom nav */}
      <main
        style={{
          flex: 1,
          paddingBottom: "var(--nav-height)",
          overflowY: "auto",
        }}
      >
        {children}
      </main>

      {/* Bottom navigation — fixed */}
      <BottomNav />
    </div>
  );
}
