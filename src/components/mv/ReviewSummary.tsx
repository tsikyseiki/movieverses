import { useState } from "react";
import { ExternalLink, Loader2, Newspaper } from "lucide-react";
import { summarizeReviews } from "@/lib/ai.functions";
import type { Kind } from "@/lib/catalog";

const ERR: Record<string, string> = {
  missing_key: "Cette fonction n'est pas encore activée (clé Gemini manquante).",
  rate_limited: "Trop de demandes pour l'instant, réessayez dans quelques minutes.",
  quota: "Le service est très sollicité, réessayez dans un instant.",
  upstream: "Impossible de générer le résumé pour le moment.",
  empty: "Aucune synthèse disponible pour ce titre.",
};

export function ReviewSummary({ title, kind, year }: { title: string; kind: Kind; year?: string | undefined }) {
  const [state, setState] = useState<{ text: string; sources: { title: string; url: string }[]; searched: boolean } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setLoading(true);
    setErr(null);
    setDetail(null);
    try {
      const r = await summarizeReviews({ data: { title, kind, year } });
      if (r.ok) setState({ text: r.text, sources: r.sources, searched: r.searched });
      else { setErr(ERR[r.error] ?? ERR["upstream"]!); setDetail(r.detail ?? null); }
    } catch {
      setErr("Connectez-vous ou vérifiez votre connexion, puis réessayez.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <section>
      <h2 className="text-2xl font-bold">Les critiques en bref</h2>
      {!state ? (
        <div className="mt-3">
          <p className="mb-3 text-sm text-muted-foreground">Une synthèse neutre de l'accueil critique (presse, Rotten Tomatoes, IMDb…), générée par IA.</p>
          <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Newspaper className="h-4 w-4" />} Résumer les critiques
          </button>
          {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
          {detail && <p className="mt-1 break-words text-[11px] text-muted-foreground">Détail technique : {detail}</p>}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-border bg-card p-5">
          <p className="leading-relaxed">{state.text}</p>
          {state.sources.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {state.sources.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                  <span className="truncate">{s.title}</span><ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">{state.searched ? "Synthèse générée par IA à partir de sources web : elle peut contenir des erreurs." : "Synthèse générée par IA à partir de ses connaissances (la recherche en ligne était indisponible) : elle peut être incomplète ou datée."}</p>
        </div>
      )}
    </section>
  );
}
