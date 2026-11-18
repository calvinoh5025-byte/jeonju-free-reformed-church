import type { Metadata, Viewport } from "next";
import { ChurchChatbot } from "./components/church-chatbot";
import { PwaRegister } from "./components/pwa-register";
import "./globals.css";
import "./facebook-hero.css";
import "./history.css";

export const metadata: Metadata = {
  title: "자유개혁교회",
  description: "성경과 세 일치 신조를 따라 그리스도를 고백하며, 신실한 교회를 세우시는 그리스도 안에서 살아가는 자유개혁교회입니다.",
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
      <body>
        {children}
        <PwaRegister />
        <ChurchChatbot />
      </body>
    </html>
  );
}
