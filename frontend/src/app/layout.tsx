import type { Metadata } from "next";
import "./globals.css";
import { ModeProvider } from "@/contexts/ModeContext";

export const metadata: Metadata = {
  title: "Finsight OS — AI Behavioral Guardian",
  description: "Protecting India's 9.6M retail traders from emotional trading",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <ModeProvider>{children}</ModeProvider>
      </body>
    </html>
  );
}

