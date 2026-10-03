import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { fetchDetail, searchAll, type Detail, type Kind } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/comparer")({
  validateSearch: (s: Record<string, unknown>) => ({
    a: typeof s.a === "string" ? s.a : undefined,
    b: typeof s.b === "string" ? s.b : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Comparer deux titres — MovieVerse" },
      { name: "description", content: "Comparez deux films ou animés côte à côte : note, durée, genres, casting." },
      { property: "og:title", content: "Comparer deux titres — MovieVerse" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ComparePage,
});

const parse = (v?: string): { kind: Kind; id: string } | null => {
  const [kind, id] = (v ?? "").split(":");
  return kind && id && ["film", "manga", "occidental"].includes(kind) ? { kind: kind as Kind, id } : null;
};

function Picker({ onPick }: { onPick: (v: string) => void }) {
  const { settings } = useStore();
  const [q, setQ] = useState("");
  const { data } = useQuery({ queryKey: ["cmp-search", q], queryFn: () => searchAll(q, settings.lang), enabled: q.trim().length >= 2, staleTime: 60_000 });
  return (
    <div className="rounded-2xl border border-dashed border-border p-3">
      <div className="flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un titre…" aria-label="Chercher un titre à comparer" className="w-full bg-transparent text-sm outline-none" />
      </div>
      <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
        {data?.slice(0, 8).map((i) => (
          <button key={`${i.kind}${i.id}`} onClick={() => onPick(`${i.kind}:${i.id}`)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-accent">
            <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">{i.poster && <img src={i.poster} alt="" className="h-full w-full object-cover" />}</div>
            <span className="truncate text-sm font-medium">{i.title}</span>
            <span className="ml-auto text-xs text-muted-foreground">{i.date?.slice(0, 4)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function useDetail(v?: string) {
  const { settings } = useStore();
  const p = parse(v);
  return useQuery({ queryKey: ["detail", p?.kind, p?.id, settings.lang], queryFn: () => fetchDetail(p!.kind, p!.id, settings.lang), enabled: !!p, staleTime: 30 * 60_000 });
}

function Col({ d, onClear }: { d: Detail; onClear: () => void }) {
  return (
    <div className="relative">
      <button aria-label="Retirer" onClick={onClear} className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white"><X className="h-4 w-4" /></button>
      <Link to="/titre/$kind/$id" params={{ kind: d.kind, id: d.id }}>
        <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-muted ring-1 ring-border">{d.poster && <img src={d.poster} alt={d.title} className="h-full w-full object-cover" />}</div>
        <p className="mt-2 line-clamp-2 text-center font-bold">{d.title}</p>
      </Link>
    </div>
  );
}

function ComparePage() {
  const { a, b } = Route.useSearch();
  const nav = useNavigate();
  const da = useDetail(a).data;
  const db = useDetail(b).data;
  const set = (patch: { a?: string | undefined; b?: string | undefined }) => nav({ to: "/comparer", search: { a, b, ...patch }, replace: true });

  const rows: { label: string; va: string; vb: string; winner?: "a" | "b" | null }[] = [];
  if (da && db) {
    const better = (x: number | null, y: number | null, high = true): "a" | "b" | null => (x == null || y == null || x === y ? null : (x > y) === high ? "a" : "b");
    rows.push({ label: "Note", va: da.rating != null ? `${da.rating.toFixed(1)}/10` : "—", vb: db.rating != null ? `${db.rating.toFixed(1)}/10` : "—", winner: better(da.rating, db.rating) });
    rows.push({ label: "Année", va: da.date?.slice(0, 4) ?? "—", vb: db.date?.slice(0, 4) ?? "—" });
    rows.push({ label: "Durée", va: da.runtime ?? "—", vb: db.runtime ?? "—", winner: better(da.runtimeMin, db.runtimeMin, false) });
    const common = da.genres.filter((g) => db.genres.includes(g));
    rows.push({ label: "Genres", va: da.genres.join(", ") || "—", vb: db.genres.join(", ") || "—" });
    rows.push({ label: "Genres en commun", va: common.join(", ") || "Aucun", vb: common.join(", ") || "Aucun" });
    const castA = new Set((da.cast ?? []).map((c) => c.name));
    const shared = (db.cast ?? []).filter((c) => castA.has(c.name)).map((c) => c.name);
    if (shared.length) rows.push({ label: "Acteurs en commun", va: shared.join(", "), vb: shared.join(", ") });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-36 lg:pt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Outil</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Comparer deux titres</h1>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6">
        {[{ k: "a" as const, d: da }, { k: "b" as const, d: db }].map(({ k, d }) => (
          <div key={k}>{d ? <Col d={d} onClear={() => set({ [k]: undefined })} /> : <Picker onPick={(v) => set({ [k]: v })} />}</div>
        ))}
      </div>
      {rows.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          {rows.map((r) => (
            <div key={r.label} className="border-b border-border last:border-0">
              <p className="bg-muted/50 px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">{r.label}</p>
              <div className="grid grid-cols-2 divide-x divide-border text-center text-sm">
                <p className={`p-3 ${r.winner === "a" ? "bg-primary/15 font-bold text-primary" : ""}`}>{r.va}</p>
                <p className={`p-3 ${r.winner === "b" ? "bg-primary/15 font-bold text-primary" : ""}`}>{r.vb}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {!da && !db && <p className="mt-6 text-center text-sm text-muted-foreground">Choisissez deux titres pour les comparer côte à côte.</p>}
    </div>
  );
}
