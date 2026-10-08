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

/* ───────────── Détail d'un match : chronologie, stats, compositions ───────────── */

export type TimelineItem = {
  id: string;
  minute: number | null;
  kind: "goal" | "yellow" | "red" | "sub" | "other";
  home: boolean;
  player: string | null;
  other: string | null;
  detail: string | null;
};
export type StatRow = { label: string; home: number; away: number; pct: boolean };
export type LineupPlayer = { name: string; number: string | null; position: string | null; home: boolean; sub: boolean };
export type EventDetail = {
  event: SportEvent | null;
  timeline: TimelineItem[];
  stats: StatRow[];
  lineup: LineupPlayer[];
  formation: { home: string | null; away: string | null };
};

type Row = Record<string, unknown>;

async function getJson(path: string): Promise<Row | null> {
  try {
    const r = await fetch(`${BASE}${path}`);
    if (!r.ok) return null;
    return (await r.json()) as Row;
  } catch {
    return null;
  }
}

/** Première liste d'objets du JSON (le nom de la clé varie selon le point d'accès). */
function firstRows(j: Row | null): Row[] {
  if (!j) return [];
  const arr = Object.values(j).find((v) => Array.isArray(v));
  return Array.isArray(arr) ? (arr as Row[]) : [];
}

function kindOf(type: string, detail: string): TimelineItem["kind"] {
  const s = `${type} ${detail}`.toLowerCase();
  if (s.includes("missed") || s.includes("disallowed") || s.includes("cancel")) return "other";
  if (s.includes("red") || s.includes("second yellow")) return "red";
  if (s.includes("yellow")) return "yellow";
  if (s.includes("goal") || s.includes("penalty") || s.includes("try")) return "goal";
  if (s.includes("subst")) return "sub";
  return "other";
}

const MIN_RE = /(\d{1,3})(?:\s*\+\s*\d+)?\s*['’′]/;

/** Ancien format « 23':Dupont;67':Martin » (buts, cartons) quand la chronologie détaillée est absente. */
function parseDetails(raw: unknown, home: boolean, kind: TimelineItem["kind"], prefix: string): TimelineItem[] {
  const s = str(raw);
  if (!s) return [];
  return s
    .split(/[;\n]+/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c, i) => {
      const m = c.match(MIN_RE);
      const name = c.replace(MIN_RE, "").replace(/^[\s:,-]+|[\s:,-]+$/g, "");
      return { id: `${prefix}${home ? "h" : "a"}${i}`, minute: m?.[1] ? Number(m[1]) : null, kind, home, player: name || null, other: null, detail: null };
    });
}

const STAT_FR: Record<string, string> = {
  "shots on goal": "Tirs cadrés", "shots off goal": "Tirs non cadrés", "total shots": "Tirs", "blocked shots": "Tirs bloqués",
  "shots insidebox": "Tirs dans la surface", "shots outsidebox": "Tirs hors surface", fouls: "Fautes", "corner kicks": "Corners",
  offsides: "Hors-jeu", "ball possession": "Possession", "yellow cards": "Cartons jaunes", "red cards": "Cartons rouges",
  "goalkeeper saves": "Arrêts", saves: "Arrêts", "total passes": "Passes", "passes accurate": "Passes réussies",
  "passes %": "Précision des passes", expected_goals: "Buts attendus (xG)",
};

const DETAIL_CACHE = new Map<string, { exp: number; v: EventDetail }>();

