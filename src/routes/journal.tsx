import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Film, Star, Tag, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { computeStats, formatDuration, trophies } from "@/lib/insights";
import { CATEGORIES } from "@/lib/catalog";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Mon journal de visionnage — MovieVerse" },
      { name: "description", content: "Votre journal de visionnage, vos statistiques et vos trophées MovieVerse." },
      { property: "og:title", content: "Mon journal de visionnage — MovieVerse" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Journal,
});

function Card({ icon: Icon, label, value }: { icon: typeof Film; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-2xl font-extrabold leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Journal() {
  const { watched, ratings, ratingMeta, favorites, unmarkWatched, ready } = useStore();
  const stats = computeStats(watched, ratings, ratingMeta);
  const list = trophies(stats, Object.keys(ratings).length, favorites.length);
  const unlocked = list.filter((t) => t.value >= t.goal).length;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-36 lg:pt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Mon espace</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Journal de visionnage</h1>
      <p className="mt-3 text-muted-foreground">Sur une fiche, appuyez sur « Marquer comme vu » pour alimenter votre journal, vos statistiques et vos trophées.</p>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card icon={Film} label="Titres vus" value={String(stats.total)} />
        <Card icon={Clock} label="Temps total estimé" value={stats.minutes ? formatDuration(stats.minutes) : "—"} />
        <Card icon={Tag} label="Genre préféré" value={stats.topGenre ?? "—"} />
        <Card icon={Star} label="Ma note moyenne" value={stats.avgRating != null ? `${stats.avgRating}/10` : "—"} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {stats.thisMonth} titre{stats.thisMonth > 1 ? "s" : ""} vu{stats.thisMonth > 1 ? "s" : ""} ce mois-ci · {CATEGORIES.film.label} {stats.byKind.film} · {CATEGORIES.manga.label} {stats.byKind.manga} · {CATEGORIES.occidental.label} {stats.byKind.occidental}
      </p>

      <h2 className="mt-12 text-2xl font-bold">Trophées <span className="text-base font-normal text-muted-foreground">{unlocked}/{list.length}</span></h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {list.map((t) => {
          const done = t.value >= t.goal;
          const pct = Math.min(100, Math.round((t.value / t.goal) * 100));
          return (
            <div key={t.id} className={`rounded-2xl border p-4 ${done ? "border-primary/60 bg-primary/10" : "border-border bg-card"}`}>
              <div className="flex items-center gap-3">
                <span className={`text-3xl ${done ? "" : "opacity-40 grayscale"}`}>{t.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
                <span className="text-xs font-semibold tabular-nums">{Math.min(t.value, t.goal)}/{t.goal}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-12 text-2xl font-bold">Historique</h2>
      {ready && watched.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border p-8 text-center text-muted-foreground">Aucun titre marqué comme vu pour l'instant.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {watched.map((w) => (
            <li key={`${w.kind}:${w.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <Link to="/titre/$kind/$id" params={{ kind: w.kind, id: w.id }} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-muted">{w.poster && <img src={w.poster} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{w.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{new Date(w.at).toLocaleDateString("fr-FR", { dateStyle: "long" })}{w.genres.length ? ` · ${w.genres.slice(0, 3).join(", ")}` : ""}</p>
                </div>
              </Link>
              <button aria-label="Retirer du journal" onClick={() => unmarkWatched(w)} className="rounded-full p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
