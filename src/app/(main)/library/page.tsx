import { getApprovedActivities } from "@/server/library/service";
import { ActivityList } from "./activity-list";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const activities = await getApprovedActivities();

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pt-4 pb-6 lg:max-w-[1100px]">
      {/* Header trang */}
      <div style={{ marginBottom: "16px" }}>
        <h1
          style={{
            fontSize: "1.375rem",
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 4px",
            letterSpacing: "-0.01em",
          }}
        >
          📖 Thư viện bài học
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#64748b",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Luyện tập giao tiếp hội nghị, đọc–dịch chuyên khảo và phản xạ tiếng Anh lâm sàng.
        </p>
      </div>

      {/* Danh sách & Bộ lọc */}
      <ActivityList activities={activities} />
    </div>
  );
}
