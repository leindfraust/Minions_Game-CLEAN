/** `/crew` — character selection. Server Component wrapper for metadata. */

import CrewScreen from "@/components/screens/CrewScreen";

export const metadata = {
  title: "Choose your crew",
  description:
    "Pick between Volt the Engineer, Pip the Scout, Glitch the Trickster and Moss the Brute. Each Mote has its own ability and cooldown.",
};

export default function CrewPage() {
  return <CrewScreen />;
}
