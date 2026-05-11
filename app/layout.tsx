import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scrape Anything — powered by Scrapling",
  description:
    "Paste a URL, get back JSON and Markdown. A single-utility scraping page wired to the Scrapling stealth fetcher.",
  icons: {
    icon: [
      { url: "/scrapling-favicon.ico", sizes: "any" },
      { url: "/scrapling-mark.png", type: "image/png" },
    ],
    shortcut: "/scrapling-favicon.ico",
    apple: "/scrapling-mark.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
