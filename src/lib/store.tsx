import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Item, Kind } from "./catalog";

export type Settings = {
  theme: "dark" | "light";
  fontSize: number;
  lang: "fr-FR" | "en-US";
  categories: Record<Kind, boolean>;
  cardSize: "compact" | "normal" | "large";
  autoplayHero: boolean;
};
const DEFAULT: Settings = {
  theme: "dark",
  fontSize: 16,
  lang: "fr-FR",
  categories: { film: true, manga: true, occidental: true },
  cardSize: "normal",
  autoplayHero: true,
};

type Store = {
  ready: boolean;
  settings: Settings;
  setSettings: (s: Partial<Settings>) => void;
  favorites: Item[];
  toggleFavorite: (i: Item) => void;
  isFavorite: (i: Pick<Item, "kind" | "id">) => boolean;
  history: Item[];
  pushHistory: (i: Item) => void;
  clearHistory: () => void;
  ratings: Record<string, number>;
  rate: (i: Pick<Item, "kind" | "id">, v: number) => void;
  seenNotifs: string[];
  markSeen: (ids: string[]) => void;
};

const Ctx = createContext<Store | null>(null);
const key = (i: Pick<Item, "kind" | "id">) => `${i.kind}:${i.id}`;
function load<T>(k: string, d: T): T {
  try {
    const v = localStorage.getItem(`mv:${k}`);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
}
const save = (k: string, v: unknown) => localStorage.setItem(`mv:${k}`, JSON.stringify(v));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setS] = useState<Settings>(DEFAULT);
  const [favorites, setFav] = useState<Item[]>([]);
  const [history, setHist] = useState<Item[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [seenNotifs, setSeen] = useState<string[]>([]);

  useEffect(() => {
    setS({ ...DEFAULT, ...load("settings", {}) });
    setFav(load("favorites", []));
    setHist(load("history", []));
    setRatings(load("ratings", {}));
    setSeen(load("seen", []));
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    document.documentElement.style.setProperty("--app-font-size", `${settings.fontSize}px`);
    document.documentElement.lang = settings.lang.slice(0, 2);
  }, [settings]);

  const store: Store = {
    ready,
    settings,
    setSettings: (p) =>
      setS((s) => {
        const n = { ...s, ...p };
        save("settings", n);
        return n;
      }),
    favorites,
    toggleFavorite: (i) =>
      setFav((f) => {
        const n = f.some((x) => key(x) === key(i)) ? f.filter((x) => key(x) !== key(i)) : [i, ...f];
        save("favorites", n);
        return n;
      }),
    isFavorite: (i) => favorites.some((x) => key(x) === key(i)),
    history,
    pushHistory: (i) =>
      setHist((h) => {
        const n = [i, ...h.filter((x) => key(x) !== key(i))].slice(0, 30);
        save("history", n);
        return n;
      }),
    clearHistory: () => {
      save("history", []);
      setHist([]);
    },
    ratings,
    rate: (i, v) =>
      setRatings((r) => {
        const n = { ...r, [key(i)]: v };
        save("ratings", n);
        return n;
      }),
    seenNotifs,
    markSeen: (ids) =>
      setSeen((s) => {
        const n = [...new Set([...s, ...ids])].slice(-200);
        save("seen", n);
        return n;
      }),
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}
export const itemKey = key;
