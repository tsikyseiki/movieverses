import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Loader2, Play, Search, X } from "lucide-react";

export const Route = createFileRoute("/classiques")({
  head: () => ({
    meta: [
      { title: "Classiques du domaine public — MovieVerse" },
      { name: "description", content: "Films complets du domaine public, à regarder gratuitement et légalement grâce à Internet Archive." },
      { property: "og:title", content: "Classiques du domaine public — MovieVerse" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Classics,
});

type IAItem = { identifier: string; title: string; year?: string | number };
const thumb = (id: string) => `https://archive.org/services/img/${id}`;

async function searchArchive(q: string, page: number) {
  const base = "collection:feature_films AND mediatype:movies";
  const clean = q.trim().replace(/[()":\\]/g, " ");
  const url = new URL("https://archive.org/advancedsearch.php");
  url.searchParams.set("q", clean ? `${base} AND title:(${clean})` : base);
  ["identifier", "title", "year"].forEach((f) => url.searchParams.append("fl[]", f));
  url.searchParams.append("sort[]", "downloads desc");
  url.searchParams.set("rows", "24");
  url.searchParams.set("page", String(page));
  url.searchParams.set("output", "json");
  const r = await fetch(url);
  if (!r.ok) throw new Error("Internet Archive indisponible");
  const j = await r.json();
  const docs = (j.response?.docs ?? []) as IAItem[];
  const total = Number(j.response?.numFound ?? 0);
  return { docs, next: page * 24 < total ? page + 1 : null };
}

async function findVideo(id: string): Promise<string | null> {
  const r = await fetch(`https://archive.org/metadata/${id}`);
  if (!r.ok) return null;
  const j = await r.json();
  const files = ((j.files ?? []) as { name: string; size?: string }[]).filter((f) => /\.mp4$/i.test(f.name) && !/sample|trailer/i.test(f.name));
  if (!files.length) return null;
  const sorted = files.map((f) => ({ ...f, n: Number(f.size ?? 0) })).sort((a, b) => a.n - b.n);
  const pick = sorted.find((f) => f.n >= 20_000_000) ?? sorted[sorted.length - 1]!; // version légère pour mobile
  return `https://archive.org/download/${id}/${encodeURIComponent(pick.name)}`;
}

function Player({ item, onClose }: { item: IAItem; onClose: () => void }) {
  const [src, setSrc] = useState<string | null | undefined>(undefined);
  const [started, setStarted] = useState(false);
  const load = async () => { setStarted(true); setSrc(await findVideo(item.identifier).catch(() => null)); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3" onClick={onClose}>
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 p-3">
          <p className="truncate font-semibold">{item.title}{item.year ? ` (${item.year})` : ""}</p>
          <button aria-label="Fermer" onClick={onClose} className="rounded-full p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="relative aspect-video bg-black">
          {!started ? (
            <button onClick={load} className="group absolute inset-0">
              <img src={thumb(item.identifier)} alt="" className="h-full w-full object-cover opacity-70 transition group-hover:opacity-90" />
              <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground"><Play className="h-7 w-7 fill-current" /></span>
            </button>
          ) : src === undefined ? (
            <div className="flex h-full items-center justify-center text-white"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : src ? (
            <video className="h-full w-full" src={src} poster={thumb(item.identifier)} controls autoPlay playsInline preload="metadata" />
          ) : (
            <iframe className="h-full w-full" src={`https://archive.org/embed/${item.identifier}`} title={item.title} allowFullScreen />
          )}
        </div>
        <div className="flex items-center justify-between gap-3 p-3 text-xs text-muted-foreground">
          <span>Film du domaine public ou librement diffusable (Internet Archive).</span>
          <a href={`https://archive.org/details/${item.identifier}`} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary">Licence <ExternalLink className="h-3 w-3" /></a>
        </div>
      </div>
    </div>
  );
}

function Classics() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<IAItem | null>(null);
  const query = useInfiniteQuery({
    queryKey: ["archive", q],
    queryFn: ({ pageParam }) => searchArchive(q, pageParam),
    initialPageParam: 1,
    getNextPageParam: (p) => p.next,
    staleTime: 30 * 60_000,
    networkMode: "online",
  });
  const items = query.data?.pages.flatMap((p) => p.docs) ?? [];
  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-20 pt-36 md:px-8 lg:pt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">100 % légal et gratuit</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-6xl">Classiques du domaine public</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Des films complets, libres de droits, fournis par Internet Archive et lus directement ici.</p>
      <form onSubmit={(e) => { e.preventDefault(); setQ(input); }} className="mt-6 flex max-w-md gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Chercher un classique…" className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm" />
        <button className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"><Search className="h-4 w-4" /> Chercher</button>
      </form>
      {query.error && <p className="mt-10 text-center text-muted-foreground">Internet Archive n'est pas joignable pour le moment. Réessayez plus tard.</p>}
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((it) => (
          <button key={it.identifier} onClick={() => setOpen(it)} className="group text-left">
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted ring-1 ring-border transition group-hover:ring-primary/60">
              <img src={thumb(it.identifier)} alt={it.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100"><Play className="h-10 w-10 fill-white text-white" /></span>
            </div>
            <p className="mt-2 line-clamp-1 text-sm font-semibold">{it.title}</p>
            <p className="text-xs text-muted-foreground">{it.year ?? "—"}</p>
          </button>
        ))}
        {query.isLoading && Array.from({ length: 12 }).map((_, i) => <div key={i}><div className="aspect-[2/3] animate-pulse rounded-xl bg-muted" /><div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-muted" /></div>)}
      </div>
      {!query.isLoading && !query.error && items.length === 0 && <p className="mt-16 text-center text-muted-foreground">Aucun film trouvé.</p>}
      {query.hasNextPage && (
        <div className="mt-10 text-center">
          <button onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60">
            {query.isFetchingNextPage ? "Chargement…" : "Voir plus de films"}
          </button>
        </div>
      )}
      {open && <Player item={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
