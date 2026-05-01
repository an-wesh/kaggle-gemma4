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
      <body className="font-mono">
        <ModeProvider>{children}</ModeProvider>
      </body>
    </html>
  );
}
