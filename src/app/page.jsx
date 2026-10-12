/**
 * `/` — main menu. A Server Component so its metadata stays on the server;
 * the interactive screen below the fold is a Client Component.
 */

import MainMenuScreen from "@/components/screens/MainMenuScreen";

export const metadata = {
  title: "Mote Mayhem: Lab Escape",
  description:
    "Small crew. Big mayhem. Pick a Mote, collect eight Energy Cores and escape Sector 07 in 90 seconds.",
};

export default function HomePage() {
  return <MainMenuScreen />;
}
