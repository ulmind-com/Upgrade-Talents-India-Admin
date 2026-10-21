import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider, ThemeProvider, ToastProvider } from "@/components/Providers";
import { SoundProvider } from "@/components/SoundProvider";

export const metadata: Metadata = {
  title: { default: "Admin — Upgrade Talents India", template: "%s | UTI Admin" },
  description: "Control room for events, tickets, competitions, judging, payments and website content.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const BOOT = `(function(){try{var t=localStorage.getItem('uti_admin_theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-lg focus:bg-[var(--brand)] focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white">
          Skip to main content
        </a>
        <ThemeProvider>
          <SoundProvider>
            <ToastProvider>
              <AuthProvider>{children}</AuthProvider>
            </ToastProvider>
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
