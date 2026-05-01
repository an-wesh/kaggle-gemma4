"use client";
import { Dashboard } from "@/components/Dashboard";
import { ModeSelector } from "@/components/ModeSelector";
import { useMode } from "@/contexts/ModeContext";

export default function Home() {
  const { mode, loaded } = useMode();

  // Wait for the localStorage hydration to complete before rendering
  // anything — otherwise we briefly show the selector to a user whose
  // mode was already saved, which causes a flash.
  if (!loaded) return null;

  return mode ? <Dashboard /> : <ModeSelector />;
}
