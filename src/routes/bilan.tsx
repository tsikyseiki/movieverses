import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { CATEGORIES } from "@/lib/catalog";
import { formatDuration } from "@/lib/insights";

export const Route = createFileRoute("/bilan")({
  head: () => ({ meta: [{ title: "Mon bilan de l'année — MovieVerse" }, { name: "description", content: "Votre année de films et d'animés en chiffres." }] }),
  component: Wrapped,
});

const MONTHS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];

function Wrapped() {
  const { watched, ratings } = useStore();
  const years = [...new Set([new Date().getFullYear(), ...watched.map((w) => new Date(w.at).getFullYear())])].sort((a, b) => b - a);
  const [year, setYear] = useState(years[0]!);
  const list = watched.filter((w) => new Date(w.at).getFullYear() === year);
  const minutes = list.reduce((s, w) => s + (w.runtimeMin ?? 0), 0);
  const genres = new Map<string, number>();
  list.forEach((w) => w.genres.forEach((g) => genres.set(g, (genres.get(g) ?? 0) + 1)));
  const top = [...genres.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const perMonth = Array.from({ length: 12 }, (_, m) => list.filter((w) => new Date(w.at).getMonth() === m).length);
  const busiest = perMonth.indexOf(Math.max(...perMonth));
  const kinds = (["film", "manga", "occidental", "serie"] as const).map((k) => [k, list.filter((w) => w.kind === k).length] as const).sort((a, b) => b[1] - a[1]);
  const best = [...list].filter((w) => ratings[`${w.kind}:${w.id}`] != null).sort((a, b) => ratings[`${b.kind}:${b.id}`]! - ratings[`${a.kind}:${a.id}`]!)[0];
  const max = Math.max(1, ...perMonth);

  const share = async () => {
    const text = `Mon bilan MovieVerse ${year} : ${list.length} titres vus, ${formatDuration(minutes)} de visionnage${top[0] ? `, genre préféré : ${top[0][0]}` : ""}`;
    if (navigator.share) await navigator.share({ title: `Bilan MovieVerse ${year}`, text, url: window.location.origin }).catch(() => undefined);
    else { await navigator.clipboard?.writeText(text); toast.success("Texte copié"); }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-36 lg:pt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Wrapped</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Mon bilan {year}</h1>
      <div className="mt-4 flex gap-2">{years.map((y) => <button key={y} onClick={() => setYear(y)} className={`rounded-full border px-4 py-1.5 text-sm ${y === year ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{y}</button>)}</div>
      {list.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-border p-8 text-center text-muted-foreground">Rien à afficher pour {year}. Marquez des titres comme « vus » sur leur fiche pour construire votre bilan.</p>
      ) : (
        <>
          <div className="mt-8 rounded-3xl bg-gradient-to-br from-primary/80 to-primary/20 p-6">
            <p className="text-sm uppercase tracking-widest text-white/80">Cette année, vous avez vu</p>
            <p className="mt-1 text-6xl font-extrabold text-white">{list.length}</p>
            <p className="text-lg font-semibold text-white">titre{list.length > 1 ? "s" : ""} · {formatDuration(minutes)}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Mois le plus actif</p><p className="mt-1 text-xl font-extrabold">{MONTHS[busiest]} · {perMonth[busiest]}</p></div>
            <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Univers préféré</p><p className="mt-1 text-xl font-extrabold">{CATEGORIES[kinds[0]![0]].label}</p></div>
          </div>
          {top.length > 0 && <div className="mt-4 rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Vos 3 genres</p><div className="mt-2 flex flex-wrap gap-2">{top.map(([g, n], i) => <span key={g} className="rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">#{i + 1} {g} · {n}</span>)}</div></div>}
          {best && <div className="mt-4 rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Votre coup de cœur</p><p className="mt-1 text-xl font-extrabold">{best.title} <span className="text-primary">{ratings[`${best.kind}:${best.id}`]}/10</span></p></div>}
          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Mois par mois</p>
            <div className="mt-3 flex h-28 items-end gap-1.5">{perMonth.map((n, m) => <div key={m} className="flex flex-1 flex-col items-center justify-end gap-1"><div className="w-full rounded-t bg-primary" style={{ height: `${(n / max) * 100}%`, minHeight: n ? 4 : 0 }} /><span className="text-[9px] text-muted-foreground">{MONTHS[m]!.slice(0, 1)}</span></div>)}</div>
          </div>
          <button onClick={share} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"><Share2 className="h-5 w-5" /> Partager mon bilan</button>
        </>
      )}
    </div>
  );
}
