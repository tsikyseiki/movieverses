import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowDown, ArrowRight, CircleHelp, Clapperboard, Eye, Film, MessagesSquare, MonitorPlay, Play, Sparkles, Trophy, Tv } from "lucide-react";
import { fetchFeatured } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchVisits } from "@/lib/community";
import { CommunityFeed } from "@/components/mv/CommunityFeed";
import { LiveNow } from "@/components/mv/LiveNow";

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
            Découvrez films, séries, animés manga et créations occidentales dans un catalogue vivant, enrichi en temps réel.
          </p>
          {/* Trois grands boutons : « Explorer » ouvre directement les catalogues ; Sports et Aide ont chacun leur bouton */}
          <div className="animate-rise mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button asChild size="lg" className="h-12 w-full rounded-full px-7 text-base shadow-lg shadow-primary/30 sm:w-auto">
              <Link to="/films"><Play className="fill-current" /> Explorer les catalogues</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="h-12 w-full rounded-full px-7 text-base sm:w-auto">
              <Link to="/sports"><Trophy /> Sports en direct</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-full border-foreground/30 bg-background/20 px-7 text-base backdrop-blur sm:w-auto">
              <Link to="/aide"><CircleHelp /> Aide</Link>
            </Button>
          </div>
          <span className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" /> Données actualisées en direct
          </span>
        </div>
      </div>
      <a href="#a-propos" aria-label="Découvrir MovieVerse" className="absolute bottom-5 left-1/2 -translate-x-1/2 text-foreground/60 transition hover:text-foreground">
        <ArrowDown className="h-6 w-6 animate-bounce" />
      </a>
    </section>
  );
}

const universes = [
  { kind: "film" as const, title: "Films", copy: "Du grand spectacle aux histoires intimes, explorez le cinéma par genre.", to: "/films" as const, icon: Film },
  { kind: "manga" as const, title: "Animé Manga", copy: "Shonen, seinen, isekai et bien plus, directement depuis le Japon.", to: "/manga" as const, icon: Clapperboard },
  { kind: "occidental" as const, title: "Animé Occidental", copy: "Cartoons, super-héros et séries animées pour tous les univers.", to: "/occidental" as const, icon: Tv },
  { kind: "serie" as const, title: "Séries", copy: "Drames, comédies, thrillers et science-fiction : les séries du moment.", to: "/series" as const, icon: MonitorPlay },
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
            <p className="text-sm font-semibold uppercase text-primary">Quatre univers</p>
            <h2 className="mt-3 text-3xl font-bold md:text-5xl">Choisissez votre catalogue</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">Chaque univers possède ses propres genres, tendances et recommandations.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

function CommunityAndVisits() {
  const qc = useQueryClient();
  const { data: visits } = useQuery({ queryKey: ["visits"], queryFn: fetchVisits, networkMode: "online", refetchInterval: 60_000 });
  useEffect(() => {
    const ch = supabase
      .channel("site-stats")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "site_stats" }, (p) => {
        const v = (p.new as { visits?: number }).visits;
        if (v != null) qc.setQueryData(["visits"], Number(v));
      })
      .subscribe();
    const t = setTimeout(() => qc.invalidateQueries({ queryKey: ["visits"] }), 1500);
    return () => { clearTimeout(t); supabase.removeChannel(ch); };
  }, [qc]);
  return (
    <>
      <LiveNow />
      <section id="avis" className="mx-auto max-w-2xl px-4 pt-16 md:px-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <MessagesSquare className="h-9 w-9 text-primary" />
          <h2 className="text-3xl font-bold">Avis & discussions</h2>
          <p className="max-w-md text-sm text-muted-foreground">Les derniers avis de la communauté, en direct. Pour publier le vôtre, ouvrez la fiche d'un titre.</p>
        </div>
        <CommunityFeed limit={5} />
        <div className="mt-6 text-center">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/communaute">Voir tous les avis <ArrowRight /></Link>
          </Button>
        </div>
      </section>
      <section className="mx-auto max-w-[1500px] px-4 pt-12 md:px-8">
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span className="text-lg font-bold tabular-nums text-foreground">{visits != null ? visits.toLocaleString("fr-FR") : "…"}</span> visites au total
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        </p>
      </section>
    </>
  );
}

function Home() {
  return (
    <div className="pb-10">
      <Hero />
      <About />
      <CommunityAndVisits />
    </div>
  );
}
