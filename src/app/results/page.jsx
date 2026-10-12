/** `/results` — mission report. Server Component wrapper for metadata. */

import ResultsScreen from "@/components/screens/ResultsScreen";

export const metadata = {
  title: "Mission report",
  description:
    "Your completion time, cores collected, damage taken, ability usage, final score and experience earned.",
};

export default function ResultsPage() {
  return <ResultsScreen />;
}
