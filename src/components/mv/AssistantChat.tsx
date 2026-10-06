import { useEffect, useRef, useState, type ReactNode } from "react";
import { ExternalLink, Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { askAssistant } from "@/lib/assistant.functions";
import type { Kind } from "@/lib/catalog";

type Msg = { role: "user" | "assistant"; text: string; sources?: { title: string; url: string }[] };
type Props = { title: string; kind: Kind; year?: string | undefined; overview: string; genres: string[] };

const SUGGESTIONS: Record<Kind, string[]> = {
  film: ["Y aura-t-il une suite ?", "Ça vaut le coup, sans spoiler ?", "Quelles anecdotes de tournage ?", "Quels films similaires ?"],
  manga: ["Quand sort la prochaine saison ?", "Où s'arrête l'anime par rapport au manga ?", "Dans quel ordre le regarder ?", "Ça vaut le coup, sans spoiler ?"],
  serie: ["Y a-t-il une nouvelle saison prévue ?", "Ça vaut le coup, sans spoiler ?", "C'est pour quel public ?", "Quelles séries similaires ?"],
  occidental: ["Y a-t-il une nouvelle saison prévue ?", "Ça vaut le coup, sans spoiler ?", "C'est pour quel âge ?", "Quelles séries similaires ?"],
};

const ERRORS: Record<string, string> = {
  missing_key: "L'assistant n'est pas encore activé (clé Gemini manquante côté serveur).",
  rate_limited: "Vous posez beaucoup de questions ! Patientez quelques minutes avant de continuer.",
  quota: "L'assistant est très sollicité en ce moment. Réessayez dans un instant.",
  upstream: "L'assistant n'a pas pu répondre. Réessayez dans un instant.",
  empty: "Je n'ai pas de réponse à cette question. Pouvez-vous la reformuler ?",
};

const inline = (t: string): ReactNode[] =>
  t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong> : p));

function Rich({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split("\n").filter(Boolean);
        if (lines.length && lines.every((l) => /^\s*[*-]\s+/.test(l))) {
          return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[*-]\s+/, ""))}</li>)}</ul>;
        }
        return <p key={i}>{lines.map((l, j) => <span key={j}>{j > 0 && <br />}{inline(l)}</span>)}</p>;
      })}
    </div>
  );
}

export function AssistantChat({ title, kind, year, overview, genres }: Props) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, loading, open]);

  const send = async (raw: string) => {
    const text = raw.trim().slice(0, 500);
    if (!text || loading) return;
    const next: Msg[] = [...msgs, { role: "user", text }];
    setMsgs(next);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const r = await askAssistant({
        data: { title, kind, year, genres: genres.slice(0, 12), overview: overview.slice(0, 1200), messages: next.slice(-10).map((m) => ({ role: m.role, text: m.text.slice(0, 1500) })) },
      });
      if (r.ok) setMsgs([...next, { role: "assistant", text: r.text, sources: r.sources }]);
      else setError(ERRORS[r.error] ?? ERRORS["upstream"]!);
    } catch {
      setError("Connectez-vous pour discuter avec l'assistant, ou vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/40 transition hover:scale-[1.03]"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <MessageCircle className="h-5 w-5 shrink-0" />
        <span className="truncate">Une question sur « {title} » ?</span>
      </button>
    );
  }

  return (
    <div
      role="dialog" aria-label={`Assistant MovieVerse — ${title}`}
      className="fixed inset-x-0 bottom-0 z-[60] flex h-[min(80vh,38rem)] flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[26rem] sm:rounded-3xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary"><Sparkles className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">Assistant MovieVerse</p>
          <p className="truncate text-xs text-muted-foreground">Sur la fiche : {title}</p>
        </div>
        <button aria-label="Fermer l'assistant" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-muted"><X className="h-5 w-5" /></button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
        <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
          Bonjour ! Que voulez-vous savoir à propos de <strong>{title}</strong> ? Je peux aussi chercher les infos les plus récentes (suite, nouvelle saison, date de sortie…).
        </div>
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS[kind].map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-full border border-border px-3 py-1.5 text-xs transition hover:border-primary hover:text-primary">{s}</button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={m.role === "user" ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground" : "max-w-[92%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3"}>
              {m.role === "user" ? m.text : <Rich text={m.text} />}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-2">
                  {m.sources.map((s) => (
                    <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex max-w-full items-center gap-1 rounded-full bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground">
                      <span className="truncate">{s.title}</span><ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Je cherche…</div>}
        {error && <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        <div ref={end} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} enterKeyHint="send"
          placeholder={`Votre question sur ${title}…`} aria-label="Votre question"
          className="h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Envoyer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
          <Send className="h-5 w-5" />
        </button>
      </form>
      <p className="px-4 pb-2 text-center text-[10px] text-muted-foreground">Réponses générées par IA (Gemini) : elles peuvent contenir des erreurs.</p>
    </div>
  );
}
