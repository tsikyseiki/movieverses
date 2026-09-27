import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const { id } = Route.useParams();
  const { t, c } = Route.useSearch();
  const navigate = Route.useNavigate();
  const find = useServerFn(findMangaChapters);
  const pagesFn = useServerFn(getChapterPages);
  const titles = t.split("|").filter(Boolean);
  const list = useQuery({
    queryKey: ["md", id],
    queryFn: () => find({ data: { titles: titles.length ? titles : ["unknown"] } }),
    staleTime: 3600_000,
  });
  const pages = useQuery({ queryKey: ["mdp", c], queryFn: () => pagesFn({ data: { id: c! } }), enabled: !!c, staleTime: 10 * 60_000, gcTime: 10 * 60_000 });
  const chapters = list.data?.chapters ?? [];
  const idx = chapters.findIndex((x) => x.id === c);
  const go = (cid?: string) => {
    navigate({ search: (p) => ({ ...p, c: cid }) });
    window.scrollTo({ top: 0 });
  };

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
          {pages.isLoading && <p className="py-20 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></p>}
          <div className="mt-4 space-y-1">
            {pages.data?.pages.map((p, i) => <img key={p} src={p} alt={`Page ${i + 1}`} loading={i < 3 ? "eager" : "lazy"} className="mx-auto w-full max-w-3xl bg-muted" />)}
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
