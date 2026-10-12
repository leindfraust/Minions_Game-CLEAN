/**
 * Root layout — a Server Component.
 *
 * Metadata stays here, on the server, as required. No `ssr: false` appears
 * anywhere in this file or in any other Server Component: the client-only
 * Phaser boundary is declared inside a Client Component instead.
 */

import { Barlow_Condensed, DM_Sans } from "next/font/google";
import { GameStateProvider } from "@/components/GameStateProvider";
import "./globals.css";

/*
  Fonts are downloaded at build time and served from our own origin, so the
  running app makes no third-party font request.
*/

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-barlow",
  display: "swap",
  fallback: ["Arial Narrow", "sans-serif"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata = {
  title: {
    default: "Mote Mayhem: Lab Escape",
    template: "%s · Mote Mayhem",
  },
  description:
    "Collect eight Energy Cores, dodge security robots and escape Sector 07 in 90 seconds. A Next.js and Phaser frontend game prototype.",
  applicationName: "Mote Mayhem",
  keywords: ["game", "phaser", "next.js", "arcade", "stealth"],
  authors: [{ name: "Mote Research Division" }],
  openGraph: {
    title: "Mote Mayhem: Lab Escape",
    description:
      "Small crew. Big mayhem. Escape the lab in 90 seconds.",
    type: "website",
  },
  icons: {
    icon: [{ url: "/assets/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport = {
  themeColor: "#0b111c",
  width: "device-width",
  initialScale: 1,
  // Gameplay needs a stable viewport, but pinch-zoom stays available so the
  // menus remain accessible to players who rely on it.
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${barlow.variable} ${dmSans.variable}`}>
      <body>
        <GameStateProvider>{children}</GameStateProvider>
      </body>
    </html>
  );
}
