import { redirect } from "next/navigation";
import { getCurrentLearner } from "@/server/auth";
import { FlashcardsView } from "./flashcards-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Flashcard Ôn nhanh | English Mini LMS",
  description: "Ôn tập từ vựng nhanh 60 giây bằng thẻ vuốt Spaced Repetition",
};

export default async function FlashcardsPage() {
  const learner = await getCurrentLearner();
  if (!learner) {
    redirect("/login");
  }

  return <FlashcardsView />;
}
