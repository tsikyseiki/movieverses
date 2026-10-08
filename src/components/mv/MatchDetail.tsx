import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Radio } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEventDetail, type LineupPlayer, type SportEvent, type StatRow, type TimelineItem } from "@/lib/sportsdb.functions";
import { liveClock, phaseOf, sportLabel, statusLabel, youtubeId } from "@/lib/sports";
import { cn } from "@/lib/utils";

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function TeamBadge({ src, name, size = "sm", ring = false }: { src: string | null; name: string; size?: "sm" | "lg"; ring?: boolean }) {
  const box = size === "lg" ? "h-16 w-16 rounded-2xl p-2 sm:h-20 sm:w-20" : "h-10 w-10 rounded-lg p-1";
  return (
    <span className={cn("relative grid shrink-0 place-items-center border border-border bg-secondary", box, ring && "animate-ring")}>
      {src ? (
        <img
          src={`${src}/${size === "lg" ? "medium" : "small"}`}
          onError={(ev) => { const img = ev.currentTarget; if (!img.dataset["f"]) { img.dataset["f"] = "1"; img.src = src; } }}
          alt="" loading="lazy" className="h-full w-full object-contain"
        />
      ) : <span className="text-sm font-bold" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>}
    </span>
  );
}

const fullDate = (iso: string | null) => iso
  ? new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso))
  : "Horaire à confirmer";

function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d} j ${p(h)}:${p(m)}:${p(sec)}` : `${p(h)}:${p(m)}:${p(sec)}`;
}

const DETAIL_FR: Record<string, string> = {
  "normal goal": "But", penalty: "Penalty", "own goal": "Contre son camp", "yellow card": "Carton jaune", "red card": "Carton rouge",
  "second yellow card": "Second jaune", "missed penalty": "Penalty manqué", "goal cancelled": "But refusé", "goal disallowed": "But refusé",
};
const frDetail = (d: string | null) => (d ? DETAIL_FR[d.toLowerCase()] ?? d : null);

function Bubble({ it, side, delay }: { it: TimelineItem; side: "l" | "r"; delay: number }) {
  const icon = it.kind === "goal" ? <span className="text-xl leading-none">⚽</span>
    : it.kind === "yellow" ? <span className="h-5 w-3.5 shrink-0 rounded-[3px] bg-yellow-400 shadow" />
    : it.kind === "red" ? <span className="h-5 w-3.5 shrink-0 rounded-[3px] bg-red-600 shadow" />
    : it.kind === "sub" ? <span className="text-lg leading-none">🔄</span>
    : <span className="text-primary">•</span>;
  const title = it.player ?? frDetail(it.detail) ?? "Événement";
  const sub = it.kind === "sub" ? (it.other ? `⇄ ${it.other}` : "Remplacement")
    : it.kind === "goal" && it.other ? `Passe : ${it.other}`
    : it.player ? frDetail(it.detail) : null;
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg border p-2",
        side === "l" ? "animate-slide-l flex-row-reverse text-right" : "animate-slide-r",
        it.kind === "goal" ? "border-primary/60 bg-primary/10" : "border-border bg-secondary/60",
      )}
    >
      {icon}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{title}</p>
        {sub && <p className="truncate text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function Feed({ items, live }: { items: TimelineItem[]; live: boolean }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <Radio className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 text-sm font-semibold">{live ? "Match en cours…" : "Pas encore d’événements"}</p>
        <p className="mt-1 text-xs text-muted-foreground">Buts, cartons et remplacements s’affichent ici dès qu’ils sont publiés par la source (gratuite : certaines compétitions n’ont pas ce détail).</p>
      </div>
    );
  }
  return (
    <ol className="relative space-y-3 before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border">
      {items.map((it, i) => (
        <li key={it.id} className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <div>{it.home && <Bubble it={it} side="l" delay={Math.min(i, 12) * 70} />}</div>
          <span className="z-10 grid h-8 min-w-8 place-items-center rounded-full border border-border bg-card px-1.5 text-[11px] font-extrabold tabular-nums">{it.minute != null ? `${it.minute}'` : "–"}</span>
          <div>{!it.home && <Bubble it={it} side="r" delay={Math.min(i, 12) * 70} />}</div>
        </li>
      ))}
    </ol>
  );
}

