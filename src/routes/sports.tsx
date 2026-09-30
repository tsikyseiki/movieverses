import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BellRing, CalendarDays, Clock3, LocateFixed, MapPin, Radio, ShieldCheck, Sparkles, Trophy, Tv, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MATCHES, SPORTS, broadcastersFor, countryFromLocale, type Match, type Sport } from "@/lib/sports";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sports")({
  head: () => ({
    meta: [
      { title: "Matchs & Sports Live — MovieVerse" },
      { name: "description", content: "Scores sportifs de démonstration, calendrier et diffuseurs TV officiels selon votre pays." },
      { property: "og:title", content: "Matchs & Sports Live — MovieVerse" },
      { property: "og:description", content: "Suivez les scores, les prochains matchs et leurs diffuseurs officiels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SportsPage,
});

type View = "live" | "today" | "upcoming" | "channels";
const countryNames: Record<string, string> = { FR: "France", MG: "Madagascar", US: "États-Unis", ES: "Espagne", BR: "Brésil", SN: "Sénégal", MA: "Maroc" };

function countryFromCoordinates(latitude: number, longitude: number) {
  if (latitude > -26 && latitude < -11 && longitude > 42 && longitude < 51) return "MG";
  if (latitude > 41 && latitude < 52 && longitude > -6 && longitude < 10) return "FR";
  if (latitude > 24 && latitude < 50 && longitude > -126 && longitude < -66) return "US";
  if (latitude > -34 && latitude < 6 && longitude > -74 && longitude < -34) return "BR";
  return countryFromLocale();
}

function localDate(iso: string, detail = false) {
  return new Intl.DateTimeFormat("fr-FR", detail
    ? { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }
    : { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function TeamBadge({ team }: { team: Match["home"] }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border bg-secondary text-xl" aria-hidden="true">{team.flag}</span>
      <div className="min-w-0"><p className="truncate font-semibold">{team.name}</p><p className="text-xs text-muted-foreground">{team.short}</p></div>
    </div>
  );
}

function MatchCard({ match, country, scorePulse, onOpen }: { match: Match; country: string | null; scorePulse: boolean; onOpen: () => void }) {
  const channels = broadcastersFor(match, country);
  return (
    <button onClick={onOpen} className="group w-full rounded-lg border border-border bg-card p-4 text-left shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary/70 hover:shadow-xl md:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div><p className="text-xs font-bold uppercase text-primary">{match.competition}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {match.venue}</p></div>
        {match.status === "live" ? <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" /> LIVE · {match.minute}′</span> : <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><Clock3 className="h-4 w-4 text-primary" /> {localDate(match.startsAt)}</span>}
      </div>
      <div className="flex items-center gap-3 md:gap-6">
        <TeamBadge team={match.home} />
        <div className={cn("shrink-0 text-center transition", scorePulse && match.status === "live" && "scale-105 text-primary")}>
          {match.homeScore != null ? <p className="font-display text-3xl font-extrabold tabular-nums md:text-4xl">{match.homeScore} <span className="text-muted-foreground">–</span> {match.awayScore}</p> : <p className="text-xs font-bold uppercase text-muted-foreground">À venir</p>}
        </div>
        <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-3 text-right">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border bg-secondary text-xl" aria-hidden="true">{match.away.flag}</span>
          <div className="min-w-0"><p className="truncate font-semibold">{match.away.name}</p><p className="text-xs text-muted-foreground">{match.away.short}</p></div>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-semibold"><Tv className="h-3.5 w-3.5 text-primary" /> {channels[0] ?? "Diffuseur à confirmer"}</span>
        <span className="text-xs text-muted-foreground transition group-hover:text-foreground">Voir la fiche →</span>
      </div>
    </button>
  );
}

function Stat({ label, values, suffix = "" }: { label: string; values: [number, number]; suffix?: string }) {
  return <div><div className="mb-2 flex justify-between text-sm"><strong>{values[0]}{suffix}</strong><span className="text-muted-foreground">{label}</span><strong>{values[1]}{suffix}</strong></div><div className="flex h-1.5 overflow-hidden rounded-full bg-secondary"><span className="bg-primary" style={{ width: `${(values[0] / (values[0] + values[1])) * 100}%` }} /><span className="flex-1 bg-foreground/25" /></div></div>;
}

function MatchDetail({ match, country, onClose }: { match: Match | null; country: string | null; onClose: () => void }) {
  const [tab, setTab] = useState<"stats" | "watch" | "highlights">("stats");
  if (!match) return null;
  const channels = broadcastersFor(match, country);
  return (
    <Dialog open={Boolean(match)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card p-0">
        <DialogHeader className="border-b border-border p-6 pr-12">
          <DialogTitle className="text-2xl">{match.home.name} <span className="text-muted-foreground">vs</span> {match.away.name}</DialogTitle>
          <DialogDescription>{match.competition} · {localDate(match.startsAt, true)}</DialogDescription>
        </DialogHeader>
        <div className="p-6">
          <div className="mb-6 flex items-center justify-center gap-6 rounded-lg bg-secondary p-5 text-center">
            <div><span className="text-3xl">{match.home.flag}</span><p className="mt-1 text-sm font-bold">{match.home.short}</p></div>
            <p className="font-display text-4xl font-black tabular-nums">{match.homeScore ?? "–"} : {match.awayScore ?? "–"}</p>
            <div><span className="text-3xl">{match.away.flag}</span><p className="mt-1 text-sm font-bold">{match.away.short}</p></div>
          </div>
          <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
            {([['stats','Statistiques'],['watch','Où regarder'],['highlights','Résumé & Highlights']] as const).map(([value, label]) => <Button key={value} variant={tab === value ? "default" : "outline"} size="sm" onClick={() => setTab(value)}>{label}</Button>)}
          </div>
          {tab === "stats" && (match.stats ? <div className="space-y-6"><Stat label="Possession" values={match.stats.possession} suffix=" %" /><Stat label="Tirs" values={match.stats.shots} /><Stat label="Fautes" values={match.stats.fouls} /></div> : <p className="py-8 text-center text-sm text-muted-foreground">Les statistiques seront disponibles au coup d’envoi.</p>)}
          {tab === "watch" && <div><div className="mb-4 flex items-start gap-3 rounded-lg border border-border bg-secondary p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p className="text-sm text-muted-foreground">Diffuseurs officiels disponibles pour {countryNames[country ?? ""] ?? "votre zone"}. MovieVerse ne diffuse aucun flux vidéo.</p></div><div className="grid gap-3 sm:grid-cols-2">{channels.map((channel) => <div key={channel} className="flex items-center gap-3 rounded-lg border border-border p-4"><Tv className="h-5 w-5 text-primary" /><strong>{channel}</strong></div>)}</div></div>}
          {tab === "highlights" && <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-secondary text-center"><div><Radio className="mx-auto h-9 w-9 text-primary" /><p className="mt-3 font-semibold">Résumé officiel bientôt disponible</p><p className="mt-1 text-xs text-muted-foreground">Zone prête pour une vidéo YouTube publiée par l’organisateur.</p></div></div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SportsPage() {
  const [view, setView] = useState<View>("live");
  const [sport, setSport] = useState<"all" | Sport>("all");
  const [selected, setSelected] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "ready" | "denied">("idle");
  const [scorePulse, setScorePulse] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setLoading(false), 700); return () => window.clearTimeout(t); }, []);
  useEffect(() => { setCountry(countryFromLocale()); }, []);
  useEffect(() => { const t = window.setInterval(() => { setScorePulse(true); window.setTimeout(() => setScorePulse(false), 900); }, 12_000); return () => window.clearInterval(t); }, []);
  const filtered = useMemo(() => MATCHES.filter((match) => (sport === "all" || match.sport === sport) && (view === "channels" || match.status === view)), [sport, view]);
  const nationalMatch = useMemo(() => country ? MATCHES.find((match) => match.status !== "live" && (match.home.country === country || match.away.country === country)) : null, [country]);
  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationState("denied"); return; }
    setLocationState("loading");
    navigator.geolocation.getCurrentPosition(({ coords }) => { setCountry(countryFromCoordinates(coords.latitude, coords.longitude)); setLocationState("ready"); }, () => { setCountry(countryFromLocale()); setLocationState("denied"); }, { timeout: 8_000 });
  };
  return (
    <div className="min-h-screen bg-background pb-24 pt-32">
      <div className="mx-auto max-w-[1500px] px-4 md:px-8">
        <header className="mb-8 border-b border-border pb-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div><p className="flex items-center gap-2 text-xs font-bold uppercase text-primary"><Wifi className="h-4 w-4" /> Tableau des scores</p><h1 className="mt-3 text-4xl font-extrabold md:text-6xl">Matchs & Sports <span className="text-primary">Live</span></h1><p className="mt-4 max-w-2xl text-muted-foreground">Scores de démonstration, calendrier en heure locale et diffuseurs officiels. Aucun flux illégal n’est hébergé.</p></div>
            <Button variant="outline" onClick={requestLocation} disabled={locationState === "loading"}><LocateFixed />{locationState === "loading" ? "Localisation…" : country ? `Zone : ${countryNames[country] ?? country}` : "Détecter mon pays"}</Button>
          </div>
        </header>
        {nationalMatch && <div className="mb-8 flex flex-col gap-4 rounded-lg border border-primary/35 bg-primary/10 p-5 sm:flex-row sm:items-center"><BellRing className="h-6 w-6 shrink-0 text-primary" /><div className="flex-1"><p className="font-bold">Un match concerne votre pays</p><p className="mt-1 text-sm text-muted-foreground">{nationalMatch.home.flag} {nationalMatch.home.name} — {nationalMatch.away.name} {nationalMatch.away.flag}, {localDate(nationalMatch.startsAt, true)}.</p></div><span className="text-xs font-semibold text-primary">Alerte locale</span></div>}
        {locationState === "denied" && <p className="mb-6 text-sm text-muted-foreground">Accès à la position indisponible : le fuseau horaire du téléphone reste utilisé.</p>}
        <Tabs value={view} onValueChange={(value) => setView(value as View)}>
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4"><TabsList className="h-12 min-w-max border border-border bg-card p-1"><TabsTrigger value="live" className="h-9">En Direct <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-primary" /></TabsTrigger><TabsTrigger value="today" className="h-9">Aujourd’hui</TabsTrigger><TabsTrigger value="upcoming" className="h-9">Prochains Matchs</TabsTrigger><TabsTrigger value="channels" className="h-9">Chaînes TV</TabsTrigger></TabsList></div>
          <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-2">{SPORTS.map((item) => <Button key={item.value} variant={sport === item.value ? "default" : "outline"} size="sm" onClick={() => setSport(item.value)}>{item.label}</Button>)}</div>
          {(["live", "today", "upcoming", "channels"] as View[]).map((tab) => <TabsContent key={tab} value={tab} className="mt-8">
            <div className="mb-5 flex items-center justify-between"><p className="text-sm text-muted-foreground">{filtered.length} rencontre{filtered.length > 1 ? "s" : ""}</p><p className="text-xs text-muted-foreground">Mise à jour démo · heure du téléphone</p></div>
            {loading ? <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-lg" />)}</div> : filtered.length ? <div className="grid gap-4 lg:grid-cols-2">{filtered.map((match) => <MatchCard key={match.id} match={match} country={country} scorePulse={scorePulse} onOpen={() => setSelected(match)} />)}</div> : <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-border bg-card text-center"><div><Trophy className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-4 font-semibold">Aucun match disponible</p><p className="mt-1 text-sm text-muted-foreground">Essayez un autre sport ou une autre période.</p></div></div>}
          </TabsContent>)}
        </Tabs>
        <div className="mt-10 flex items-start gap-3 border-t border-border pt-6 text-xs text-muted-foreground"><Sparkles className="h-4 w-4 shrink-0 text-primary" /><p>Les scores et chronomètres affichés sont des données fictives de démonstration. Les horaires sont automatiquement convertis dans le fuseau de votre appareil.</p></div>
      </div>
      <MatchDetail match={selected} country={country} onClose={() => setSelected(null)} />
    </div>
  );
}