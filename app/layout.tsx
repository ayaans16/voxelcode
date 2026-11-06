import type { Metadata } from "next";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/jetbrains-mono/800.css";
import "@fontsource/silkscreen/400.css";
import "@fontsource/silkscreen/700.css";
import "./globals.css";
import { Header } from "@/components/Header";
import { StorageProvider } from "@/storage/react";
import { ThemeApplier } from "@/components/ThemeApplier";

export const metadata: Metadata = {
  title: "voxelcode",
  description: "Practice coding problems. Every problem grows a voxel tree.",
};

// Runs before paint so the saved theme never flashes. localStorage is only a cache of the setting.
const themeScript = `try{var t=localStorage.getItem('vc-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;else if(window.matchMedia('(prefers-color-scheme: light)').matches)document.documentElement.dataset.theme='light';}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-accent focus:px-3 focus:py-1 focus:text-accent-ink"
        >
          Skip to content
        </a>
        <StorageProvider>
          <ThemeApplier />
          <Header />
          <main id="main">{children}</main>
        </StorageProvider>
      </body>
    </html>
  );
}
