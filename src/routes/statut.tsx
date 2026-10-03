import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { tmdbFetch } from "@/lib/tmdb.functions";

export const Route = createFileRoute("/statut")({
  head: () => ({
    meta: [
      { title: "État du système — MovieVerse" },
      { name: "description", content: "Disponibilité en direct des services de MovieVerse : catalogue, animés, base de données, API publique." },
      { property: "og:title", content: "État du système — MovieVerse" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Status,
});

type Check = { id: string; label: string; run: () => Promise<boolean> };
type Result = { ok: boolean; ms: number } | "loading";

const timeout = (ms: number) => AbortSignal.timeout(ms);

const CHECKS: Check[] = [
  { id: "app", label: "Application MovieVerse", run: async () => (await fetch("/manifest.webmanifest", { cache: "no-store", signal: timeout(8000) })).ok },
  { id: "tmdb", label: "Catalogue films et séries (TMDB)", run: async () => { const r = await tmdbFetch({ data: { path: "/genre/movie/list", params: {} } }); return !r.error; } },
  {
    id: "anilist", label: "Catalogue animés (AniList)",
    run: async () => (await fetch("https://graphql.anilist.co", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "{Page(perPage:1){media{id}}}" }), signal: timeout(8000) })).ok,
  },
  { id: "archive", label: "Classiques du domaine public (Internet Archive)", run: async () => (await fetch("https://archive.org/advancedsearch.php?q=mediatype:movies&fl[]=identifier&rows=1&output=json", { signal: timeout(8000) })).ok },
  { id: "db", label: "Base de données et comptes", run: async () => { const { error } = await supabase.from("site_stats").select("*").limit(1); return !error; } },
  { id: "api", label: "API publique", run: async () => (await fetch("/api/public/status", { cache: "no-store", signal: timeout(8000) })).ok },
];

function Status() {
  const [res, setRes] = useState<Record<string, Result>>({});
  const [at, setAt] = useState<Date | null>(null);
  const run = useCallback(async () => {
    setRes(Object.fromEntries(CHECKS.map((c) => [c.id, "loading" as const])));
    await Promise.all(
      CHECKS.map(async (c) => {
        const t = performance.now();
        let ok = false;
        try { ok = await c.run(); } catch { ok = false; }
        setRes((r) => ({ ...r, [c.id]: { ok, ms: Math.round(performance.now() - t) } }));
      }),
    );
    setAt(new Date());
  }, []);
  useEffect(() => { void run(); }, [run]);

  const done = CHECKS.every((c) => res[c.id] && res[c.id] !== "loading");
  const down = CHECKS.filter((c) => { const r = res[c.id]; return r && r !== "loading" && !r.ok; });
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-36 lg:pt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Transparence</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">État du système</h1>
      <div className={`mt-6 rounded-2xl border p-4 font-semibold ${!done ? "border-border bg-card" : down.length === 0 ? "border-green-500/40 bg-green-500/10 text-green-500" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
        {!done ? "Vérification en cours…" : down.length === 0 ? "Tous les services fonctionnent normalement." : `${down.length} service${down.length > 1 ? "s" : ""} perturbé${down.length > 1 ? "s" : ""} : ${down.map((d) => d.label.split(" (")[0]).join(", ")}.`}
      </div>
      <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {CHECKS.map((c) => {
          const r = res[c.id];
          return (
            <div key={c.id} className="flex items-center gap-3 p-4">
              {!r || r === "loading" ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : r.ok ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
              <span className="flex-1 text-sm font-medium">{c.label}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{r && r !== "loading" ? (r.ok ? `${r.ms} ms` : "indisponible") : ""}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{at ? `Dernière vérification : ${at.toLocaleTimeString("fr-FR")}` : ""}</span>
        <button onClick={run} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-semibold hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" /> Revérifier</button>
      </div>
    </div>
  );
}