export const getEventDetail = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().regex(/^\d{1,12}$/) }).parse(d))
  .handler(async ({ data }): Promise<EventDetail> => {
    const hit = DETAIL_CACHE.get(data.id);
    if (hit && hit.exp > Date.now()) return hit.v;

    const [ev, tl, st, lu] = await Promise.all([
      getJson(`lookupevent.php?id=${data.id}`),
      getJson(`lookuptimeline.php?id=${data.id}`),
      getJson(`lookupeventstats.php?id=${data.id}`),
      getJson(`lookuplineup.php?id=${data.id}`),
    ]);

    const raw = firstRows(ev)[0];
    const event = raw ? map(raw) : null;

    let timeline: TimelineItem[] = firstRows(tl).map((r, i) => {
      const type = String(r["strTimeline"] ?? "");
      const detail = String(r["strTimelineDetail"] ?? "");
      return {
        id: String(r["idTimeline"] ?? `t${i}`),
        minute: num(r["intTime"]),
        kind: kindOf(type, detail),
        home: String(r["strHome"] ?? "").toLowerCase() === "yes",
        player: str(r["strPlayer"]),
        other: str(r["strAssist"]),
        detail: str(r["strTimelineDetail"]),
      };
    });

    if (!timeline.length && raw) {
      timeline = [
        ...parseDetails(raw["strHomeGoalDetails"], true, "goal", "g"),
        ...parseDetails(raw["strAwayGoalDetails"], false, "goal", "g"),
        ...parseDetails(raw["strHomeYellowCards"], true, "yellow", "y"),
        ...parseDetails(raw["strAwayYellowCards"], false, "yellow", "y"),
        ...parseDetails(raw["strHomeRedCards"], true, "red", "r"),
        ...parseDetails(raw["strAwayRedCards"], false, "red", "r"),
      ];
    }
    timeline.sort((a, b) => (b.minute ?? -1) - (a.minute ?? -1));

    const stats: StatRow[] = firstRows(st).slice(0, 16).map((r) => {
      const label = String(r["strStat"] ?? "");
      const h = String(r["intHome"] ?? "0");
      const a = String(r["intAway"] ?? "0");
      return {
        label: STAT_FR[label.toLowerCase()] ?? label,
        home: parseFloat(h.replace(",", ".")) || 0,
        away: parseFloat(a.replace(",", ".")) || 0,
        pct: h.includes("%") || a.includes("%"),
      };
    }).filter((r) => r.label);

    const luRows = firstRows(lu);
    const lineup: LineupPlayer[] = luRows.map((r) => ({
      name: String(r["strPlayer"] ?? ""),
      number: str(r["intSquadNumber"]),
      position: str(r["strPositionShort"]) ?? str(r["strPosition"]),
      home: String(r["strHome"] ?? "").toLowerCase() === "yes",
      sub: String(r["strSubstitute"] ?? "").toLowerCase() === "yes",
    })).filter((p) => p.name);
    const formation = {
      home: str(luRows.find((r) => String(r["strHome"] ?? "").toLowerCase() === "yes")?.["strFormation"]),
      away: str(luRows.find((r) => String(r["strHome"] ?? "").toLowerCase() !== "yes")?.["strFormation"]),
    };

    const v: EventDetail = { event, timeline, stats, lineup, formation };
    DETAIL_CACHE.set(data.id, { exp: Date.now() + 20_000, v });
    if (DETAIL_CACHE.size > 200) DETAIL_CACHE.clear();
    return v;
  });

/* ───────────── Prochains matchs d'un pays (toutes disciplines) ───────────── */

export type NationalGroup = { sport: string; team: string; events: SportEvent[] };
const NAT_CACHE = new Map<string, { exp: number; v: NationalGroup[] }>();

export const getNationalSchedule = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ name: z.string().regex(/^[\p{L}0-9 .'’-]{2,40}$/u) }).parse(d))
  .handler(async ({ data }): Promise<NationalGroup[]> => {
    const key = data.name.toLowerCase();
    const hit = NAT_CACHE.get(key);
    if (hit && hit.exp > Date.now()) return hit.v;

    const found = await getJson(`searchteams.php?t=${encodeURIComponent(data.name)}`);
    const teams = firstRows(found)
      .filter((t) => {
        const n = String(t["strTeam"] ?? "").toLowerCase();
        return n === key || n.startsWith(`${key} `);
      })
      .slice(0, 6);

    const groups = await Promise.all(
      teams.map(async (t): Promise<NationalGroup> => {
        const next = await getJson(`eventsnext.php?id=${encodeURIComponent(String(t["idTeam"] ?? ""))}`);
        const events = firstRows(next)
          .map(map)
          .filter((e) => Date.parse(e.startsAt ?? e.date) > Date.now() - 3 * 3_600_000)
          .sort((a, b) => (a.startsAt ?? a.date).localeCompare(b.startsAt ?? b.date));
        return { sport: String(t["strSport"] ?? ""), team: String(t["strTeam"] ?? ""), events };
      }),
    );

    const v = groups.filter((g) => g.events.length);
    NAT_CACHE.set(key, { exp: Date.now() + 30 * 60_000, v });
    if (NAT_CACHE.size > 100) NAT_CACHE.clear();
    return v;
  });