function Stats({ rows }: { rows: StatRow[] }) {
  if (!rows.length) return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Statistiques indisponibles pour cette rencontre.</p>;
  const fmt = (n: number, pct: boolean) => (pct ? `${Math.round(n)}%` : String(n));
  return (
    <div className="space-y-4">
      {rows.map((r, i) => {
        const total = r.home + r.away || 1;
        const hp = r.pct ? r.home : (r.home / total) * 100;
        const ap = r.pct ? r.away : (r.away / total) * 100;
        return (
          <div key={r.label} className="animate-rise" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className={cn("font-extrabold tabular-nums", r.home > r.away && "text-primary")}>{fmt(r.home, r.pct)}</span>
              <span className="min-w-0 truncate text-center text-xs text-muted-foreground">{r.label}</span>
              <span className={cn("font-extrabold tabular-nums", r.away > r.home && "text-primary")}>{fmt(r.away, r.pct)}</span>
            </div>
            <div className="flex gap-1.5">
              <div className="flex h-2 flex-1 justify-end overflow-hidden rounded-full bg-secondary"><div className={cn("animate-bar-grow h-full origin-right rounded-full", r.home >= r.away ? "bg-primary" : "bg-muted-foreground/50")} style={{ width: `${hp}%` }} /></div>
              <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className={cn("animate-bar-grow h-full origin-left rounded-full", r.away >= r.home ? "bg-primary" : "bg-muted-foreground/50")} style={{ width: `${ap}%` }} /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Lineups({ players, formation, home, away }: { players: LineupPlayer[]; formation: { home: string | null; away: string | null }; home: string; away: string }) {
  if (!players.length) return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Compositions non publiées pour cette rencontre.</p>;
  return (
    <div className="grid grid-cols-2 gap-3">
      {[true, false].map((isHome) => {
        const list = players.filter((p) => p.home === isHome);
        const row = (p: LineupPlayer, i: number) => (
          <li key={`${p.name}${i}`} className="flex min-w-0 items-center gap-2 rounded-md bg-secondary/60 px-2 py-1.5 text-sm">
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-primary/15 text-[11px] font-bold tabular-nums text-primary">{p.number ?? "–"}</span>
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            {p.position && <span className="text-[10px] text-muted-foreground">{p.position}</span>}
          </li>
        );
        const subs = list.filter((p) => p.sub);
        const f = isHome ? formation.home : formation.away;
        return (
          <div key={String(isHome)} className="min-w-0">
            <p className="mb-2 truncate text-xs font-bold uppercase text-primary">{isHome ? home : away}{f ? ` · ${f}` : ""}</p>
            <ul className="space-y-1">{list.filter((p) => !p.sub).map(row)}</ul>
            {subs.length > 0 && <><p className="mb-1 mt-3 text-[11px] uppercase text-muted-foreground">Remplaçants</p><ul className="space-y-1">{subs.map(row)}</ul></>}
          </div>
        );
      })}
    </div>
  );
}

function GoalBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center" aria-hidden="true">
      <span className="mv-goal-text">BUT !</span>
      {Array.from({ length: 16 }).map((_, i) => (
        <i key={i} className="mv-confetti" style={{ "--a": `${(i * 360) / 16}deg`, "--d": `${80 + (i % 3) * 30}px`, animationDelay: `${(i % 4) * 40}ms` } as CSSProperties} />
      ))}
    </div>
  );
}

function Team({ src, name, live }: { src: string | null; name: string; live: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <div className={cn(live && "animate-float")}><TeamBadge src={src} name={name} size="lg" ring={live} /></div>
      <p className="line-clamp-2 w-full break-words text-sm font-bold leading-tight sm:text-base">{name}</p>
    </div>
  );
}

function Body({ e }: { e: SportEvent }) {
  const fetchDetail = useServerFn(getEventDetail);
  const startLive = phaseOf(e) === "live";
  const q = useQuery({
    queryKey: ["event-detail", e.id],
    queryFn: () => fetchDetail({ data: { id: e.id } }),
    staleTime: startLive ? 15_000 : 5 * 60_000,
    refetchInterval: startLive ? 30_000 : (false as const),
  });
  const d = q.data;
  const ev: SportEvent = d?.event
    ? { ...e, homeScore: d.event.homeScore ?? e.homeScore, awayScore: d.event.awayScore ?? e.awayScore, status: d.event.status || e.status }
    : e;
  const phase = phaseOf(ev);
  const live = phase === "live";
  const now = useNow(live || phase === "scheduled" ? 1000 : 60_000);
  const clock = live ? liveClock(ev, now) : null;
  const solo = !ev.away;

  const prev = useRef({ h: ev.homeScore, a: ev.awayScore });
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    const goal = (ev.homeScore ?? 0) > (prev.current.h ?? 0) || (ev.awayScore ?? 0) > (prev.current.a ?? 0);
    prev.current = { h: ev.homeScore, a: ev.awayScore };
    if (!goal || !live) return undefined;
    setBurst(true);
    const t = setTimeout(() => setBurst(false), 3500);
    return () => clearTimeout(t);
  }, [ev.homeScore, ev.awayScore, live]);

  const vid = youtubeId(ev.video);
  const rows: [string, string | null][] = [
    ["Compétition", ev.league], ["Saison", ev.season], ["Journée / tour", ev.round], ["Statut", statusLabel(ev)],
    ["Lieu", [ev.venue, ev.city, ev.country].filter(Boolean).join(", ") || null],
    ["Spectateurs", ev.spectators ? ev.spectators.toLocaleString("fr-FR") : null],
  ];

  return (
    <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-2xl gap-0 overflow-y-auto overflow-x-hidden border-border bg-card p-0">
      <DialogTitle className="sr-only">{ev.away ? `${ev.home} contre ${ev.away}` : ev.home}</DialogTitle>
      <DialogDescription className="sr-only">{sportLabel(ev.sport)} · {fullDate(ev.startsAt)}</DialogDescription>

      <div className="relative isolate overflow-hidden px-3 pb-6 pt-10 text-center sm:px-6">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/30 via-primary/5 to-transparent" />
        {live && <div aria-hidden="true" className="animate-glow absolute left-1/2 top-24 -z-10 h-56 w-56 rounded-full bg-primary/40 blur-3xl" />}
        {burst && <GoalBurst />}

        <p className="mx-auto mb-5 max-w-[85%] truncate text-[11px] font-bold uppercase tracking-widest text-primary">
          {sportLabel(ev.sport)} · {ev.league}{ev.sport === "Soccer" && ev.round ? ` · Journée ${ev.round}` : ""}
        </p>

        {solo ? <h2 className="font-display text-2xl font-extrabold">{ev.home}</h2> : (
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
            <Team src={ev.homeBadge} name={ev.home} live={live} />
            <div className="px-1">
              {phase === "scheduled"
                ? <p className="font-display text-2xl font-black text-muted-foreground">VS</p>
                : (
                  <p className={cn("font-display text-5xl font-black tabular-nums sm:text-6xl", live && "text-primary")}>
                    <span key={`h${ev.homeScore}`} className="animate-score-pop inline-block">{ev.homeScore ?? 0}</span>
                    <span className="mx-1 text-muted-foreground">:</span>
                    <span key={`a${ev.awayScore}`} className="animate-score-pop inline-block">{ev.awayScore ?? 0}</span>
                  </p>
                )}
            </div>
            <Team src={ev.awayBadge} name={ev.away} live={live} />
          </div>
        )}

        <div className="mt-5 flex flex-col items-center gap-2">
          {live && clock && (
            <>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/40">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" /> LIVE <span className="opacity-60">·</span> <span className="tabular-nums">{clock.text}</span>
              </span>
              {clock.progress != null && (
                <div className="relative h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-[width] duration-1000" style={{ width: `${Math.round(clock.progress * 100)}%` }} />
                  <span className="absolute inset-y-0 left-1/2 w-px bg-background/70" />
                </div>
              )}
            </>
          )}
          {phase === "scheduled" && (
            <>
              <p className="text-xs uppercase text-muted-foreground">Coup d’envoi dans</p>
              <p className="font-display text-3xl font-extrabold tabular-nums">{ev.startsAt ? countdown(Date.parse(ev.startsAt) - now) : "—"}</p>
            </>
          )}
          {phase === "finished" && <span className="rounded-full border border-border bg-secondary px-4 py-1.5 text-sm font-bold">Terminé</span>}
          {phase === "cancelled" && <span className="rounded-full border border-border bg-secondary px-4 py-1.5 text-sm font-bold">Reporté / annulé</span>}
          <p className="text-xs capitalize text-muted-foreground">{fullDate(ev.startsAt)}</p>
          {(ev.venue || ev.city) && <p className="flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /> {[ev.venue, ev.city].filter(Boolean).join(", ")}</p>}
        </div>
      </div>

      <Tabs defaultValue="feed" className="min-w-0">
        <TabsList className="mx-3 grid h-11 grid-cols-4 sm:mx-6">
          <TabsTrigger value="feed" className="h-9 px-1 text-xs sm:text-sm">{live ? "Direct" : "Résumé"}</TabsTrigger>
          <TabsTrigger value="stats" className="h-9 px-1 text-xs sm:text-sm">Stats</TabsTrigger>
          <TabsTrigger value="lineup" className="h-9 px-1 text-xs sm:text-sm">Compos</TabsTrigger>
          <TabsTrigger value="info" className="h-9 px-1 text-xs sm:text-sm">Infos</TabsTrigger>
        </TabsList>
        <div className="p-3 pb-6 sm:p-6">
          <TabsContent value="feed" className="mt-2">
            {q.isLoading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div> : <Feed items={d?.timeline ?? []} live={live} />}
            {live && <p className="mt-4 text-center text-[11px] text-muted-foreground">Mise à jour automatique toutes les 30 secondes.</p>}
          </TabsContent>
          <TabsContent value="stats" className="mt-2">{q.isLoading ? <Skeleton className="h-40 rounded-lg" /> : <Stats rows={d?.stats ?? []} />}</TabsContent>
          <TabsContent value="lineup" className="mt-2">{q.isLoading ? <Skeleton className="h-40 rounded-lg" /> : <Lineups players={d?.lineup ?? []} formation={d?.formation ?? { home: null, away: null }} home={ev.home} away={ev.away} />}</TabsContent>
          <TabsContent value="info" className="mt-2 space-y-5">
            <dl className="grid gap-3 sm:grid-cols-2">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k} className="min-w-0 rounded-lg border border-border p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 break-words font-semibold">{v}</dd></div>)}</dl>
            {ev.result && <p className="whitespace-pre-line rounded-lg border border-border p-4 text-sm text-muted-foreground">{ev.result}</p>}
            <div>
              <p className="mb-3 font-semibold">Résumé & Highlights</p>
              {vid ? <iframe className="aspect-video w-full rounded-lg" src={`https://www.youtube.com/embed/${vid}`} title="Résumé officiel" allowFullScreen />
                : ev.thumb ? <img src={ev.thumb} alt="" className="aspect-video w-full rounded-lg object-cover" />
                : <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-secondary text-center"><div><Radio className="mx-auto h-9 w-9 text-primary" /><p className="mt-3 px-4 text-sm text-muted-foreground">Aucun résumé vidéo publié pour cette rencontre.</p></div></div>}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </DialogContent>
  );
}

export function MatchDetail({ e, onClose }: { e: SportEvent | null; onClose: () => void }) {
  if (!e) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <Body e={e} />
    </Dialog>
  );
}
