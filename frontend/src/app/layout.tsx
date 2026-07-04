import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JobMatch AI",
  description: "AI-based matching between candidates and job ads",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
