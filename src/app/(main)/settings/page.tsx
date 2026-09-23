import { getCurrentLearner } from "@/server/auth";
import { redirect } from "next/navigation";
import SettingsView from "./settings-view";

export const metadata = {
  title: "Cài đặt — English Mini LMS",
};

export default async function SettingsPage() {
  const learner = await getCurrentLearner();
  if (!learner) {
    redirect("/login");
  }

  return <SettingsView />;
}
