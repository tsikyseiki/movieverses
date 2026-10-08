import type { SportEvent } from "./sportsdb.functions";

export const SPORTS: { value: string; label: string }[] = [
  { value: "all", label: "Tous les sports" },
  { value: "Soccer", label: "Football" },
  { value: "Basketball", label: "Basketball" },
  { value: "Rugby", label: "Rugby" },
  { value: "Fighting", label: "MMA & combat" },
  { value: "Tennis", label: "Tennis" },
  { value: "Ice Hockey", label: "Hockey sur glace" },
  { value: "American Football", label: "Football américain" },
  { value: "Motorsport", label: "Sports mécaniques" },
  { value: "Baseball", label: "Baseball" },
];

export const sportLabel = (s: string) => SPORTS.find((x) => x.value === s)?.label ?? s;

const FINISHED = ["FT", "AET", "AOT", "PEN", "Match Finished", "AP", "Ended", "Finished"];
const NOT_STARTED = ["NS", "", "Not Started", "TBD", "Time to be defined"];
const CANCELLED = ["PST", "CANC", "ABD", "Postponed", "Cancelled", "Abandoned"];

export type Phase = "live" | "finished" | "scheduled" | "cancelled";
export function phaseOf(e: SportEvent): Phase {
  if (CANCELLED.includes(e.status)) return "cancelled";
  if (FINISHED.includes(e.status)) return "finished";
  if (NOT_STARTED.includes(e.status)) {
    if (e.homeScore != null && e.startsAt && Date.parse(e.startsAt) < Date.now() - 3 * 3_600_000) return "finished";
    return "scheduled";
  }
  return "live";
}

export const statusLabel = (e: SportEvent) => {
  const p = phaseOf(e);
  if (p === "finished") return "Terminé";
  if (p === "cancelled") return "Reporté / annulé";
  if (p === "live") return `En cours · ${periodLabel(e.status)}`;
  return "À venir";
};

export const isoDay = (offset: number) => {
  const d = new Date(Date.now() + offset * 86_400_000);
  return d.toISOString().slice(0, 10);
};

export const countryFromLocale = () => {
  if (typeof navigator === "undefined") return null;
  return Intl.DateTimeFormat().resolvedOptions().locale.split("-")[1]?.toUpperCase() ?? null;
};

/** Noms anglais (utilisés par TheSportsDB) des équipes nationales par code pays. */
export const NATION_EN: Record<string, { en: string; fr: string }> = {
  FR: { en: "France", fr: "France" }, MG: { en: "Madagascar", fr: "Madagascar" }, US: { en: "USA", fr: "États-Unis" },
  ES: { en: "Spain", fr: "Espagne" }, BR: { en: "Brazil", fr: "Brésil" }, SN: { en: "Senegal", fr: "Sénégal" },
  MA: { en: "Morocco", fr: "Maroc" }, BE: { en: "Belgium", fr: "Belgique" }, CA: { en: "Canada", fr: "Canada" },
  CH: { en: "Switzerland", fr: "Suisse" }, DE: { en: "Germany", fr: "Allemagne" }, IT: { en: "Italy", fr: "Italie" },
  GB: { en: "England", fr: "Angleterre" }, CI: { en: "Ivory Coast", fr: "Côte d’Ivoire" }, CM: { en: "Cameroon", fr: "Cameroun" },
  DZ: { en: "Algeria", fr: "Algérie" }, TN: { en: "Tunisia", fr: "Tunisie" }, PT: { en: "Portugal", fr: "Portugal" },
  AR: { en: "Argentina", fr: "Argentine" }, RE: { en: "Reunion", fr: "La Réunion" }, MU: { en: "Mauritius", fr: "Maurice" },
  JP: { en: "Japan", fr: "Japon" }, KR: { en: "South Korea", fr: "Corée du Sud" }, NG: { en: "Nigeria", fr: "Nigeria" },
  GH: { en: "Ghana", fr: "Ghana" }, EG: { en: "Egypt", fr: "Égypte" }, ZA: { en: "South Africa", fr: "Afrique du Sud" },
  MX: { en: "Mexico", fr: "Mexique" }, NL: { en: "Netherlands", fr: "Pays-Bas" }, HR: { en: "Croatia", fr: "Croatie" },
  CO: { en: "Colombia", fr: "Colombie" }, AU: { en: "Australia", fr: "Australie" }, NZ: { en: "New Zealand", fr: "Nouvelle-Zélande" },
  CD: { en: "DR Congo", fr: "RD Congo" }, CN: { en: "China", fr: "Chine" }, IN: { en: "India", fr: "Inde" },
  KM: { en: "Comoros", fr: "Comores" }, SC: { en: "Seychelles", fr: "Seychelles" }, ML: { en: "Mali", fr: "Mali" },
};

