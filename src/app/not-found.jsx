/** 404. A Server Component; nothing here needs the browser. */

import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = { title: "Lost in the lab" };

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeContent: "center",
        justifyItems: "center",
        gap: "1rem",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <Logo large />
      <p className="eyebrow">Error 404 &middot; Sector not found</p>
      <h1>This corridor leads nowhere.</h1>
      <p className="muted">Even the Motes have not been here.</p>
      <Link href="/" className="eyebrow" style={{ marginTop: "0.6rem" }}>
        &larr; Return to base
      </Link>
    </main>
  );
}
