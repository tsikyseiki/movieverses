import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CATEGORIES, fetchCatalog, genresFor, MissingKeyError, type Kind } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { PosterCard, PosterSkeleton, gridCols } from "./PosterCard";
import { ErrorNotice } from "./ErrorNotice";
import { cn } from "@/lib/utils";

export function Catalog({ kind, genre }: { kind: Kind; genre: string | null }) {
  const { settings } = useStore();
  const genres = genresFor(kind);
  const valid = genre && genres.some((g) => g.slug === genre) ? genre : null;
  const q = useInfiniteQuery({
    queryKey: ["catalog", kind, valid, settings.lang],
    queryFn: ({ pageParam }) => fetchCatalog(kind, valid, pageParam, settings.lang),
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
      if (e[0].isIntersecting && q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
    }, { rootMargin: "1200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [q.hasNextPage, q.isFetchingNextPage, q.fetchNextPage]);

  const seen = new Set<string>();
  const items = (q.data?.pages.flatMap((p) => p.items) ?? []).filter((i) => !seen.has(i.id) && seen.add(i.id));
  const pill = "shrink-0 rounded-full border px-4 py-1.5 text-sm transition";
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
      {q.error ? (
        <ErrorNotice error={q.error} />
      ) : (
        <div className={cn("mt-8 grid gap-x-4 gap-y-6", gridCols(settings.cardSize))}>
          {items.map((i, n) => <PosterCard key={i.id} item={i} index={n} />)}
          {(q.isLoading || q.isFetchingNextPage) && Array.from({ length: 12 }).map((_, n) => <PosterSkeleton key={`s${n}`} />)}
        </div>
      )}
      <div ref={sentinel} className="h-10" />
      {!q.hasNextPage && items.length > 0 && <p className="text-center text-sm text-muted-foreground">Fin du catalogue</p>}
    </div>
  );
}
