import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useStore } from "@/lib/store";

/** Vrai si l'affichage est sombre (réglage « Sombre », ou « Auto » avec un téléphone en mode sombre). */
export function useIsDark() {
  const { settings } = useStore();
  const [sys, setSys] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSys(mq.matches);
    const h = () => setSys(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return settings.theme === "dark" || (settings.theme === "system" && sys);
}

/** Bascule rapide clair / sombre (le réglage « Auto » suit le téléphone, dans les paramètres). */
export function ThemeToggle() {
  const { setSettings } = useStore();
  const isDark = useIsDark();
  return (
    <button
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      onClick={() => setSettings({ theme: isDark ? "light" : "dark" })}
      className="rounded-full p-2 transition hover:bg-accent"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
