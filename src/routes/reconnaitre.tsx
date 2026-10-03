import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Loader2, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { recognizePoster } from "@/lib/ai.functions";
import { CATEGORIES, searchAll, type Item } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/reconnaitre")({
  head: () => ({
    meta: [
      { title: "Reconnaître une affiche — MovieVerse" },
      { name: "description", content: "Prenez en photo ou importez une affiche : l'IA retrouve le titre du film ou de l'animé." },
      { property: "og:title", content: "Reconnaître une affiche — MovieVerse" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: RecognizePage,
});

const ERR: Record<string, string> = {
  missing_key: "Cette fonction n'est pas encore activée (clé Gemini manquante).",
  rate_limited: "Trop de demandes pour l'instant, réessayez dans quelques minutes.",
  quota: "Le service est très sollicité, réessayez dans un instant.",
  upstream: "L'analyse a échoué. Réessayez avec une photo plus nette.",
  empty: "Je n'ai pas pu lire cette affiche.",
};

async function toJpeg(file: File, max = 1024): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c.toDataURL("image/jpeg", 0.85).split(",")[1]!;
}

function RecognizePage() {
  const { settings } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [guess, setGuess] = useState<{ title: string; year: number | null; confidence: string } | null>(null);
  const [matches, setMatches] = useState<Item[]>([]);
  const [notFound, setNotFound] = useState(false);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Choisissez une image."); return; }
    setBusy(true); setGuess(null); setMatches([]); setNotFound(false);
    setPreview(URL.createObjectURL(file));
    try {
      const image = await toJpeg(file);
      const r = await recognizePoster({ data: { image, mime: "image/jpeg" } });
      if (!r.ok) { toast.error(ERR[r.error] ?? ERR["upstream"]!); return; }
      if (!r.title) { setNotFound(true); return; }
      setGuess({ title: r.title, year: r.year, confidence: r.confidence });
      const found = await searchAll(r.title, settings.lang).catch(() => [] as Item[]);
      const ranked = r.year ? [...found].sort((a, b) => Number(b.date?.startsWith(String(r.year))) - Number(a.date?.startsWith(String(r.year)))) : found;
      setMatches(ranked.slice(0, 6));
    } catch {
      toast.error("Connectez-vous ou vérifiez votre connexion, puis réessayez.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-36 lg:pt-28">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary"><ScanSearch className="h-4 w-4" /> Par l'image</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Reconnaître une affiche</h1>
      <p className="mt-3 text-muted-foreground">Prenez une affiche en photo (cinéma, magazine, écran…) ou importez une image : l'IA retrouve le titre.</p>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      <button onClick={() => fileRef.current?.click()} disabled={busy} className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />} {busy ? "Analyse en cours…" : "Choisir une photo"}
      </button>

      {preview && (
        <div className="mt-8 flex gap-4">
          <img src={preview} alt="Votre affiche" className="h-48 w-32 shrink-0 rounded-xl object-cover ring-1 ring-border" />
          <div className="min-w-0 py-1">
            {busy && <p className="text-muted-foreground">Je regarde l'affiche…</p>}
            {notFound && <p className="text-muted-foreground">Je n'ai pas reconnu cette affiche. Essayez avec une photo plus nette, bien cadrée.</p>}
            {guess && (
              <>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Je pense que c'est</p>
                <p className="mt-1 text-2xl font-extrabold">{guess.title}{guess.year ? ` (${guess.year})` : ""}</p>
                <p className="mt-1 text-xs text-muted-foreground">Confiance : {guess.confidence}</p>
              </>
            )}
          </div>
        </div>
      )}

      {matches.length > 0 && (
        <>
          <h2 className="mt-10 text-xl font-bold">Résultats dans le catalogue</h2>
          <div className="mt-3 space-y-2">
            {matches.map((i) => (
              <Link key={`${i.kind}${i.id}`} to="/titre/$kind/$id" params={{ kind: i.kind, id: i.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary/60">
                <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-muted">{i.poster && <img src={i.poster} alt="" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{i.title}</p>
                  <p className="text-xs text-muted-foreground">{CATEGORIES[i.kind].label} · {i.date?.slice(0, 4) ?? "—"}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
      {guess && matches.length === 0 && !busy && <p className="mt-8 text-muted-foreground">Aucun titre correspondant dans le catalogue.</p>}
      <p className="mt-10 text-[11px] text-muted-foreground">Analyse réalisée par IA (Gemini) : le résultat peut être inexact.</p>
    </div>
  );
}
