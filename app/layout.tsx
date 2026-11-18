import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { ChurchChatbot } from "./components/church-chatbot";
import { PwaRegister } from "./components/pwa-register";
import "./globals.css";
import "./facebook-hero.css";
import "./history.css";

const notoSans = Noto_Sans_KR({ variable: "--font-noto-sans", weight: ["400", "500", "700"], display: "swap", preload: false });
const notoSerif = Noto_Serif_KR({ variable: "--font-noto-serif", weight: ["400", "500", "700"], display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://jeonju-free-reformed-church.vercel.app"),
  title: { default: "전주자유개혁교회 | 자유개혁교회", template: "%s | 전주자유개혁교회" },
  description: "전주시 덕진구에 있는 전주자유개혁교회입니다. 성경과 세 일치 신조를 따라 그리스도를 고백하며, 신실한 교회를 세우시는 그리스도 안에서 살아가는 자유개혁교회입니다.",
  applicationName: "자유개혁교회",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "ko_KR", siteName: "자유개혁교회", images: ["/images/church-sign-square.jpg"] },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "자유개혁교회",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1b2b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSans.variable} ${notoSerif.variable}`}>
        <a className="skip-link" href="#main">본문 바로가기</a>
        {children}
        <PwaRegister />
        <ChurchChatbot />
      </body>
    </html>
  );
}
