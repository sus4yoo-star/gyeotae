import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";
import { InstallPrompt } from "@/components/install-prompt";
import { Splash } from "@/components/splash";

export const metadata: Metadata = {
  metadataBase: new URL("https://gyeotae.netlify.app"),
  title: { default: "곁에 — 혼자 계셔도, 혼자가 아닙니다", template: "%s | 곁에" },
  description:
    "가족이 일하는 동안 부모님 곁에 늘 함께. 긴급 SOS, 무응답 감지, AI 안부, 손주 영상까지. 사랑을 잇는 가족 돌봄 앱, 곁에.",
  applicationName: "곁에",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "곁에", statusBarStyle: "default" },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "곁에",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: "곁에 — 혼자 계셔도, 혼자가 아닙니다",
    description: "사랑을 잇는 가족 돌봄 앱. AMOV.",
    url: "https://gyeotae.netlify.app",
    siteName: "곁에",
    locale: "ko_KR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF6EE",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Splash />
        <ServiceWorker />
        {/* Phone-shaped app frame, centered on desktop */}
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-gt-cream shadow-[0_0_80px_rgba(40,30,20,0.1)]">
          {children}
        </div>
        <InstallPrompt />
      </body>
    </html>
  );
}
