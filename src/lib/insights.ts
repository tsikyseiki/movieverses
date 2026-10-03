import type { Kind } from "./catalog";

export type WatchEntry = {
  kind: Kind;
  id: string;
  title: string;
  poster: string | null;
  genres: string[];
  runtimeMin: number | null;
  at: number;
};
export type RatingMeta = Record<string, { genres: string[]; title: string }>;

/** Prédit la note probable de l'utilisateur à partir de ses notes passées (similarité de genres). */
export function predictRating(
  target: string[],
  ratings: Record<string, number>,
  meta: RatingMeta,
  community: number | null,
): { value: number; basedOn: number } | null {
  const rated = Object.entries(ratings).filter(([k]) => meta[k]?.genres?.length);
  if (rated.length < 3 || !target.length) return null;
  const mean = rated.reduce((s, [, v]) => s + v, 0) / rated.length;
  const T = new Set(target.map((g) => g.toLowerCase()));
  let wSum = 0;
  let vSum = 0;
  let n = 0;
  for (const [k, v] of rated) {
    const g = meta[k]!.genres.map((x) => x.toLowerCase());
    const inter = g.filter((x) => T.has(x)).length;
    const sim = inter / new Set([...g, ...T]).size;
    if (sim > 0) {
      wSum += sim;
      vSum += sim * v;
      n++;
    }
  }
  if (n < 2) return null;
  const K = 0.6; // tire la prédiction vers votre moyenne quand peu de titres se ressemblent
  let pred = (vSum + K * mean) / (wSum + K);
  if (community != null) pred = pred * 0.8 + community * 0.2;
  pred = Math.min(10, Math.max(1, pred));
  return { value: Math.round(pred * 10) / 10, basedOn: n };
}

export type Stats = {
  total: number;
  minutes: number;
  topGenre: string | null;
  genreCount: number;
  kindCount: number;
  thisMonth: number;
  avgRating: number | null;
  byKind: Record<Kind, number>;
};

export function computeStats(watched: WatchEntry[], ratings: Record<string, number>, meta: RatingMeta): Stats {
  const genres = new Map<string, number>();
  const all = new Set<string>();
  for (const w of watched) for (const g of w.genres) { genres.set(g, (genres.get(g) ?? 0) + 1); all.add(g.toLowerCase()); }
  for (const m of Object.values(meta)) for (const g of m.genres) all.add(g.toLowerCase());
  const top = [...genres.entries()].sort((a, b) => b[1] - a[1])[0];
  const now = new Date();
  const vals = Object.values(ratings);
  const byKind: Record<Kind, number> = { film: 0, manga: 0, occidental: 0 };
  for (const w of watched) byKind[w.kind]++;
  return {
    total: watched.length,
    minutes: watched.reduce((s, w) => s + (w.runtimeMin ?? 0), 0),
    topGenre: top ? top[0] : null,
    genreCount: all.size,
    kindCount: Object.values(byKind).filter((n) => n > 0).length,
    thisMonth: watched.filter((w) => { const d = new Date(w.at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length,
    avgRating: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null,
    byKind,
  };
}

export type Trophy = { id: string; emoji: string; title: string; desc: string; value: number; goal: number };

export function trophies(s: Stats, ratingsCount: number, favoritesCount: number): Trophy[] {
  const hours = Math.floor(s.minutes / 60);
  return [
    { id: "first", emoji: "🎬", title: "Premier pas", desc: "Marquer 1 titre comme vu", value: s.total, goal: 1 },
    { id: "w10", emoji: "🍿", title: "Cinéphile", desc: "10 titres vus", value: s.total, goal: 10 },
    { id: "w50", emoji: "🏆", title: "Passionné", desc: "50 titres vus", value: s.total, goal: 50 },
    { id: "w100", emoji: "👑", title: "Légende", desc: "100 titres vus", value: s.total, goal: 100 },
    { id: "g5", emoji: "🧭", title: "Curieux", desc: "Explorer 5 genres", value: s.genreCount, goal: 5 },
    { id: "g10", emoji: "🗺️", title: "Explorateur", desc: "Explorer 10 genres", value: s.genreCount, goal: 10 },
    { id: "g15", emoji: "🌌", title: "Globe-trotteur", desc: "Explorer 15 genres", value: s.genreCount, goal: 15 },
    { id: "k3", emoji: "🪐", title: "Multi-univers", desc: "Voir un film, un animé manga et un animé occidental", value: s.kindCount, goal: 3 },
    { id: "r10", emoji: "⭐", title: "Critique", desc: "Noter 10 titres", value: ratingsCount, goal: 10 },
    { id: "r50", emoji: "🎖️", title: "Juré", desc: "Noter 50 titres", value: ratingsCount, goal: 50 },
    { id: "f10", emoji: "❤️", title: "Collectionneur", desc: "10 titres dans Ma liste", value: favoritesCount, goal: 10 },
    { id: "h24", emoji: "⏱️", title: "Marathonien", desc: "24 h de visionnage cumulées", value: hours, goal: 24 },
  ];
}

export const formatDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
};
