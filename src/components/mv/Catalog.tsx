import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { CATEGORIES, fetchCatalog, genresFor, MissingKeyError, type Kind } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { PosterCard, PosterSkeleton, gridCols } from "./PosterCard";
import { ErrorNotice } from "./ErrorNotice";
import { SurpriseReveal } from "./SurpriseReveal";
import { cn } from "@/lib/utils";

const SELECT = "h-9 rounded-full border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1979 }, (_, i) => String(THIS_YEAR - i));
const RATINGS = [0, 5, 6, 7, 8];

export function Catalog({ kind, genre }: { kind: Kind; genre: string | null }) {
  const { settings } = useStore();
  const genres = genresFor(kind);
  const valid = genre && genres.some((g) => g.slug === genre) ? genre : null;
  const [year, setYear] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const filters = { year: year || undefined, minRating: minRating || undefined, family: settings.family || undefined };
  const q = useInfiniteQuery({
    queryKey: ["catalog", kind, valid, settings.lang, year, minRating, !!settings.family],
    queryFn: ({ pageParam }) => fetchCatalog(kind, valid, pageParam, settings.lang, filters),
    initialPageParam: 1,
    getNextPageParam: (p) => p.next,
    staleTime: 10 * 60_000,
    retry: (n, e) => !(e instanceof MissingKeyError) && n < 2,
  });
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0]?.isIntersecting && q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
    }, { rootMargin: "1200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [q.hasNextPage, q.isFetchingNextPage, q.fetchNextPage]);

  const seen = new Set<string>();
  const items = (q.data?.pages.flatMap((p) => p.items) ?? []).filter((i) => !seen.has(i.id) && seen.add(i.id));
  const pill = "shrink-0 rounded-full border px-4 py-1.5 text-sm transition";
  const filtered = !!year || minRating > 0;
  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-20 pt-36 md:px-8 lg:pt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{CATEGORIES[kind].tagline}</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-6xl">{CATEGORIES[kind].label}</h1>
      <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2">
        <Link to={CATEGORIES[kind].path as "/films"} search={{ genre: undefined }} className={cn(pill, !valid ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground/40")}>
          Tout
        </Link>
        {genres.map((g) => (
          <Link key={g.slug} to={CATEGORIES[kind].path as "/films"} search={{ genre: g.slug }} className={cn(pill, valid === g.slug ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground/40")}>
            {g.label}
          </Link>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select aria-label="Année" className={SELECT} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">Toutes les années</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select aria-label="Note minimum" className={SELECT} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
          {RATINGS.map((r) => <option key={r} value={r}>{r ? `Note ${r}+ / 10` : "Toutes les notes"}</option>)}
        </select>
        {filtered && (
          <button onClick={() => { setYear(""); setMinRating(0); }} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-4 w-4" /> Réinitialiser
          </button>
        )}
        <button
          onClick={() => setSurpriseOpen(true)}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110"
        >
          <Shuffle className="h-4 w-4" /> Surprends-moi
        </button>
      </div>
      <SurpriseReveal
        kind={kind}
        genre={valid}
        lang={settings.lang}
        filters={filters}
        open={surpriseOpen}
        onClose={() => setSurpriseOpen(false)}
      />
      {q.error ? (
        <ErrorNotice error={q.error} />
      ) : (
        <div className={cn("mt-8 grid gap-x-4 gap-y-6", gridCols(settings.cardSize))}>
          {items.map((i, n) => <PosterCard key={i.id} item={i} index={n} />)}
          {(q.isLoading || q.isFetchingNextPage) && Array.from({ length: 12 }).map((_, n) => <PosterSkeleton key={`s${n}`} />)}
        </div>
      )}
      {!q.isLoading && !q.error && items.length === 0 && <p className="mt-16 text-center text-muted-foreground">Aucun résultat avec ces filtres.</p>}
      <div ref={sentinel} className="h-10" />
      {!q.hasNextPage && items.length > 0 && <p className="text-center text-sm text-muted-foreground">Fin du catalogue</p>}
    </div>
  );
}
