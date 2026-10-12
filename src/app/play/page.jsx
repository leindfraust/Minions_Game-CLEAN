/**
 * `/play` — the mission.
 *
 * A Server Component: it holds the metadata and renders the Client Component
 * that owns the client-only Phaser boundary. `{ ssr: false }` lives inside
 * `MissionClient`, not here — Next.js rejects it in a Server Component, and
 * putting it here would also disable SSR for more than it should.
 */

import MissionClient from "@/components/game/MissionClient";

export const metadata = {
  title: "Mission: Sector 07",
  description:
    "Collect eight Energy Cores, avoid the security robots and escape the lab within 90 seconds.",
};

export default function PlayPage() {
  return <MissionClient />;
}
