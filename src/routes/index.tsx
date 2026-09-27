import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, Clapperboard, Film, Play, Sparkles, Tv } from "lucide-react";
import { fetchFeatured, fetchRow, type Item, type Kind } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { PosterCard, PosterSkeleton } from "@/components/mv/PosterCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MovieVerse — Films, animés manga et animés occidentaux" },
      { name: "description", content: "Explorez les tendances du moment : films, animés japonais et séries animées occidentales, en temps réel." },
      { property: "og:title", content: "MovieVerse — Le catalogue ciné & animé" },
      { property: "og:description", content: "Tendances, nouveautés et fiches détaillées de films et d'animés." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Hero() {
  const { settings } = useStore();
  const { data } = useQuery({ queryKey: ["featured", settings.lang], queryFn: () => fetchFeatured(settings.lang), staleTime: 15 * 60_000 });
  const featured = data?.find((item) => item.backdrop);
  return (
    <section className="relative flex h-[86vh] min-h-[620px] items-end overflow-hidden">
      {featured?.backdrop ? (
        <img src={featured.backdrop} alt="" className="absolute inset-0 h-full w-full animate-kenburns object-cover" />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-scrim via-scrim/75 to-scrim/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-scrim/50" />
      <div className="relative mx-auto w-full max-w-[1500px] px-4 pb-16 md:px-8 md:pb-20">
        <div className="max-w-4xl">
          <span className="animate-rise inline-flex items-center gap-2 text-sm font-semibold uppercase text-primary">
            <Sparkles className="h-4 w-4" /> Votre univers cinéma & animation
          </span>
          <h1 className="animate-rise mt-5 text-5xl font-extrabold leading-none sm:text-7xl lg:text-8xl">
            Movie<span className="text-primary">Verse</span>
          </h1>
          <p className="animate-rise mt-6 max-w-2xl text-lg leading-relaxed text-foreground/80 md:text-xl">
            Découvrez films, animés manga et créations occidentales dans un catalogue vivant, enrichi en temps réel.
          </p>
          <div className="animate-rise mt-8 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="h-12 rounded-full px-7 text-base shadow-lg shadow-primary/30">
              <a href="#catalogues"><Play className="fill-current" /> Explorer les catalogues</a>
            </Button>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" /> Données actualisées en direct
            </span>
          </div>
        </div>
      </div>
      <a href="#a-propos" aria-label="Découvrir MovieVerse" className="absolute bottom-5 left-1/2 -translate-x-1/2 text-foreground/60 transition hover:text-foreground">
        <ArrowDown className="h-6 w-6 animate-bounce" />
      </a>
    </section>
  );
}

function Row({ title, items, loading, to }: { title: string; items?: Item[] | undefined; loading?: boolean; to?: string }) {
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

const universes = [
  { kind: "film" as const, title: "Films", copy: "Du grand spectacle aux histoires intimes, explorez le cinéma par genre.", to: "/films" as const, icon: Film },
  { kind: "manga" as const, title: "Animé Manga", copy: "Shonen, seinen, isekai et bien plus, directement depuis le Japon.", to: "/manga" as const, icon: Clapperboard },
  { kind: "occidental" as const, title: "Animé Occidental", copy: "Cartoons, super-héros et séries animées pour tous les univers.", to: "/occidental" as const, icon: Tv },
];

function About() {
  return (
    <>
      <section id="a-propos" className="border-b border-border">
        <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-20 md:grid-cols-[0.8fr_1.2fr] md:px-8 md:py-28">
          <p className="text-sm font-semibold uppercase text-primary">À propos de MovieVerse</p>
          <div>
            <h2 className="max-w-4xl text-3xl font-bold leading-tight md:text-5xl">Une seule destination pour trouver votre prochaine histoire.</h2>
            <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
              MovieVerse rassemble les tendances, nouveautés, bandes-annonces, distributions et recommandations. Parcourez librement, gardez vos coups de cœur et reprenez vos découvertes quand vous le souhaitez.
            </p>
          </div>
        </div>
      </section>
      <section id="catalogues" className="mx-auto max-w-[1500px] px-4 py-20 md:px-8 md:py-28">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Trois univers</p>
            <h2 className="mt-3 text-3xl font-bold md:text-5xl">Choisissez votre catalogue</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">Chaque univers possède ses propres genres, tendances et recommandations.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {universes.map(({ title, copy, to, icon: Icon }) => (
            <Link key={to} to={to} className="group relative min-h-72 overflow-hidden rounded-lg border border-border bg-card p-7 transition duration-500 hover:-translate-y-1 hover:border-primary/60">
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-primary/15 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
              <div className="relative flex h-full flex-col">
                <Icon className="h-9 w-9 text-primary" />
                <div className="mt-auto">
                  <h3 className="text-2xl font-bold">{title}</h3>
                  <p className="mt-3 leading-6 text-muted-foreground">{copy}</p>
                  <span className="mt-6 inline-flex items-center gap-2 font-semibold text-primary">Entrer <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function Home() {
  const { settings } = useStore();
  return (
    <div className="pb-10">
      <Hero />
      <About />
      <div className="border-t border-border pt-10">
        {(Object.keys(CATEGORIES) as Kind[]).filter((k) => settings.categories[k]).map((k) => <KindRow key={k} kind={k} />)}
      </div>
    </div>
  );
}
