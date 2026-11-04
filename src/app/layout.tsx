import type { Metadata } from "next";
import "./globals.css";

const title = "一次創作イベントウォッチャー";
const description = "一次創作（オリジナル作品）の同人誌即売会の開催日とサークル申込の締切をまとめています。";

export const metadata: Metadata = {
  metadataBase: new URL("https://events.subara3.com"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: title,
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
