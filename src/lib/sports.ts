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
  if (p === "live") return e.status === "HT" ? "Mi-temps" : `En cours · ${e.status}`;
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
};

export const youtubeId = (url: string | null) => url?.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1] ?? null;
