import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock3, Globe, LocateFixed, MapPin, RefreshCw, Trophy, Users, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchDetail, TeamBadge } from "@/components/mv/MatchDetail";
import { getNationalSchedule, getSportEvents, type SportEvent } from "@/lib/sportsdb.functions";
import { NATION_EN, SPORTS, countryFromLocale, flagEmoji, isNation, isoDay, liveClock, nationOf, phaseOf, relativeDay, sportEmoji, sportLabel, statusLabel } from "@/lib/sports";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sports")({
  head: () => ({
    meta: [
      { title: "Matchs & Sports Live — MovieVerse" },
      { name: "description", content: "Résultats, matchs du jour et calendrier réels : football, basketball, rugby, MMA, tennis et plus." },
      { property: "og:title", content: "Matchs & Sports Live — MovieVerse" },
      { property: "og:description", content: "Scores réels, matchs en cours et calendrier de plusieurs sports, à l’heure de votre appareil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SportsPage,
});

type View = "live" | "today" | "results" | "upcoming";
const ALL_SPORTS = SPORTS.filter((s) => s.value !== "all").map((s) => s.value);
const COUNTRY_KEY = "mv-country";

function countryFromCoordinates(lat: number, lon: number) {
  if (lat > -26 && lat < -11 && lon > 42 && lon < 51) return "MG";
  if (lat > 41 && lat < 52 && lon > -6 && lon < 10) return "FR";
  if (lat > 24 && lat < 50 && lon > -126 && lon < -66) return "US";
  if (lat > -34 && lat < 6 && lon > -74 && lon < -34) return "BR";
  return countryFromLocale();
}

const hour = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "Horaire à confirmer");

function TeamRow({ src, name, score, live, dim }: { src: string | null; name: string; score: number | null; live: boolean; dim: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <TeamBadge src={src} name={name} />
      <p className={cn("min-w-0 flex-1 truncate font-semibold", dim && "text-muted-foreground")}>{name}</p>
      {score != null && <span className={cn("font-display text-2xl font-extrabold tabular-nums", live ? "text-primary" : dim && "text-muted-foreground")}>{score}</span>}
    </div>
  );
}

function EventCard({ e, onOpen, showDate }: { e: SportEvent; onOpen: () => void; showDate: boolean }) {
  const phase = phaseOf(e);
  const live = phase === "live";
  const finished = phase === "finished";
  const solo = !e.away;
  const hs = e.homeScore ?? null;
  const as = e.awayScore ?? null;
  return (
    <button
      onClick={onOpen}
      className={cn(
        "group relative block w-full min-w-0 overflow-hidden rounded-xl border bg-card p-4 text-left shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-xl",
        live ? "animate-live-card border-primary/60" : "border-border hover:border-primary/70",
      )}
    >
      {live && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primary" />}
      <div className="mb-4 flex items-start justify-between gap-2 border-b border-border pb-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase text-primary">{sportEmoji(e.sport)} {sportLabel(e.sport)} · {e.league}</p>
          {(e.venue || e.country) && <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{[e.venue, e.city, e.country].filter(Boolean).join(", ")}</span></p>}
        </div>
        {live
          ? <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-2.5 py-1 text-xs font-black text-primary-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" /> LIVE · {liveClock(e, Date.now()).text}</span>
          : <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold"><Clock3 className="h-4 w-4 text-primary" />{showDate && e.startsAt ? `${new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" }).format(new Date(e.startsAt))} · ` : ""}{hour(e.startsAt)}</span>}
      </div>
      {solo ? <p className="font-display text-lg font-bold">{e.home}</p> : (
        <div className="space-y-2.5">
          <TeamRow src={e.homeBadge} name={e.home} score={hs} live={live} dim={finished && hs != null && as != null && hs < as} />
          <TeamRow src={e.awayBadge} name={e.away} score={as ?? (hs != null ? 0 : null)} live={live} dim={finished && hs != null && as != null && as < hs} />
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="truncate rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-semibold">{statusLabel(e)}</span>
        <span className="shrink-0 text-xs text-muted-foreground transition group-hover:text-foreground">Voir la fiche →</span>
      </div>
    </button>
  );
}

function NationRow({ ev, onOpen }: { ev: SportEvent; onOpen: () => void }) {
  const live = phaseOf(ev) === "live";
  return (
    <button onClick={onOpen} className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-left transition hover:border-primary/60">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-lg">{sportEmoji(ev.sport)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{ev.away ? `${ev.home} — ${ev.away}` : ev.home}</span>
        <span className="block truncate text-xs text-muted-foreground">{sportLabel(ev.sport)} · {ev.league}</span>
      </span>
      <span className="shrink-0 text-right">
        {live
          ? <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-black text-primary-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" /> LIVE</span>
          : <><span className="block text-sm font-bold">{relativeDay(ev.startsAt)}</span><span className="block text-xs text-muted-foreground">{hour(ev.startsAt)}</span></>}
      </span>
    </button>
  );
}

function MyCountry(props: {
  country: string | null; sport: string; events: SportEvent[]; loading: boolean;
  state: "idle" | "loading" | "ready" | "denied"; onPick: (code: string) => void; onDetect: () => void; onOpen: (e: SportEvent) => void;
}) {
  const { country, sport, events, loading, state, onPick, onDetect, onOpen } = props;
  const nation = nationOf(country);
  const options = useMemo(() => {
    const list = Object.entries(NATION_EN).map(([code, n]) => ({ code, fr: n.fr }));
    if (country && nation && !list.some((o) => o.code === country)) list.push({ code: country, fr: nation.fr });
    return list.sort((a, b) => a.fr.localeCompare(b.fr, "fr"));
  }, [country, nation]);

  const inSport = events.filter((e) => sport === "all" || e.sport === sport);
  const shown = useMemo(() => {
    if (sport !== "all") return inSport.slice(0, 3);
    const seen = new Set<string>();
    return inSport.filter((e) => (seen.has(e.sport) ? false : (seen.add(e.sport), true)));
  }, [inSport, sport]);

  return (
    <section className="mt-12 rounded-xl border border-border bg-card p-4 md:p-6" aria-labelledby="mon-pays">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="mon-pays" className="flex min-w-0 items-center gap-2 text-lg font-bold md:text-xl">
          {country && nation ? <span className="text-2xl" aria-hidden="true">{flagEmoji(country)}</span> : <Globe className="h-5 w-5 text-primary" />}
          <span className="truncate">Mon pays{nation ? ` · ${nation.fr}` : ""}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Choisir mon pays" value={country && options.some((o) => o.code === country) ? country : ""}
            onChange={(ev) => ev.target.value && onPick(ev.target.value)}
            className="h-9 max-w-[11rem] rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="" disabled>Choisir…</option>
            {options.map((o) => <option key={o.code} value={o.code}>{flagEmoji(o.code)} {o.fr}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={onDetect} disabled={state === "loading"}><LocateFixed />{state === "loading" ? "Localisation…" : "Me localiser"}</Button>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {sport === "all" ? "Le prochain match de ton pays, dans chaque sport." : `Le prochain match de ton pays en ${sportLabel(sport).toLowerCase()}.`}
      </p>

      <div className="mt-4 space-y-2">
        {!nation ? <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">Choisis ton pays ou appuie sur « Me localiser » pour voir quand il joue.</p>
          : loading ? <Skeleton className="h-16 rounded-lg" />
          : shown.length ? shown.map((ev) => <NationRow key={ev.id} ev={ev} onOpen={() => onOpen(ev)} />)
          : (
            <div className="rounded-lg border border-dashed border-border p-5 text-center">
              <span className="text-3xl" aria-hidden="true">😴</span>
              <p className="mt-2 font-semibold">{nation.fr} ne joue pas pour le moment</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {sport === "all" ? "Aucun match annoncé, tous sports confondus." : `Rien de prévu en ${sportLabel(sport).toLowerCase()}.`} Reviens plus tard, ça se met à jour tout seul.
              </p>
            </div>
          )}
      </div>
      {state === "denied" && <p className="mt-3 text-xs text-muted-foreground">Position indisponible : choisis ton pays dans la liste.</p>}
    </section>
  );
}

function SportsPage() {
  const fetchEvents = useServerFn(getSportEvents);
  const fetchNation = useServerFn(getNationalSchedule);
  const [view, setView] = useState<View>("live");
  const [sport, setSport] = useState("all");
  const [selected, setSelected] = useState<SportEvent | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "ready" | "denied">("idle");

  const pick = (code: string, save: boolean) => {
    setCountry(code);
    if (save) { try { localStorage.setItem(COUNTRY_KEY, code); } catch { /* stockage indisponible */ } }
  };

  const detect = async (manual: boolean) => {
    setLocationState("loading");
    // 1) Pays déduit de la connexion : rapide, sans demander l'autorisation de position
    try {
      const r = await fetch("/api/public/country", { cache: "no-store" });
      const j = (await r.json()) as { country?: string | null };
      if (j.country && /^[A-Z]{2}$/.test(j.country) && !["XX", "T1"].includes(j.country)) { pick(j.country, manual); setLocationState("ready"); return; }
    } catch { /* on passe à la suite */ }
    if (!manual) { const l = countryFromLocale(); if (l) setCountry(l); setLocationState("idle"); return; }
    // 2) Sinon, position GPS (le téléphone demande l'autorisation)
    if (!navigator.geolocation) { setLocationState("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { const c = countryFromCoordinates(coords.latitude, coords.longitude); if (c) pick(c, true); setLocationState("ready"); },
      () => setLocationState("denied"),
      { timeout: 8_000 },
    );
  };

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(COUNTRY_KEY); } catch { /* ignoré */ }
    if (saved && /^[A-Z]{2}$/.test(saved)) setCountry(saved);
    else void detect(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days = [-1, 0, 1, 2];
  const queries = useQueries({
    queries: days.map((offset) => ({
      queryKey: ["sportsdb", isoDay(offset)],
      queryFn: () => fetchEvents({ data: { date: isoDay(offset), sports: ALL_SPORTS } }),
      staleTime: offset === 0 ? 30_000 : 10 * 60_000,
      refetchInterval: offset === 0 ? 60_000 : (false as const),
    })),
  });
  const [yesterday, today, d1, d2] = queries.map((q) => q.data ?? []);
  const loading = queries.some((q) => q.isLoading);
  const fetching = queries.some((q) => q.isFetching);

  const lists = useMemo(() => {
    const t = today ?? [];
    return {
      live: t.filter((e) => phaseOf(e) === "live"),
      today: t,
      results: [...(yesterday ?? []), ...t].filter((e) => phaseOf(e) === "finished").reverse(),
      upcoming: [...t.filter((e) => phaseOf(e) === "scheduled"), ...(d1 ?? []), ...(d2 ?? [])],
    } satisfies Record<View, SportEvent[]>;
  }, [yesterday, today, d1, d2]);
  const filtered = lists[view].filter((e) => sport === "all" || e.sport === sport);

  // La fiche ouverte se met à jour toute seule quand les données sont rafraîchies
  const current = useMemo(() => {
    if (!selected) return null;
    return [...(yesterday ?? []), ...(today ?? []), ...(d1 ?? []), ...(d2 ?? [])].find((e) => e.id === selected.id) ?? selected;
  }, [selected, yesterday, today, d1, d2]);

  // Prochains matchs du pays choisi (calendrier des 3 jours + prochains matchs des équipes nationales)
  const nation = nationOf(country);
  const nat = useQuery({
    queryKey: ["nation", nation?.en ?? ""],
    enabled: Boolean(nation),
    staleTime: 30 * 60_000,
    queryFn: () => fetchNation({ data: { name: nation?.en ?? "" } }),
  });
  const nationalEvents = useMemo(() => {
    if (!nation) return [] as SportEvent[];
    const byId = new Map<string, SportEvent>();
    for (const e of [...lists.live, ...lists.upcoming]) if (isNation(e.home, nation.en) || (e.away && isNation(e.away, nation.en))) byId.set(e.id, e);
    for (const g of nat.data ?? []) for (const e of g.events) if (!byId.has(e.id) && phaseOf(e) !== "finished" && phaseOf(e) !== "cancelled") byId.set(e.id, e);
    return [...byId.values()].sort((a, b) => (a.startsAt ?? a.date).localeCompare(b.startsAt ?? b.date));
  }, [nation, lists, nat.data]);

  return (
    <div className="min-h-screen overflow-x-clip bg-background pb-24 pt-32">
      <div className="mx-auto w-full min-w-0 max-w-[1500px] px-4 md:px-8">
        <header className="mb-8 border-b border-border pb-8">
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-primary"><Wifi className="h-4 w-4" /> Données réelles · TheSportsDB</p>
          <h1 className="mt-3 text-4xl font-extrabold md:text-6xl">Matchs & Sports <span className="text-primary">Live</span></h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">Résultats, matchs du jour et calendrier de plusieurs sports, affichés à l’heure de votre appareil. Mise à jour automatique chaque minute.</p>
        </header>

        <Tabs value={view} onValueChange={(v) => setView(v as View)} className="min-w-0">
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4"><TabsList className="h-12 min-w-max border border-border bg-card p-1">
            <TabsTrigger value="live" className="h-9">En direct <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-primary" /></TabsTrigger>
            <TabsTrigger value="today" className="h-9">Aujourd’hui</TabsTrigger>
            <TabsTrigger value="results" className="h-9">Résultats</TabsTrigger>
            <TabsTrigger value="upcoming" className="h-9">Prochains matchs</TabsTrigger>
          </TabsList></div>
          <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-2">{SPORTS.map((s) => <Button key={s.value} variant={sport === s.value ? "default" : "outline"} size="sm" className="shrink-0" onClick={() => setSport(s.value)}>{s.label}</Button>)}</div>
          {(["live", "today", "results", "upcoming"] as View[]).map((tab) => <TabsContent key={tab} value={tab} className="mt-8">
            <div className="mb-5 flex items-center justify-between"><p className="text-sm text-muted-foreground">{filtered.length} rencontre{filtered.length > 1 ? "s" : ""}</p><button onClick={() => queries.forEach((q) => q.refetch())} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><RefreshCw className={cn("h-3.5 w-3.5", fetching && "animate-spin")} /> Actualiser</button></div>
            {loading ? <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
              : filtered.length ? <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">{filtered.map((e) => <EventCard key={e.id} e={e} showDate={tab !== "live" && tab !== "today"} onOpen={() => setSelected(e)} />)}</div>
              : <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-border bg-card text-center"><div><Trophy className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-4 font-semibold">{tab === "live" ? "Aucun match en cours pour le moment" : "Aucune rencontre trouvée"}</p><p className="mt-1 text-sm text-muted-foreground">Essayez un autre sport ou une autre période.</p></div></div>}
          </TabsContent>)}
        </Tabs>

        <MyCountry
          country={country} sport={sport} events={nationalEvents} loading={loading || nat.isLoading} state={locationState}
          onPick={(c) => pick(c, true)} onDetect={() => void detect(true)} onOpen={setSelected}
        />

        <div className="mt-10 flex items-start gap-3 border-t border-border pt-6 text-xs text-muted-foreground"><Users className="h-4 w-4 shrink-0 text-primary" /><p>Données fournies par TheSportsDB (accès gratuit, liste parfois partielle selon les compétitions). MovieVerse ne diffuse aucun flux vidéo.</p></div>
      </div>
      <MatchDetail e={current} onClose={() => setSelected(null)} />
    </div>
  );
}
