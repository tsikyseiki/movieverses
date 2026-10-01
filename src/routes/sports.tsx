import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Clock3, LocateFixed, MapPin, Radio, RefreshCw, Trophy, Users, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSportEvents, type SportEvent } from "@/lib/sportsdb.functions";
import { NATION_EN, SPORTS, countryFromLocale, isoDay, phaseOf, sportLabel, statusLabel, youtubeId } from "@/lib/sports";
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

function countryFromCoordinates(lat: number, lon: number) {
  if (lat > -26 && lat < -11 && lon > 42 && lon < 51) return "MG";
  if (lat > 41 && lat < 52 && lon > -6 && lon < 10) return "FR";
  if (lat > 24 && lat < 50 && lon > -126 && lon < -66) return "US";
  if (lat > -34 && lat < 6 && lon > -74 && lon < -34) return "BR";
  return countryFromLocale();
}

function localDate(iso: string | null, detail = false) {
  if (!iso) return "Horaire à confirmer";
  return new Intl.DateTimeFormat("fr-FR", detail
    ? { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }
    : { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function Badge({ src, name }: { src: string | null; name: string }) {
  return src
    ? <img src={`${src}/small`} onError={(e) => { (e.currentTarget as HTMLImageElement).src = src; }} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-md border border-border bg-secondary object-contain p-1" />
    : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border bg-secondary text-sm font-bold" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>;
}

function EventCard({ e, onOpen, showDate }: { e: SportEvent; onOpen: () => void; showDate: boolean }) {
  const phase = phaseOf(e);
  const solo = !e.away;
  return (
    <button onClick={onOpen} className="group w-full rounded-lg border border-border bg-card p-4 text-left shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary/70 hover:shadow-xl md:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="min-w-0"><p className="truncate text-xs font-bold uppercase text-primary">{sportLabel(e.sport)} · {e.league}</p>{(e.venue || e.country) && <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {[e.venue, e.city, e.country].filter(Boolean).join(", ")}</p>}</div>
        {phase === "live"
          ? <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" /> LIVE · {e.status}</span>
          : <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><Clock3 className="h-4 w-4 text-primary" /> {showDate && e.startsAt ? new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" }).format(new Date(e.startsAt)) + " · " : ""}{localDate(e.startsAt)}</span>}
      </div>
      {solo ? <p className="font-display text-lg font-bold">{e.home}</p> : (
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-3"><Badge src={e.homeBadge} name={e.home} /><p className="truncate font-semibold">{e.home}</p></div>
          <div className="shrink-0 text-center">
            {e.homeScore != null ? <p className={cn("font-display text-3xl font-extrabold tabular-nums md:text-4xl", phase === "live" && "text-primary")}>{e.homeScore} <span className="text-muted-foreground">–</span> {e.awayScore ?? 0}</p> : <p className="text-xs font-bold uppercase text-muted-foreground">vs</p>}
          </div>
          <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-3 text-right"><Badge src={e.awayBadge} name={e.away} /><p className="truncate font-semibold">{e.away}</p></div>
        </div>
      )}
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-semibold">{statusLabel(e)}</span>
        <span className="text-xs text-muted-foreground transition group-hover:text-foreground">Voir la fiche →</span>
      </div>
    </button>
  );
}

function EventDetail({ e, onClose }: { e: SportEvent | null; onClose: () => void }) {
  if (!e) return null;
  const vid = youtubeId(e.video);
  const rows: [string, string | null][] = [
    ["Compétition", e.league], ["Saison", e.season], ["Journée / tour", e.round], ["Statut", statusLabel(e)],
    ["Lieu", [e.venue, e.city, e.country].filter(Boolean).join(", ") || null],
    ["Spectateurs", e.spectators ? e.spectators.toLocaleString("fr-FR") : null],
  ];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card p-0">
        <DialogHeader className="border-b border-border p-6 pr-12">
          <DialogTitle className="text-2xl">{e.away ? <>{e.home} <span className="text-muted-foreground">vs</span> {e.away}</> : e.home}</DialogTitle>
          <DialogDescription>{sportLabel(e.sport)} · {localDate(e.startsAt, true)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 p-6">
          {e.away && <div className="flex items-center justify-center gap-6 rounded-lg bg-secondary p-5 text-center">
            <div className="flex flex-col items-center"><Badge src={e.homeBadge} name={e.home} /><p className="mt-1 max-w-28 truncate text-sm font-bold">{e.home}</p></div>
            <p className="font-display text-4xl font-black tabular-nums">{e.homeScore ?? "–"} : {e.awayScore ?? "–"}</p>
            <div className="flex flex-col items-center"><Badge src={e.awayBadge} name={e.away} /><p className="mt-1 max-w-28 truncate text-sm font-bold">{e.away}</p></div>
          </div>}
          <dl className="grid gap-3 sm:grid-cols-2">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k} className="rounded-lg border border-border p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 font-semibold">{v}</dd></div>)}</dl>
          {e.result && <p className="whitespace-pre-line rounded-lg border border-border p-4 text-sm text-muted-foreground">{e.result}</p>}
          <div>
            <p className="mb-3 font-semibold">Résumé & Highlights</p>
            {vid ? <iframe className="aspect-video w-full rounded-lg" src={`https://www.youtube.com/embed/${vid}`} title="Résumé officiel" allowFullScreen />
              : e.thumb ? <img src={e.thumb} alt="" className="aspect-video w-full rounded-lg object-cover" />
              : <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-secondary text-center"><div><Radio className="mx-auto h-9 w-9 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Aucun résumé vidéo publié pour cette rencontre.</p></div></div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SportsPage() {
  const fetchEvents = useServerFn(getSportEvents);
  const [view, setView] = useState<View>("live");
  const [sport, setSport] = useState("all");
  const [selected, setSelected] = useState<SportEvent | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "ready" | "denied">("idle");
  useEffect(() => { setCountry(countryFromLocale()); }, []);

  const days = [-1, 0, 1, 2];
  const queries = useQueries({
    queries: days.map((offset) => ({
      queryKey: ["sportsdb", isoDay(offset)],
      queryFn: () => fetchEvents({ data: { date: isoDay(offset), sports: ALL_SPORTS } }),
      staleTime: offset === 0 ? 30_000 : 10 * 60_000,
      refetchInterval: offset === 0 ? 60_000 : false as const,
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

  const nation = country ? NATION_EN[country] : undefined;
  const nationalMatch = useMemo(() => nation ? lists.upcoming.concat(lists.live).find((e) => [e.home, e.away].some((n) => n === nation.en || n.startsWith(`${nation.en} `))) : undefined, [nation, lists]);

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationState("denied"); return; }
    setLocationState("loading");
    navigator.geolocation.getCurrentPosition(({ coords }) => { setCountry(countryFromCoordinates(coords.latitude, coords.longitude)); setLocationState("ready"); }, () => setLocationState("denied"), { timeout: 8_000 });
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-32">
      <div className="mx-auto max-w-[1500px] px-4 md:px-8">
        <header className="mb-8 border-b border-border pb-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div><p className="flex items-center gap-2 text-xs font-bold uppercase text-primary"><Wifi className="h-4 w-4" /> Données réelles · TheSportsDB</p><h1 className="mt-3 text-4xl font-extrabold md:text-6xl">Matchs & Sports <span className="text-primary">Live</span></h1><p className="mt-4 max-w-2xl text-muted-foreground">Résultats, matchs du jour et calendrier de plusieurs sports, affichés à l’heure de votre appareil. Mise à jour automatique chaque minute.</p></div>
            <Button variant="outline" onClick={requestLocation} disabled={locationState === "loading"}><LocateFixed />{locationState === "loading" ? "Localisation…" : nation ? `Zone : ${nation.fr}` : "Détecter mon pays"}</Button>
          </div>
        </header>
        {nationalMatch && nation && <div className="mb-8 flex flex-col gap-4 rounded-lg border border-primary/35 bg-primary/10 p-5 sm:flex-row sm:items-center"><BellRing className="h-6 w-6 shrink-0 text-primary" /><div className="flex-1"><p className="font-bold">{nation.fr} joue bientôt</p><p className="mt-1 text-sm text-muted-foreground">{nationalMatch.home} — {nationalMatch.away} ({nationalMatch.league}), {localDate(nationalMatch.startsAt, true)}.</p></div><Button size="sm" onClick={() => setSelected(nationalMatch)}>Voir</Button></div>}
        {locationState === "denied" && <p className="mb-6 text-sm text-muted-foreground">Accès à la position indisponible : le fuseau horaire du téléphone reste utilisé.</p>}
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4"><TabsList className="h-12 min-w-max border border-border bg-card p-1">
            <TabsTrigger value="live" className="h-9">En direct <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-primary" /></TabsTrigger>
            <TabsTrigger value="today" className="h-9">Aujourd’hui</TabsTrigger>
            <TabsTrigger value="results" className="h-9">Résultats</TabsTrigger>
            <TabsTrigger value="upcoming" className="h-9">Prochains matchs</TabsTrigger>
          </TabsList></div>
          <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-2">{SPORTS.map((s) => <Button key={s.value} variant={sport === s.value ? "default" : "outline"} size="sm" onClick={() => setSport(s.value)}>{s.label}</Button>)}</div>
          {(["live", "today", "results", "upcoming"] as View[]).map((tab) => <TabsContent key={tab} value={tab} className="mt-8">
            <div className="mb-5 flex items-center justify-between"><p className="text-sm text-muted-foreground">{filtered.length} rencontre{filtered.length > 1 ? "s" : ""}</p><button onClick={() => queries.forEach((q) => q.refetch())} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><RefreshCw className={cn("h-3.5 w-3.5", fetching && "animate-spin")} /> Actualiser</button></div>
            {loading ? <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-lg" />)}</div>
              : filtered.length ? <div className="grid gap-4 lg:grid-cols-2">{filtered.map((e) => <EventCard key={e.id} e={e} showDate={tab !== "live" && tab !== "today"} onOpen={() => setSelected(e)} />)}</div>
              : <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-border bg-card text-center"><div><Trophy className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-4 font-semibold">{tab === "live" ? "Aucun match en cours pour le moment" : "Aucune rencontre trouvée"}</p><p className="mt-1 text-sm text-muted-foreground">Essayez un autre sport ou une autre période.</p></div></div>}
          </TabsContent>)}
        </Tabs>
        <div className="mt-10 flex items-start gap-3 border-t border-border pt-6 text-xs text-muted-foreground"><Users className="h-4 w-4 shrink-0 text-primary" /><p>Données fournies par TheSportsDB (accès gratuit, liste parfois partielle selon les compétitions). MovieVerse ne diffuse aucun flux vidéo.</p></div>
      </div>
      <EventDetail e={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
