import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scrape Anything — powered by Scrapling",
  description:
    "Paste a URL, get back JSON and Markdown. A single-utility scraping page wired to the Scrapling stealth fetcher.",
  icons: { icon: "/scrapling-cover.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
