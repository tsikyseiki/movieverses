import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { findMangaChapters, getChapterPages } from "@/lib/mangadex.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scan/$id")({
  validateSearch: z.object({ t: z.string().default(""), c: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Lecture du scan — MovieVerse" },
      { name: "description", content: "Lisez les chapitres disponibles du manga via MangaDex." },
      { property: "og:title", content: "Lecture du scan — MovieVerse" },
      { property: "og:description", content: "Chapitres du manga disponibles en lecture." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPage,
});

const HD_KEY = "mv-scan-hd";

/** Une page : réserve sa place (pour que le chargement différé fonctionne), essaie le serveur MangaDex puis le serveur de secours. */
function PageImg({ n, urls }: { n: number; urls: string[] }) {
  const [k, setK] = useState(0);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const src = urls[k];
  return (
    <div className={cn("relative mx-auto w-full max-w-3xl overflow-hidden bg-muted", state !== "ok" && "min-h-[70vh]")}>
      {state === "loading" && (
        <div className="absolute inset-0 grid place-items-center text-center text-xs text-muted-foreground">
          <div><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Page {n}</div>
        </div>
      )}
      {state === "error" ? (
        <div className="absolute inset-0 grid place-items-center p-4 text-center">
          <div>
            <p className="text-sm font-semibold">Page {n} indisponible</p>
            <button
              onClick={() => { setK(0); setAttempt((a) => a + 1); setState("loading"); }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm transition hover:bg-accent"
            ><RefreshCw className="h-4 w-4" /> Réessayer</button>
          </div>
        </div>
      ) : src ? (
        <img
          key={`${k}-${attempt}`}
          src={src}
          alt={`Page ${n}`}
          referrerPolicy="no-referrer"
          decoding="async"
          loading={n <= 3 ? "eager" : "lazy"}
          onLoad={() => setState("ok")}
          onError={() => { if (k + 1 < urls.length) setK(k + 1); else setState("error"); }}
          className={cn("mx-auto block w-full", state !== "ok" && "opacity-0")}
        />
      ) : null}
    </div>
  );
}

function ScanPage() {
  const { id } = Route.useParams();
  const { t, c } = Route.useSearch();
  const navigate = Route.useNavigate();
  const find = useServerFn(findMangaChapters);
  const pagesFn = useServerFn(getChapterPages);
  const titles = t.split("|").filter(Boolean);
  const [hd, setHd] = useState(false);
  useEffect(() => { try { setHd(localStorage.getItem(HD_KEY) === "1"); } catch { /* ignoré */ } }, []);
  const quality = hd ? "data" : "saver";

  const list = useQuery({
    queryKey: ["md", id],
    queryFn: () => find({ data: { titles: titles.length ? titles : ["unknown"] } }),
    staleTime: 3600_000,
  });
  // Les adresses d'images ne sont valables que ~15 min : on les redemande au bout de 4 min
  const pages = useQuery({
    queryKey: ["mdp", c, quality],
    queryFn: () => pagesFn({ data: { id: c!, quality } }),
    enabled: !!c,
    staleTime: 4 * 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const chapters = list.data?.chapters ?? [];
  const idx = chapters.findIndex((x) => x.id === c);
  const go = (cid?: string) => {
    navigate({ search: (p) => ({ ...p, c: cid }) });
    window.scrollTo({ top: 0 });
  };
  const toggleHd = () => { const v = !hd; setHd(v); try { localStorage.setItem(HD_KEY, v ? "1" : "0"); } catch { /* ignoré */ } };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-36 lg:pt-28">
      <Link to="/titre/$kind/$id" params={{ kind: "manga", id }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour à la fiche</Link>
      <h1 className="mt-3 text-3xl font-extrabold md:text-5xl">{list.data?.mangaTitle || titles[0] || "Scan"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Chapitres disponibles en français et en anglais via MangaDex</p>

      {list.isLoading && <p className="mt-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Recherche des chapitres…</p>}
      {list.error && <p className="mt-10 text-destructive">Impossible de contacter MangaDex.</p>}
      {list.data && chapters.length === 0 && <p className="mt-10 rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">Aucun chapitre lisible trouvé pour ce titre (certains mangas sont protégés par leur éditeur).</p>}

      {!c && chapters.length > 0 && (
        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          {chapters.map((ch) => (
            <button key={ch.id} onClick={() => go(ch.id)} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition hover:border-primary">
              <span className="min-w-0">
                <span className="font-semibold">Chapitre {ch.chapter ?? "—"}</span>
                {ch.title && <span className="block truncate text-xs text-muted-foreground">{ch.title}</span>}
              </span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">{ch.lang}</span>
            </button>
          ))}
        </div>
      )}

      {c && (
        <div className="mt-6">
          <ChapterNav chapters={chapters} idx={idx} go={go} />
          <div className="mt-3 flex items-center justify-end">
            <button onClick={toggleHd} className="rounded-full border border-border px-3 py-1.5 text-xs transition hover:bg-accent" aria-pressed={hd}>
              Qualité : {hd ? "HD (plus lourd)" : "économique"} · changer
            </button>
          </div>
          {pages.isLoading && <p className="py-20 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></p>}
          {pages.error && (
            <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">Impossible de récupérer les pages de ce chapitre.</p>
              <button onClick={() => void pages.refetch()} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm transition hover:bg-accent"><RefreshCw className="h-4 w-4" /> Réessayer</button>
            </div>
          )}
          {pages.data && pages.data.pages.length === 0 && <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Ce chapitre ne contient aucune page lisible.</p>}
          <div className="mt-4 space-y-1">
            {pages.data?.pages.map((p, i) => (
              <PageImg key={`${c}-${quality}-${i}`} n={i + 1} urls={[p, `/api/public/manga-page?c=${c}&i=${i}&q=${quality}`]} />
            ))}
          </div>
          <div className="mt-6"><ChapterNav chapters={chapters} idx={idx} go={go} /></div>
        </div>
      )}
    </div>
  );
}

function ChapterNav({ chapters, idx, go }: { chapters: { id: string; chapter: string | null }[]; idx: number; go: (id?: string) => void }) {
  const b = "inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm transition hover:bg-accent disabled:opacity-40";
  return (
    <div className="flex items-center justify-between gap-2">
      <button className={b} disabled={idx <= 0} onClick={() => go(chapters[idx - 1]?.id)}><ChevronLeft className="h-4 w-4" /> Précédent</button>
      <button className={cn(b)} onClick={() => go(undefined)}>Chapitre {chapters[idx]?.chapter ?? ""} · Liste</button>
      <button className={b} disabled={idx < 0 || idx >= chapters.length - 1} onClick={() => go(chapters[idx + 1]?.id)}>Suivant <ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}
