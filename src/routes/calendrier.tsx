import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { fetchAiring, fetchReleases, type Item } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendrier")({
  head: () => ({
    meta: [
      { title: "Calendrier des sorties — MovieVerse" },
      { name: "description", content: "Prochaines sorties de films et épisodes d'animés de la semaine, avec rappel dans votre calendrier." },
      { property: "og:title", content: "Calendrier des sorties — MovieVerse" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CalendarPage,
});

// Crée un fichier .ics : le téléphone l'ouvre dans l'appli Calendrier avec une alarme à 9 h le jour J
function downloadIcs(title: string, dateIso: string) {
  const ymd = dateIso.replace(/-/g, "");
  const next = new Date(dateIso);
  next.setDate(next.getDate() + 1);
  const end = next.toISOString().slice(0, 10).replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const text = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MovieVerse//FR", "BEGIN:VEVENT",
    `UID:${ymd}-${Math.random().toString(36).slice(2)}@movieverse`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:Sortie : ${title.replace(/[,;\n]/g, " ")}`,
    "BEGIN:VALARM", "TRIGGER:PT9H", "ACTION:DISPLAY", "DESCRIPTION:Sortie aujourd'hui", "END:VALARM", "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^\w]+/g, "-").slice(0, 40)}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const dayLabel = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

function CalendarPage() {
  const { settings } = useStore();
  const [tab, setTab] = useState<"films" | "anime">("films");
  const films = useQuery({ queryKey: ["releases", settings.lang], queryFn: () => fetchReleases(settings.lang), staleTime: 60 * 60_000 });
  const anime = useQuery({ queryKey: ["airing"], queryFn: fetchAiring, staleTime: 30 * 60_000, enabled: tab === "anime" });

  const groups = new Map<string, { label: string; rows: { key: string; item: Item; note?: string; date?: string }[] }>();
  const push = (day: string, label: string, row: { key: string; item: Item; note?: string; date?: string }) => {
    const g = groups.get(day) ?? { label, rows: [] };
    g.rows.push(row);
    groups.set(day, g);
  };
  if (tab === "films") {
    for (const it of films.data ?? []) if (it.date) push(it.date, dayLabel(new Date(it.date)), { key: `f${it.id}`, item: it, date: it.date });
  } else {
    for (const a of anime.data ?? []) {
      const d = new Date(a.at * 1000);
      push(d.toISOString().slice(0, 10), dayLabel(d), { key: `a${a.item.id}${a.episode}`, item: a.item, note: `Épisode ${a.episode} · ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` });
    }
  }
  const loading = tab === "films" ? films.isLoading : anime.isLoading;
  const days = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-36 lg:pt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">À venir</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Calendrier des sorties</h1>
      <div className="mt-6 inline-flex rounded-full bg-muted p-1">
        {([["films", "Films (75 jours)"], ["anime", "Animés (7 jours)"]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={cn("rounded-full px-4 py-2 text-sm font-semibold transition", tab === v ? "bg-background shadow" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>
      {loading && <div className="mt-8 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>}
      {!loading && days.length === 0 && <p className="mt-12 text-center text-muted-foreground">Aucune sortie trouvée pour l'instant.</p>}
      {days.map(([day, g]) => (
        <section key={day} className="mt-8">
          <h2 className="text-lg font-bold capitalize">{g.label}</h2>
          <div className="mt-3 space-y-2">
            {g.rows.map((r) => (
              <div key={r.key} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <Link to="/titre/$kind/$id" params={{ kind: r.item.kind, id: r.item.id }} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">{r.item.poster && <img src={r.item.poster} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.note ?? (r.item.rating ? `Note ${r.item.rating.toFixed(1)}` : "Prochainement")}</p>
                  </div>
                </Link>
                {r.date && (
                  <button aria-label={`Ajouter ${r.item.title} à mon calendrier`} onClick={() => downloadIcs(r.item.title, r.date!)} className="shrink-0 rounded-full border border-border p-2.5 hover:bg-muted">
                    <CalendarPlus className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
