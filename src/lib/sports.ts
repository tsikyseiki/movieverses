export type Sport = "football" | "basketball" | "tennis" | "autres";
export type MatchStatus = "live" | "today" | "upcoming";

export type Team = { name: string; short: string; flag: string; country: string };
export type Match = {
  id: string;
  sport: Sport;
  competition: string;
  venue: string;
  home: Team;
  away: Team;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
  minute?: number;
  startsAt: string;
  broadcasters: Record<string, string[]>;
  stats?: { possession: [number, number]; shots: [number, number]; fouls: [number, number] };
  highlightId?: string;
};

const now = Date.now();
const at = (hours: number) => new Date(now + hours * 3_600_000).toISOString();

export const SPORTS: { value: "all" | Sport; label: string }[] = [
  { value: "all", label: "Tous les sports" },
  { value: "football", label: "Football" },
  { value: "basketball", label: "Basketball" },
  { value: "tennis", label: "Tennis" },
  { value: "autres", label: "Autres" },
];

export const MATCHES: Match[] = [
  { id: "ucl-psg-rma", sport: "football", competition: "Ligue des champions", venue: "Parc des Princes", home: { name: "Paris SG", short: "PSG", flag: "🇫🇷", country: "FR" }, away: { name: "Real Madrid", short: "RMA", flag: "🇪🇸", country: "ES" }, homeScore: 2, awayScore: 1, status: "live", minute: 67, startsAt: at(-1.2), broadcasters: { FR: ["Canal+ Foot"], MG: ["Canal+ Sport"], ES: ["Movistar Plus+"], DEFAULT: ["DAZN"] }, stats: { possession: [54, 46], shots: [12, 9], fouls: [8, 11] } },
  { id: "nba-lal-bos", sport: "basketball", competition: "NBA", venue: "Crypto.com Arena", home: { name: "LA Lakers", short: "LAL", flag: "🟣", country: "US" }, away: { name: "Boston Celtics", short: "BOS", flag: "🟢", country: "US" }, homeScore: 86, awayScore: 82, status: "live", minute: 8, startsAt: at(-1.5), broadcasters: { FR: ["beIN Sports"], MG: ["Canal+ Sport"], US: ["NBA TV"], DEFAULT: ["NBA League Pass"] }, stats: { possession: [51, 49], shots: [68, 65], fouls: [14, 17] } },
  { id: "atp-sinner-alcaraz", sport: "tennis", competition: "ATP Masters 1000", venue: "Court central", home: { name: "Jannik Sinner", short: "SIN", flag: "🇮🇹", country: "IT" }, away: { name: "Carlos Alcaraz", short: "ALC", flag: "🇪🇸", country: "ES" }, homeScore: 1, awayScore: 1, status: "live", minute: 94, startsAt: at(-2), broadcasters: { FR: ["Eurosport"], MG: ["Canal+ Sport"], DEFAULT: ["Tennis TV"] }, stats: { possession: [48, 52], shots: [31, 34], fouls: [2, 1] } },
  { id: "fra-bel", sport: "football", competition: "Ligue des nations", venue: "Stade de France", home: { name: "France", short: "FRA", flag: "🇫🇷", country: "FR" }, away: { name: "Belgique", short: "BEL", flag: "🇧🇪", country: "BE" }, status: "today", startsAt: at(4), broadcasters: { FR: ["TF1"], MG: ["Canal+"], BE: ["RTBF"], DEFAULT: ["UEFA.tv"] } },
  { id: "mad-bra", sport: "football", competition: "Match international", venue: "Stade Barea", home: { name: "Madagascar", short: "MAD", flag: "🇲🇬", country: "MG" }, away: { name: "Brésil", short: "BRA", flag: "🇧🇷", country: "BR" }, status: "upcoming", startsAt: at(51), broadcasters: { MG: ["TVM", "Canal+ Sport"], BR: ["Globo"], DEFAULT: ["FIFA+"] } },
  { id: "sen-mar", sport: "football", competition: "Qualifications internationales", venue: "Stade Abdoulaye Wade", home: { name: "Sénégal", short: "SEN", flag: "🇸🇳", country: "SN" }, away: { name: "Maroc", short: "MAR", flag: "🇲🇦", country: "MA" }, status: "upcoming", startsAt: at(74), broadcasters: { SN: ["RTS"], MA: ["Arryadia"], FR: ["L'Équipe Live"], DEFAULT: ["FIFA+"] } },
  { id: "f1-japan", sport: "autres", competition: "Formule 1 · Grand Prix du Japon", venue: "Suzuka", home: { name: "McLaren", short: "MCL", flag: "🟠", country: "GB" }, away: { name: "Ferrari", short: "FER", flag: "🔴", country: "IT" }, status: "upcoming", startsAt: at(98), broadcasters: { FR: ["Canal+"], MG: ["Canal+ Sport"], DEFAULT: ["F1 TV"] } },
];

export const countryFromLocale = () => {
  if (typeof navigator === "undefined") return null;
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  return locale.split("-")[1]?.toUpperCase() ?? null;
};

export const broadcastersFor = (match: Match, country: string | null) =>
  (country && match.broadcasters[country]) || match.broadcasters.DEFAULT || [];
