import type { Metadata } from "next";
import "./deck.css";
import { DeckViewer } from "./DeckViewer";
import { slides } from "./slides";

export const metadata: Metadata = {
  title: "Proofhaus pitch deck",
  description: "The Proofhaus pitch: the problem, the solution, the market and the team.",
  robots: { index: false, follow: false }
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap";

export default function DeckPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={FONTS} />
      <DeckViewer slides={slides} />
    </>
  );
}
