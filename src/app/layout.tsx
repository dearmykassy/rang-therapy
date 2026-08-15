import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_ORIGIN } from "@/lib/metadata";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "랑테라피 | 전국 출장 마사지 지역·가격 안내",
    template: "%s | 랑테라피",
  },
  description:
    "전국 출장 마사지 지역 안내와 코스별 가격, 24시간 전화상담 및 현장 후불 기준을 확인하는 랑테라피입니다.",
  keywords: [
    "랑테라피",
    "전국 출장 마사지",
    "출장안마",
    "출장타이마사지",
    "출장스웨디시",
    "출장홈타이",
  ],
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/rang-therapy-mark.svg", type: "image/svg+xml" }],
    shortcut: "/rang-therapy-mark.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#762330",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <div className="app-shell">
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
