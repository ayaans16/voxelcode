"use client";

import { useEffect } from "react";
import { useSettings } from "@/storage/react";

/** Applies the saved theme to <html data-theme>. */
export function ThemeApplier() {
  const { settings, loaded } = useSettings();
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    const apply = () => {
      if (settings.theme === "system") {
        root.dataset.theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      } else {
        root.dataset.theme = settings.theme;
      }
    };
    apply();
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme, loaded]);
  return null;
}
