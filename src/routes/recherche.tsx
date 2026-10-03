import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bookmark, X } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, fetchCatalog, genresFor, type Kind } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { PosterCard, PosterSkeleton, gridCols } from "@/components/mv/PosterCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/recherche")({
  head: () => ({
    meta: [
      { title: "Recherche avancée — MovieVerse" },
      { name: "description", content: "Filtrez les films et animés par genre, année, note et tri, et enregistrez vos recherches." },
      { property: "og:title", content: "Recherche avancée — MovieVerse" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AdvancedSearch,
});

type F = { kind: Kind; genre: string; year: string; min: number; sort: "popularity" | "rating" | "recent" };
type Saved = { id: string; name: string; f: F };
const DEFAULT: F = { kind: "film", genre: "", year: "", min: 0, sort: "popularity" };
const KEY = "mv:saved-searches";
const SELECT = "h-10 rounded-full border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const YEARS = Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => String(new Date().getFullYear() - i));
const readSaved = (): Saved[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };

function AdvancedSearch() {
  const { settings } = useStore();
  const [f, setF] = useState<F>(DEFAULT);
  const [saved, setSaved] = useState<Saved[]>([]);
  useEffect(() => setSaved(readSaved()), []);
  const persist = (next: Saved[]) => { setSaved(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* stockage indisponible */ } };
  const genres = genresFor(f.kind);

  const q = useInfiniteQuery({
    queryKey: ["adv-search", f, settings.lang, !!settings.family],
    queryFn: ({ pageParam }) => fetchCatalog(f.kind, f.genre || null, pageParam, settings.lang, { year: f.year || undefined, minRating: f.min || undefined, sort: f.sort, family: settings.family || undefined }),
    initialPageParam: 1,
    getNextPageParam: (p) => p.next,
    staleTime: 10 * 60_000,
  });
  const seen = new Set<string>();
  const items = (q.data?.pages.flatMap((p) => p.items) ?? []).filter((i) => !seen.has(i.id) && seen.add(i.id));

  const save = () => {
    const name = window.prompt("Nom de cette recherche ?", `${CATEGORIES[f.kind].label}${f.genre ? " · " + (genres.find((g) => g.slug === f.genre)?.label ?? "") : ""}${f.year ? " · " + f.year : ""}`);
    if (!name?.trim()) return;
    persist([{ id: crypto.randomUUID(), name: name.trim().slice(0, 40), f }, ...saved].slice(0, 12));
    toast.success("Recherche enregistrée");
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-36 md:px-8 lg:pt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Outil pro</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Recherche avancée</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {(Object.keys(CATEGORIES) as Kind[]).map((k) => (
          <button key={k} onClick={() => setF({ ...f, kind: k, genre: "" })} className={cn("rounded-full border px-4 py-2 text-sm font-medium", f.kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{CATEGORIES[k].label}</button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select aria-label="Genre" className={SELECT} value={f.genre} onChange={(e) => setF({ ...f, genre: e.target.value })}>
          <option value="">Tous les genres</option>
          {genres.map((g) => <option key={g.slug} value={g.slug}>{g.label}</option>)}
        </select>
        <select aria-label="Année" className={SELECT} value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })}>
          <option value="">Toutes les années</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select aria-label="Note minimum" className={SELECT} value={f.min} onChange={(e) => setF({ ...f, min: Number(e.target.value) })}>
          {[0, 5, 6, 7, 8, 9].map((r) => <option key={r} value={r}>{r ? `Note ${r}+ / 10` : "Toutes les notes"}</option>)}
        </select>
        <select aria-label="Trier par" className={SELECT} value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value as F["sort"] })}>
          <option value="popularity">Tri : popularité</option>
          <option value="rating">Tri : mieux notés</option>
          <option value="recent">Tri : plus récents</option>
        </select>
        <button onClick={save} className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted"><Bookmark className="h-4 w-4" /> Enregistrer</button>
        <button onClick={() => setF(DEFAULT)} className="h-10 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground">Réinitialiser</button>
      </div>

      {saved.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
          {saved.map((s) => (
            <span key={s.id} className="inline-flex shrink-0 items-center rounded-full border border-border text-sm">
              <button onClick={() => setF(s.f)} className="rounded-l-full px-3 py-1.5 hover:bg-muted">{s.name}</button>
              <button aria-label={`Supprimer ${s.name}`} onClick={() => persist(saved.filter((x) => x.id !== s.id))} className="rounded-r-full px-2 py-1.5 text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
      )}

      <div className={cn("mt-8 grid gap-x-4 gap-y-6", gridCols(settings.cardSize))}>
        {items.map((i, n) => <PosterCard key={i.id} item={i} index={n} />)}
        {(q.isLoading || q.isFetchingNextPage) && Array.from({ length: 12 }).map((_, n) => <PosterSkeleton key={`s${n}`} />)}
      </div>
      {!q.isLoading && items.length === 0 && <p className="mt-16 text-center text-muted-foreground">Aucun résultat avec ces critères.</p>}
      {q.hasNextPage && (
        <div className="mt-10 text-center">
          <button onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage} className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60">Voir plus de résultats</button>
        </div>
      )}
    </div>
  );
}
