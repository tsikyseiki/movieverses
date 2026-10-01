import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SportEvent = {
  id: string;
  sport: string;
  league: string;
  leagueBadge: string | null;
  season: string | null;
  round: string | null;
  home: string;
  away: string;
  homeBadge: string | null;
  awayBadge: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  startsAt: string | null;
  date: string;
  venue: string | null;
  city: string | null;
  country: string | null;
  thumb: string | null;
  video: string | null;
  spectators: number | null;
  result: string | null;
};

const BASE = "https://www.thesportsdb.com/api/v1/json/123/";
const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

function map(e: Record<string, unknown>): SportEvent {
  const ts = str(e["strTimestamp"]);
  return {
    id: String(e["idEvent"]),
    sport: String(e["strSport"] ?? ""),
    league: String(e["strLeague"] ?? ""),
    leagueBadge: str(e["strLeagueBadge"]),
    season: str(e["strSeason"]),
    round: str(e["intRound"]),
    home: String(e["strHomeTeam"] ?? str(e["strEvent"]) ?? ""),
    away: String(e["strAwayTeam"] ?? ""),
    homeBadge: str(e["strHomeTeamBadge"]),
    awayBadge: str(e["strAwayTeamBadge"]),
    homeScore: num(e["intHomeScore"]),
    awayScore: num(e["intAwayScore"]),
    status: String(e["strStatus"] ?? ""),
    startsAt: ts ? (ts.endsWith("Z") || ts.includes("+") ? ts : `${ts}Z`) : null,
    date: String(e["dateEvent"] ?? ""),
    venue: str(e["strVenue"]),
    city: str(e["strCity"]),
    country: str(e["strCountry"]),
    thumb: str(e["strThumb"]) ?? str(e["strPoster"]),
    video: str(e["strVideo"]),
    spectators: num(e["intSpectators"]),
    result: str(e["strResult"]),
  };
}

export const getSportEvents = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), sports: z.array(z.string().max(40)).min(1).max(12) }).parse(d),
  )
  .handler(async ({ data }) => {
    const lists = await Promise.all(
      data.sports.map(async (s) => {
        try {
          const res = await fetch(`${BASE}eventsday.php?d=${data.date}&s=${encodeURIComponent(s)}`);
          if (!res.ok) return [];
          const json = (await res.json()) as { events?: Record<string, unknown>[] | null };
          return (json.events ?? []).map(map);
        } catch {
          return [];
        }
      }),
    );
    return lists.flat().sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
  });
