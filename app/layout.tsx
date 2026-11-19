import type { Metadata, Viewport } from "next";
import { ChurchChatbot } from "./components/church-chatbot";
import { PwaRegister } from "./components/pwa-register";
import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "@fontsource/noto-sans-kr/700.css";
import "@fontsource/noto-serif-kr/400.css";
import "@fontsource/noto-serif-kr/500.css";
import "@fontsource/noto-serif-kr/700.css";
import "./globals.css";
import "./facebook-hero.css";
import "./history.css";


export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://jeonju-free-reformed-church.vercel.app"),
  title: { default: "전주자유개혁교회 | 자유개혁교회", template: "%s | 전주자유개혁교회" },
  description: "전주시 덕진구에 있는 전주자유개혁교회입니다. 성경과 세 일치 신조를 따라 그리스도를 고백하며, 신실한 교회를 세우시는 그리스도 안에서 살아가는 자유개혁교회입니다.",
  applicationName: "자유개혁교회",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "ko_KR", siteName: "자유개혁교회", images: ["/images/church-sign-photo.jpg"] },
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
  themeColor: "#fffcf5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main">본문 바로가기</a>
        {children}
        <PwaRegister />
        <ChurchChatbot />
      </body>
    </html>
  );
}
