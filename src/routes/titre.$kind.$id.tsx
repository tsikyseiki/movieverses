import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BookOpen, Calendar, Check, Clock, Download, Heart, Play, Scale, Share2, Star } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, fetchConnections, fetchDetail, type Kind } from "@/lib/catalog";
import { useStore, itemKey } from "@/lib/store";
import { PosterCard } from "@/components/mv/PosterCard";
import { ErrorNotice } from "@/components/mv/ErrorNotice";
import { cn } from "@/lib/utils";
import { shareItem } from "@/lib/community";
import { ReviewForm } from "@/components/mv/ReviewForm";
import { SpeakButton } from "@/components/mv/SpeakButton";
import { AssistantChat } from "@/components/mv/AssistantChat";
import { ReviewSummary } from "@/components/mv/ReviewSummary";
import { AddToListMenu } from "@/components/mv/AddToListMenu";
import { FallbackPoster } from "@/components/mv/FallbackPoster";
import { Constellation } from "@/components/mv/Constellation";
import { readableOn, rgbCss, useDominantColor } from "@/lib/color";
import { predictRating } from "@/lib/insights";
import { announceWatching } from "@/lib/presence";

const KINDS: Kind[] = ["film", "manga", "occidental", "serie"];

export const Route = createFileRoute("/titre/$kind/$id")({
  beforeLoad: ({ params }) => {
    if (!KINDS.includes(params.kind as Kind)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [
      { title: `Fiche ${CATEGORIES[params.kind as Kind]?.label ?? ""} — MovieVerse` },
      { name: "description", content: "Synopsis, bande-annonce, casting, disponibilité et titres similaires." },
      { property: "og:title", content: "Fiche détaillée — MovieVerse" },
      { property: "og:description", content: "Synopsis, bande-annonce, casting et recommandations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DetailPage,
  notFoundComponent: () => <div className="p-40 text-center">Titre introuvable</div>,
});

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {Array.from({ length: 10 }).map((_, i) => (
        <button key={i} aria-label={`${i + 1}/10`} onMouseEnter={() => setHover(i + 1)} onClick={() => onChange(i + 1)}>
          <Star className={cn("h-5 w-5 transition", (hover || value) > i ? "fill-primary text-primary" : "text-muted-foreground")} />
        </button>
      ))}
    </div>
  );
}

function DetailPage() {
  const { kind, id } = Route.useParams() as { kind: Kind; id: string };
  const { settings, pushHistory, isFavorite, toggleFavorite, ratings, rate, ratingMeta, markWatched, unmarkWatched, isWatched } = useStore();
  const { data: d, error, isLoading } = useQuery({
    queryKey: ["detail", kind, id, settings.lang],
    queryFn: () => fetchDetail(kind, id, settings.lang),
    staleTime: 30 * 60_000,
  });
  const [playing, setPlaying] = useState(false);
  const [season, setSeason] = useState(() => Math.max(1, Number(new URLSearchParams(window.location.search).get("season")) || 1));
  const [episode, setEpisode] = useState(() => Math.max(1, Number(new URLSearchParams(window.location.search).get("episode")) || 1));
  const [language, setLanguage] = useState(() => new URLSearchParams(window.location.search).get("language") || "fr");
  const [videoSource, setVideoSource] = useState<"primary" | "backup">("primary");
  useEffect(() => {
    setPlaying(false);
    window.scrollTo({ top: 0 });
  }, [id]);
  useEffect(() => {
    if (d) pushHistory({ kind: d.kind, id: d.id, title: d.title, poster: d.poster, backdrop: d.backdrop, rating: d.rating, date: d.date, overview: d.overview.slice(0, 300), genreIds: d.genreIds });
  }, [d?.id]);

  const accent = useDominantColor(d?.poster ?? d?.backdrop ?? null);
  const conns = useQuery({
    queryKey: ["connections", kind, id, settings.lang],
    queryFn: () => fetchConnections(kind, id, settings.lang),
    enabled: !!d,
    staleTime: 60 * 60_000,
    retry: 1,
  });
  useEffect(() => {
    if (!d) return;
    announceWatching({ kind: d.kind, id: d.id, title: d.title, poster: d.poster });
    return () => announceWatching(null);
  }, [d?.id]);

  if (error) return <div className="mx-auto max-w-3xl px-4 pt-32"><ErrorNotice error={error} /></div>;
  if (isLoading || !d) return <div className="h-[70vh] animate-pulse bg-muted" />;

  const fav = isFavorite(d);
  const mine = ratings[itemKey(d)] ?? 0;
  const share = async () => {
    const r = await shareItem({ title: d.title, rating: d.rating, poster: d.poster, url: window.location.href });
    if (r === "copied") toast.success("Lien copié dans le presse-papiers");
  };
  const favItem = { ...d, overview: d.overview.slice(0, 300), genreIds: d.genreIds ?? [] };
  const watched = isWatched(d);
  const toggleWatched = () => {
    if (watched) { unmarkWatched(d); return; }
    markWatched({ kind: d.kind, id: d.id, title: d.title, poster: d.poster, genres: d.genres, runtimeMin: d.runtimeMin });
    toast.success("Ajouté à votre journal de visionnage");
  };
  const prediction = mine ? null : predictRating(d.genres, ratings, ratingMeta, d.rating);
  const tmdbId = d?.id;
  const validTmdbId = tmdbId != null && String(tmdbId).trim() !== "";
  const playbackUrl = validTmdbId
    ? (kind === "film"
      ? `https://vidsrc.to/embed/movie/${encodeURIComponent(String(tmdbId))}`
      : `https://vidsrc.to/embed/tv/${encodeURIComponent(String(tmdbId))}/${season}/${episode}`)
    : "";
  const selectedPlaybackUrl = videoSource === "backup" && validTmdbId
    ? (kind === "film"
      ? `https://vidsrc.to/embed/movie/${encodeURIComponent(String(tmdbId))}`
      : `https://vidsrc.to/embed/tv/${encodeURIComponent(String(tmdbId))}/${season}/${episode}`)
    : playbackUrl;
  const openPlaybackSource = () => window.open(selectedPlaybackUrl, "_blank", "noopener,noreferrer");

  return (
    <div className="pb-16">
      <section className="relative min-h-[80vh] overflow-hidden">
        {d.backdrop && <img src={d.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover animate-kenburns" />}
        <div className="absolute inset-0 bg-gradient-to-r from-scrim via-scrim/85 to-scrim/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        {accent && <div className="absolute inset-0 transition-opacity duration-700" style={{ background: `linear-gradient(120deg, ${rgbCss(accent, 0.4)}, transparent 60%)` }} />}
        <div className="relative mx-auto grid max-w-[1500px] gap-10 px-4 pb-12 pt-40 md:grid-cols-[280px_1fr] md:px-8 lg:pt-32">
          <div className="animate-rise mx-auto w-52 md:w-full">
            {!d.poster && <div className="aspect-[2/3] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border"><FallbackPoster title={d.title} year={d.date?.slice(0, 4)} /></div>}
            {d.poster && <img src={d.poster.replace("w342", "w500")} alt={d.title} className="w-full rounded-2xl shadow-2xl ring-1 ring-border" style={accent ? { boxShadow: `0 30px 80px -20px ${rgbCss(accent, 0.75)}`, borderColor: rgbCss(accent) } : undefined} />}
          </div>
          <div className="animate-rise" style={{ animationDelay: "100ms" }}>
            <Link to={CATEGORIES[kind].path as "/films"} className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{CATEGORIES[kind].label}</Link>
            <h1 className="mt-3 text-4xl font-extrabold leading-none md:text-6xl">{d.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {d.rating != null && <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-1.5 text-xl font-extrabold text-scrim shadow-lg"><Star className="h-6 w-6 fill-current" />{d.rating.toFixed(1)}<span className="text-sm font-semibold">/10</span></span>}
              {d.date && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(d.date).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}</span>}
              {d.runtime && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{d.runtime}</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {d.genres.map((g) => <span key={g} className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs backdrop-blur" style={accent ? { borderColor: rgbCss(accent, 0.8) } : undefined}>{g}</span>)}
            </div>
            <p className="mt-6 max-w-3xl leading-relaxed text-foreground/85">{d.overview || "Synopsis non disponible."}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {d.trailer && (
                <button onClick={() => { setPlaying(true); document.getElementById("trailer")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-[1.03]" style={accent ? { backgroundColor: rgbCss(accent), color: readableOn(accent) } : undefined}>
                  <Play className="h-5 w-5 fill-current" /> Bande-annonce
                </button>
              )}
              {kind === "manga" && (
                <Link to="/scan/$id" params={{ id: d.id }} search={{ t: d.altTitles.slice(0, 4).join("|") }} className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-semibold text-background transition hover:scale-[1.03]">
                  <BookOpen className="h-5 w-5" /> Lire le scan
                </Link>
              )}
              <button onClick={() => toggleFavorite(favItem)} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-5 py-3 font-semibold backdrop-blur hover:bg-background/70">
                <Heart className={cn("h-5 w-5", fav && "fill-primary text-primary")} /> {fav ? "Dans ma liste" : "Ma liste"}
              </button>
              <button onClick={share} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-5 py-3 font-semibold backdrop-blur hover:bg-background/70">
                <Share2 className="h-5 w-5" /> Partager
              </button>
              <button onClick={toggleWatched} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-5 py-3 font-semibold backdrop-blur hover:bg-background/70">
                <Check className={cn("h-5 w-5", watched && "text-primary")} /> {watched ? "Vu" : "Marquer comme vu"}
              </button>
              <SpeakButton text={d.overview} />
              <AddToListMenu item={{ kind: d.kind, id: d.id, title: d.title, poster: d.poster ?? null }} />
              <Link to="/comparer" search={{ a: `${d.kind}:${d.id}`, b: undefined }} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-5 py-3 font-semibold backdrop-blur hover:bg-background/70">
                <Scale className="h-5 w-5" /> Comparer
              </Link>
            </div>
            <div className="mt-8 grid max-w-3xl gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ma note {mine ? `· ${mine}/10` : ""}</p>
                <Stars value={mine} onChange={(v) => rate(d, v, d.genres, d.title)} />
                {prediction && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Note prédite pour vous : <span className="text-base font-bold text-foreground">{prediction.value.toFixed(1)}/10</span> (d'après {prediction.basedOn} de vos notes)
                  </p>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Disponibilité</p>
                {d.availability.length ? (
                  <div className="flex flex-wrap gap-2">
                    {d.availability.slice(0, 8).map((a) => (
                      <a key={a.name} href={a.url} target="_blank" rel="noreferrer" title={a.name} className="flex items-center gap-2 rounded-lg bg-background/50 px-2 py-1 text-xs backdrop-blur hover:bg-background/80">
                        {a.logo && <img src={a.logo} alt="" className="h-6 w-6 rounded" />}{a.name}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{d.status === "RELEASING" || d.status === "Returning Series" ? "En cours de diffusion" : "Aucune plateforme référencée"}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] space-y-14 px-4 md:px-8">
        {kind !== "manga" && (
          <section id="lecteur-video" className="space-y-4">
            <h2 className="text-2xl font-bold">Lecteur vidéo</h2>
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
              <div className="min-w-44 flex-1">
                <label htmlFor="mv-language" className="mb-2 block text-sm font-medium">Langue</label>
                <select id="mv-language" value={language} onChange={(e) => {
                  const next = e.target.value;
                  setLanguage(next);
                  const params = new URLSearchParams(window.location.search);
                  params.set("language", next);
                  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
                }} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option value="fr">VF — Français</option>
                  <option value="vostfr">VOSTFR — Audio original, sous-titres français</option>
                  <option value="en">VO — Anglais</option>
                  <option value="original">VO — Langue originale</option>
                </select>
              </div>
              {kind !== "film" && (
                <>
                  <div>
                    <label htmlFor="mv-season" className="mb-2 block text-sm font-medium">Saison</label>
                    <select id="mv-season" value={season} onChange={(e) => {
                      const next = Number(e.target.value); setSeason(next);
                      const params = new URLSearchParams(window.location.search); params.set("season", String(next)); params.set("episode", String(episode));
                      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
                    }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      {Array.from({ length: 20 }, (_, i) => <option key={i + 1} value={i + 1}>Saison {i + 1}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="mv-episode" className="mb-2 block text-sm font-medium">Épisode</label>
                    <select id="mv-episode" value={episode} onChange={(e) => {
                      const next = Number(e.target.value); setEpisode(next);
                      const params = new URLSearchParams(window.location.search); params.set("season", String(season)); params.set("episode", String(next));
                      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
                    }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      {Array.from({ length: 100 }, (_, i) => <option key={i + 1} value={i + 1}>Épisode {i + 1}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">Source vidéo :</span>
              <button type="button" onClick={() => setVideoSource("primary")} aria-pressed={videoSource === "primary"} className={`rounded-lg border px-3 py-2 text-sm ${videoSource === "primary" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>Source principale</button>
              <button type="button" onClick={() => setVideoSource("backup")} aria-pressed={videoSource === "backup"} className={`rounded-lg border px-3 py-2 text-sm ${videoSource === "backup" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>Source de secours</button>
            </div>
            <p className="text-sm text-muted-foreground">Si la source principale ne fonctionne pas, essaie la source de secours. La disponibilité des langues dépend du lecteur choisi.</p>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
              <button type="button" onClick={openPlaybackSource} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:opacity-90">
                <Download className="h-4 w-4" /> Ouvrir la source / téléchargement
              </button>
              <p className="max-w-2xl text-xs text-muted-foreground">Ouvre la source sélectionnée dans un nouvel onglet. Si le fournisseur autorise le téléchargement, utilise les commandes du navigateur ou du lecteur. MovieVerse ne peut pas afficher la progression d’un téléchargement géré par un site externe.</p>
            </div>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
              <iframe
                key={`${kind}-${d.id}-${season}-${episode}-${language}-${videoSource}`}
                className="absolute inset-0 h-full w-full border-0"
                src={selectedPlaybackUrl}
                title={`Lecteur vidéo — ${d.title}`}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          </section>
        )}
        {d.trailer && (
          <section id="trailer">
            <h2 className="mb-4 text-2xl font-bold">Bande-annonce</h2>
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
              {playing ? (
                <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${d.trailer}?autoplay=1&rel=0${settings.subtitles ? "&cc_load_policy=1&cc_lang_pref=fr&hl=fr" : ""}`} title="Bande-annonce" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
              ) : (
                <button onClick={() => setPlaying(true)} className="group absolute inset-0">
                  <img src={`https://i.ytimg.com/vi/${d.trailer}/hqdefault.jpg`} alt="" className="h-full w-full object-cover opacity-70 transition group-hover:opacity-90" />
                  <span className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition group-hover:scale-110"><Play className="h-8 w-8 fill-current" /></span>
                </button>
              )}
            </div>
          </section>
        )}
        <ReviewForm item={{ kind, item_id: d.id, title: d.title, poster: d.poster ?? null, rating: d.rating ?? null }} myRating={mine} />
        {d.cast.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-bold">{kind === "manga" ? "Personnages" : "Casting principal"}</h2>
            <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4">
              {d.cast.map((c) => (
                <div key={c.name + c.role} className="w-28 shrink-0 text-center">
                  <div className="mx-auto h-28 w-28 overflow-hidden rounded-full bg-muted ring-1 ring-border">{c.photo && <img src={c.photo} alt={c.name} loading="lazy" className="h-full w-full object-cover" />}</div>
                  <p className="mt-2 line-clamp-1 text-sm font-semibold">{c.name}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{c.role}</p>
                </div>
              ))}
            </div>
          </section>
        )}
        <AssistantChat key={`${d.kind}:${d.id}`} title={d.title} kind={d.kind} year={d.date?.slice(0, 4)} overview={d.overview} genres={d.genres} />
        <ReviewSummary title={d.title} kind={d.kind} year={d.date?.slice(0, 4)} />
        {(conns.data?.length ?? 0) > 1 && (
          <section>
            <h2 className="text-2xl font-bold">Constellation</h2>
            <p className="mb-4 text-sm text-muted-foreground">Les titres liés : même réalisateur, même studio, même saga ou univers partagé.</p>
            <Constellation center={{ kind: d.kind, id: d.id, title: d.title, poster: d.poster }} connections={conns.data ?? []} />
          </section>
        )}
        {d.similar.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-bold">Titres similaires</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {d.similar.map((s, i) => <PosterCard key={s.id} item={s} index={i} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
