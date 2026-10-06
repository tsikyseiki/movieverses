import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Ghost, Heart, Laugh, Loader2, Orbit, RefreshCw, Sparkles, Star, Zap } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, fetchTonight, type Item, type Kind, type Mood, type Tonight } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ce-soir")({
  head: () => ({
    meta: [
      { title: "Que regarder ce soir ? — MovieVerse" },
      { name: "description", content: "Répondez à 4 questions et MovieVerse vous propose 3 titres pour ce soir." },
      { property: "og:title", content: "Que regarder ce soir ? — MovieVerse" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TonightPage,
});

const MOODS: { v: Mood; l: string; hint: string; Icon: typeof Laugh }[] = [
  { v: "rire", l: "Rire", hint: "Comédies légères", Icon: Laugh },
  { v: "frissons", l: "Frissons", hint: "Suspense et horreur", Icon: Ghost },
  { v: "emotion", l: "Émotion", hint: "Drames et romances", Icon: Heart },
  { v: "action", l: "Action", hint: "Adrénaline et aventure", Icon: Zap },
  { v: "reve", l: "Évasion", hint: "Fantastique et science-fiction", Icon: Orbit },
];
const KINDS: Kind[] = ["film", "manga", "occidental", "serie"];

function Chips<T extends string | boolean>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={String(o.v)} onClick={() => onChange(o.v)} className={cn("rounded-full border px-4 py-2 text-sm font-medium transition", value === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground/40")}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function TonightPage() {
  const { settings } = useStore();
  const [t, setT] = useState<Tonight>({ mood: "rire", kind: "film", short: false, family: false });
  const [res, setRes] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);

  const go = async () => {
    setLoading(true);
    try {
      const list = await fetchTonight(t, settings.lang);
      const pool = list.filter((i) => i.poster).sort(() => Math.random() - 0.5).slice(0, 3);
      setRes(pool);
      if (!pool.length) toast.info("Rien trouvé avec ces critères, essayez d'en changer un.");
    } catch {
      toast.error("Impossible de chercher pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-36 lg:pt-28">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary"><Sparkles className="h-4 w-4" /> Idée de soirée</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Que regarder ce soir ?</h1>
      <div className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-6">
        <div>
          <p className="mb-2 font-semibold">1. Votre humeur</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MOODS.map((m) => (
              <button key={m.v} aria-pressed={t.mood === m.v} onClick={() => setT({ ...t, mood: m.v })} className={cn("flex items-center gap-3 rounded-2xl border p-3 text-left transition", t.mood === m.v ? "border-primary bg-primary/10" : "border-border hover:border-foreground/40")}>
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", t.mood === m.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><m.Icon className="h-5 w-5" /></span>
                <span className="min-w-0"><span className="block text-sm font-semibold">{m.l}</span><span className="block truncate text-xs text-muted-foreground">{m.hint}</span></span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 font-semibold">2. Votre univers</p>
          <Chips value={t.kind} onChange={(kind) => setT({ ...t, kind })} options={KINDS.map((k) => ({ v: k, l: CATEGORIES[k].label }))} />
        </div>
        <div>
          <p className="mb-2 font-semibold">3. Durée</p>
          <Chips value={t.short} onChange={(short) => setT({ ...t, short })} options={[{ v: false, l: "Peu importe" }, { v: true, l: "Court (moins de 1 h 45)" }]} />
          {t.short && t.kind !== "film" && <p className="mt-2 text-xs text-muted-foreground">Le filtre de durée ne s'applique qu'aux films.</p>}
        </div>
        <div>
          <p className="mb-2 font-semibold">4. Avec qui ?</p>
          <Chips value={t.family} onChange={(family) => setT({ ...t, family })} options={[{ v: false, l: "Seul·e ou entre amis" }, { v: true, l: "En famille (sans horreur)" }]} />
        </div>
        <button onClick={go} disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} Proposez-moi 3 titres
        </button>
      </div>

      {res && res.length > 0 && (
        <>
          <div className="mt-10 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Pour ce soir</h2>
            <button onClick={go} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><RefreshCw className="h-4 w-4" /> Autres idées</button>
          </div>
          <div className="mt-4 space-y-3">
            {res.map((i) => (
              <Link key={`${i.kind}${i.id}`} to="/titre/$kind/$id" params={{ kind: i.kind, id: i.id }} className="flex gap-4 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/60">
                <div className="h-36 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">{i.poster && <img src={i.poster} alt="" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0 py-1">
                  <p className="text-lg font-bold">{i.title}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {i.rating != null && <span className="flex items-center gap-1 font-semibold text-foreground"><Star className="h-3.5 w-3.5 fill-gold text-gold" />{i.rating.toFixed(1)}</span>}
                    {i.date?.slice(0, 4)}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{i.overview}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