export const youtubeId = (url: string | null) => url?.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1] ?? null;

/** Une équipe appartient au pays si son nom est celui du pays (ou « France U21 », « France Women »…). */
export const isNation = (name: string, en: string) => name === en || name.startsWith(`${en} `);

/** Drapeau en emoji à partir du code pays (FR → 🇫🇷). */
export const flagEmoji = (code: string) => code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

/** Nom du pays en anglais (pour TheSportsDB) et en français ; marche pour n'importe quel pays grâce à Intl. */
export function nationOf(code: string | null): { en: string; fr: string } | null {
  if (!code) return null;
  const known = NATION_EN[code];
  if (known) return known;
  try {
    const en = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
    const fr = new Intl.DisplayNames(["fr"], { type: "region" }).of(code);
    return en && fr && en !== code ? { en, fr } : null;
  } catch { return null; }
}

const EMOJI: Record<string, string> = { Soccer: "⚽", Basketball: "🏀", Rugby: "🏉", Fighting: "🥊", Tennis: "🎾", "Ice Hockey": "🏒", "American Football": "🏈", Motorsport: "🏎️", Baseball: "⚾" };
export const sportEmoji = (s: string) => EMOJI[s] ?? "🏅";

/** Période en cours, en français (HT, 2H, Q3, IN5…). */
export function periodLabel(status: string): string {
  const u = status.toUpperCase().trim();
  if (u === "HT") return "Mi-temps";
  if (u === "1H") return "1re mi-temps";
  if (u === "2H") return "2e mi-temps";
  if (u === "ET") return "Prolongations";
  if (u === "PEN") return "Tirs au but";
  if (u === "BT") return "Pause";
  const q = u.match(/^Q(\d)$/); if (q) return `${q[1]}e quart-temps`;
  const i = u.match(/^IN(\d+)$/); if (i) return `${i[1]}e manche`;
  const p = u.match(/^P(\d)$/); if (p) return `${p[1]}e période`;
  const st = u.match(/^S(\d)$/); if (st) return `Set ${st[1]}`;
  return status;
}

/** Chronomètre estimé du match (football / rugby) à partir de l'heure de coup d'envoi ; sinon la période. */
export function liveClock(e: SportEvent, now: number): { text: string; progress: number | null } {
  const label = periodLabel(e.status);
  if ((e.sport !== "Soccer" && e.sport !== "Rugby") || !e.startsAt) return { text: label, progress: null };
  const half = e.sport === "Rugby" ? 40 : 45;
  const total = half * 2;
  const el = Math.max(0, Math.floor((now - Date.parse(e.startsAt)) / 60_000));
  const s = e.status.toUpperCase();
  if (s === "HT") return { text: "Mi-temps", progress: 0.5 };
  if (s === "1H") return { text: el > half ? `${half}+${el - half}'` : `${Math.max(el, 1)}'`, progress: Math.min(el, half) / total };
  if (s === "2H") {
    const m = el - 15;
    return { text: m > total ? `${total}+${m - total}'` : `${Math.max(m, half + 1)}'`, progress: Math.min(Math.max(m, half), total) / total };
  }
  return { text: label, progress: null };
}

/** « Aujourd'hui », « Demain », « Dans 3 jours »… */
export function relativeDay(iso: string | null): string {
  if (!iso) return "Date à confirmer";
  const start = new Date(iso);
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(start); b.setHours(0, 0, 0, 0);
  const d = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  if (d <= 0) return "Aujourd’hui";
  if (d === 1) return "Demain";
  if (d < 14) return `Dans ${d} jours`;
  return `Dans ${Math.round(d / 7)} semaines`;
}
