import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Item, Kind } from "./catalog";
import type { RatingMeta, WatchEntry } from "./insights";

export type Settings = {
  theme: "dark" | "light" | "system";
  family: boolean;
  dataSaver: boolean;
  fontSize: number;
  accent: "rouge" | "bleu" | "violet" | "vert" | "orange";
  contrast: boolean;
  reduceMotion: boolean;
  subtitles: boolean;
  lang: "fr-FR";
  categories: Record<Kind, boolean>;
  cardSize: "compact" | "normal" | "large";
  autoplayHero: boolean;
};
const DEFAULT: Settings = {
  theme: "dark",
  family: false,
  dataSaver: false,
  fontSize: 16,
  accent: "rouge",
  contrast: false,
  reduceMotion: false,
  subtitles: true,
  lang: "fr-FR",
  categories: { film: true, manga: true, occidental: true, serie: true },
  cardSize: "normal",
  autoplayHero: true,
};

export type CloudData = { favorites?: Item[]; ratings?: Record<string, number>; ratingMeta?: RatingMeta; watched?: WatchEntry[] };

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
  rate: (i: Pick<Item, "kind" | "id">, v: number, genres?: string[], title?: string) => void;
  ratingMeta: RatingMeta;
  watched: WatchEntry[];
  markWatched: (e: Omit<WatchEntry, "at">) => void;
  unmarkWatched: (i: Pick<Item, "kind" | "id">) => void;
  isWatched: (i: Pick<Item, "kind" | "id">) => boolean;
  applyCloud: (d: CloudData, mode: "replace" | "union") => void;
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
  const [ratingMeta, setMeta] = useState<RatingMeta>({});
  const [watched, setWatched] = useState<WatchEntry[]>([]);

  // Thème « Auto » : suit le réglage clair/sombre du téléphone en direct
  useEffect(() => {
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => document.documentElement.classList.toggle("dark", mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [settings.theme]);

  useEffect(() => {
    const saved = load("settings", {}) as Partial<Settings>;
    setS({ ...DEFAULT, ...saved, categories: { ...DEFAULT.categories, ...(saved.categories ?? {}) }, lang: "fr-FR" });
    setFav(load("favorites", []));
    setHist(load("history", []));
    setRatings(load("ratings", {}));
    setSeen(load("seen", []));
    setMeta(load("ratingmeta", {}));
    setWatched(load("watched", []));
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark" || (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));
    document.documentElement.style.setProperty("--app-font-size", `${settings.fontSize}px`);
    document.documentElement.lang = settings.lang.slice(0, 2);
    const root = document.documentElement;
    const ACCENTS: Record<string, string> = { bleu: "oklch(0.6 0.2 255)", violet: "oklch(0.58 0.24 300)", vert: "oklch(0.6 0.17 150)", orange: "oklch(0.68 0.19 50)" };
    const c = ACCENTS[settings.accent];
    if (c) { root.style.setProperty("--primary", c); root.style.setProperty("--ring", c); }
    else { root.style.removeProperty("--primary"); root.style.removeProperty("--ring"); }
    root.classList.toggle("high-contrast", settings.contrast);
    root.classList.toggle("reduce-motion", settings.reduceMotion);
  }, [settings]);

  const store: Store = {
    ready,
    settings,
    setSettings: (p) =>
      setS((s) => {
        const n = { ...s, ...p, lang: "fr-FR" as const };
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
    rate: (i, v, genres, title) => {
      setRatings((r) => {
        const n = { ...r, [key(i)]: v };
        save("ratings", n);
        return n;
      });
      if (genres?.length) {
        setMeta((m) => {
          const n = { ...m, [key(i)]: { genres, title: title ?? "" } };
          save("ratingmeta", n);
          return n;
        });
      }
    },
    ratingMeta,
    watched,
    markWatched: (e) =>
      setWatched((w) => {
        const n = [{ ...e, at: Date.now() }, ...w.filter((x) => key(x) !== key(e))].slice(0, 1000);
        save("watched", n);
        return n;
      }),
    unmarkWatched: (i) =>
      setWatched((w) => {
        const n = w.filter((x) => key(x) !== key(i));
        save("watched", n);
        return n;
      }),
    isWatched: (i) => watched.some((x) => key(x) === key(i)),
    applyCloud: (d, mode) => {
      if (Array.isArray(d.favorites)) {
        const incoming = d.favorites;
        setFav((f) => {
          const n = mode === "replace" ? incoming : [...f, ...incoming.filter((x) => !f.some((y) => key(y) === key(x)))];
          save("favorites", n);
          return n;
        });
      }
      if (d.ratings && typeof d.ratings === "object") {
        const incoming = d.ratings;
        setRatings((r) => { const n = mode === "replace" ? incoming : { ...incoming, ...r }; save("ratings", n); return n; });
      }
      if (d.ratingMeta && typeof d.ratingMeta === "object") {
        const incoming = d.ratingMeta;
        setMeta((m) => { const n = mode === "replace" ? incoming : { ...incoming, ...m }; save("ratingmeta", n); return n; });
      }
      if (Array.isArray(d.watched)) {
        const incoming = d.watched;
        setWatched((w) => {
          const merged = mode === "replace" ? incoming : [...w, ...incoming.filter((x) => !w.some((y) => key(y) === key(x)))];
          const n = [...merged].sort((a, b) => b.at - a.at).slice(0, 1000);
          save("watched", n);
          return n;
        });
      }
    },
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
