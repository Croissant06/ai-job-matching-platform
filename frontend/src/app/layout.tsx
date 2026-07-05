import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";

export const metadata: Metadata = {
  title: "JobMatch AI — Find jobs that actually match your CV",
  description:
    "AI-powered job discovery across Bulgaria, Romania, and international markets. Ranked opportunities with match scores, skill gaps, and clear explanations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>{children}</body>
    </html>
  );
}
