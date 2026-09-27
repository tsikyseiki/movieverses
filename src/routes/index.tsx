import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Compass, Heart, Star } from "lucide-react";
import { CATEGORIES, fetchFeatured, fetchRow, shuffle, type Item, type Kind } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { PosterCard, PosterSkeleton } from "@/components/mv/PosterCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MovieVerse — Films, animés manga et animés occidentaux" },
      { name: "description", content: "Explorez les tendances du moment : films, animés japonais et séries animées occidentales, en temps réel." },
      { property: "og:title", content: "MovieVerse — Le catalogue ciné & animé" },
      { property: "og:description", content: "Tendances, nouveautés et fiches détaillées de films et d'animés." },
    ],
  }),
  component: Home,
});

function Hero() {
  const { settings, favorites, isFavorite, toggleFavorite } = useStore();
  const { data } = useQuery({ queryKey: ["featured", settings.lang], queryFn: () => fetchFeatured(settings.lang), staleTime: 15 * 60_000 });
  const [seed, setSeed] = useState(0);
  useEffect(() => setSeed(Math.random() + 1), []); // new rotation on every visit (client only)
  const slides = useMemo(() => {
    if (!data || !seed) return [];
    const favGenres = new Set(favorites.flatMap((f) => f.genreIds ?? []));
    const allowed = data.filter((d) => settings.categories[d.kind]);
    const boosted = allowed.filter((d) => d.genreIds?.some((g) => favGenres.has(g)));
    return shuffle([...shuffle(boosted).slice(0, 2), ...shuffle(allowed)]).filter((v, i, a) => a.findIndex((x) => x.id === v.id && x.kind === v.kind) === i).slice(0, 7);
  }, [data, seed, settings.categories]);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!settings.autoplayHero || slides.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length, settings.autoplayHero, idx]);
  const cur = slides[idx];
  if (!cur) return <div className="h-[82vh] min-h-[560px] animate-pulse bg-muted" />;
  const fav = isFavorite(cur);
  return (
    <section className="relative h-[82vh] min-h-[560px] overflow-hidden">
      {slides.map((s, i) => (
        <div key={`${s.kind}${s.id}`} className={cn("absolute inset-0 transition-opacity duration-1000", i === idx ? "opacity-100" : "opacity-0")}>
          <img src={s.backdrop!} alt="" className={cn("h-full w-full object-cover", i === idx && "animate-kenburns")} />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-scrim via-scrim/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-scrim/40" />
      <div key={idx} className="relative mx-auto flex h-full max-w-[1500px] flex-col justify-end px-4 pb-20 md:px-8">
        <span className="animate-rise inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
          À la une · {CATEGORIES[cur.kind].label}
        </span>
        <h1 className="animate-rise mt-4 max-w-3xl text-4xl font-extrabold leading-[0.95] md:text-7xl" style={{ animationDelay: "80ms" }}>{cur.title}</h1>
        <div className="animate-rise mt-4 flex items-center gap-4 text-sm text-muted-foreground" style={{ animationDelay: "140ms" }}>
          {cur.rating != null && <span className="flex items-center gap-1 font-semibold text-foreground"><Star className="h-4 w-4 fill-gold text-gold" />{cur.rating.toFixed(1)}</span>}
          <span>{cur.date?.slice(0, 4)}</span>
        </div>
        <p className="animate-rise mt-4 line-clamp-3 max-w-xl text-base text-foreground/80" style={{ animationDelay: "200ms" }}>{cur.overview}</p>
        <div className="animate-rise mt-7 flex flex-wrap gap-3" style={{ animationDelay: "260ms" }}>
          <Link to="/titre/$kind/$id" params={{ kind: cur.kind, id: cur.id }} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-[1.03]">
            <Compass className="h-5 w-5" /> Explorer
          </Link>
          <button onClick={() => toggleFavorite(cur)} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-6 py-3 font-semibold backdrop-blur transition hover:bg-background/70">
            <Heart className={cn("h-5 w-5", fav && "fill-primary text-primary")} /> {fav ? "Dans ma liste" : "Ma liste"}
          </button>
        </div>
        <div className="mt-10 flex items-center gap-3">
          <button aria-label="Précédent" onClick={() => setIdx((idx - 1 + slides.length) % slides.length)} className="rounded-full border border-border p-2 hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
          {slides.map((_, i) => (
            <button key={i} aria-label={`Diapo ${i + 1}`} onClick={() => setIdx(i)} className={cn("h-1 rounded-full transition-all", i === idx ? "w-10 bg-primary" : "w-4 bg-foreground/30")} />
          ))}
          <button aria-label="Suivant" onClick={() => setIdx((idx + 1) % slides.length)} className="rounded-full border border-border p-2 hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </section>
  );
}

function Row({ title, items, loading, to }: { title: string; items?: Item[]; loading?: boolean; to?: string }) {
  if (!loading && !items?.length) return null;
  return (
    <section className="mx-auto max-w-[1500px] px-4 py-6 md:px-8">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
        {to && <Link to={to as "/films"} className="group inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">Tout voir <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>}
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {loading && !items
          ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="w-36 shrink-0 md:w-44"><PosterSkeleton /></div>)
          : items!.map((i, n) => <div key={`${i.kind}${i.id}`} className="w-36 shrink-0 snap-start md:w-44"><PosterCard item={i} index={n} /></div>)}
      </div>
    </section>
  );
}

function KindRow({ kind }: { kind: Kind }) {
  const { settings } = useStore();
  const { data, isLoading } = useQuery({ queryKey: ["row", kind, settings.lang], queryFn: () => fetchRow(kind, settings.lang), staleTime: 10 * 60_000, retry: 1 });
  return <Row title={`Tendances · ${CATEGORIES[kind].label}`} items={data} loading={isLoading} to={CATEGORIES[kind].path} />;
}

function Home() {
  const { settings, history, favorites, ready } = useStore();
  return (
    <div className="pb-10">
      <Hero />
      <div className="-mt-10 relative">
        {ready && history.length > 0 && <Row title="Vu récemment" items={history.slice(0, 18)} />}
        {(Object.keys(CATEGORIES) as Kind[]).filter((k) => settings.categories[k]).map((k) => <KindRow key={k} kind={k} />)}
        {ready && favorites.length > 0 && <Row title="Ma liste" items={favorites.slice(0, 18)} to="/ma-liste" />}
      </div>
    </div>
  );
}
