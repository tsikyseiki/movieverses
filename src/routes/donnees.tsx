import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, Megaphone, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { readConsent, writeConsent } from "@/lib/consent";

export const Route = createFileRoute("/donnees")({
  head: () => ({ meta: [{ title: "Données & confidentialité — MovieVerse" }, { name: "robots", content: "noindex" }] }),
  component: DataCenter,
});

const KEYS = ["favorites", "history", "ratings", "ratingmeta", "watched", "settings", "seen", "saved-searches", "recent-searches", "sync"];

function Card({ icon: Icon, title, children }: { icon: typeof Download; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="mb-3 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary"><Icon className="h-4 w-4" /></span><h2 className="font-display text-lg font-bold">{title}</h2></div>
      <div className="space-y-3 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function DataCenter() {
  const { favorites, history, ratings, ratingMeta, watched, settings, setSettings, applyCloud } = useStore();
  const [ads, setAds] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => setAds(readConsent().ads), []);

  const exportAll = () => {
    const payload = { app: "MovieVerse", version: 1, exportedAt: new Date().toISOString(), favorites, history, ratings, ratingMeta, watched, settings };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `movieverse-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const importAll = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      if (f.size > 5_000_000) throw new Error("trop gros");
      const d = JSON.parse(await f.text()) as Record<string, unknown>;
      if (d["app"] !== "MovieVerse") throw new Error("format");
      const arr = (v: unknown) => (Array.isArray(v) ? v : undefined);
      const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, never>) : undefined);
      applyCloud({ favorites: arr(d["favorites"]), ratings: obj(d["ratings"]), ratingMeta: obj(d["ratingMeta"]), watched: arr(d["watched"]) }, "union");
      toast.success("Données importées et fusionnées avec les vôtres.");
    } catch {
      toast.error("Fichier invalide : choisissez un export MovieVerse (.json).");
    }
  };

  const wipe = () => {
    if (!confirm("Supprimer toutes les données MovieVerse de cet appareil (favoris, notes, journal, réglages) ? Cette action est définitive.")) return;
    KEYS.forEach((k) => { try { localStorage.removeItem(`mv:${k}`); } catch { /* ignoré */ } });
    toast.success("Données supprimées de cet appareil.");
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pb-24 pt-36 lg:pt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Vos droits</p>
      <h1 className="text-4xl font-extrabold md:text-5xl">Données & confidentialité</h1>

      <Card icon={Megaphone} title="Annonces (Google AdSense)">
        <div className="flex items-center justify-between gap-4">
          <span>Autoriser les annonces personnalisées<span className="block text-xs">Désactivé : les annonces affichées ne sont pas basées sur votre activité.</span></span>
          <Switch checked={ads} onCheckedChange={(v) => { setAds(v); writeConsent(v); toast.success(v ? "Annonces personnalisées activées." : "Annonces non personnalisées."); }} aria-label="Annonces personnalisées" />
        </div>
        <p className="text-xs">Détails : <Link to="/confidentialite" className="text-primary underline">politique de confidentialité</Link>.</p>
      </Card>

      <Card icon={Download} title="Exporter mes données">
        <p>Téléchargez un fichier contenant vos favoris, notes, historique, journal de visionnage et réglages ({favorites.length} favoris, {Object.keys(ratings).length} notes, {watched.length} titres vus).</p>
        <button onClick={exportAll} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground"><Download className="h-4 w-4" /> Télécharger mon export</button>
      </Card>

      <Card icon={Upload} title="Importer des données">
        <p>Restaurez un export MovieVerse : il est fusionné avec vos données actuelles, rien n'est écrasé.</p>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={importAll} />
        <button onClick={() => file.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 font-semibold text-foreground hover:bg-muted"><Upload className="h-4 w-4" /> Choisir un fichier</button>
      </Card>

      <Card icon={Trash2} title="Supprimer mes données">
        <p>Efface les données MovieVerse stockées sur cet appareil. Si vos données sont synchronisées avec votre compte, elles restent disponibles sur le compte jusqu'à sa suppression.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={wipe} className="inline-flex items-center gap-2 rounded-full border border-destructive/50 px-5 py-2.5 font-semibold text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /> Effacer cet appareil</button>
          <Link to="/contact" className="inline-flex items-center rounded-full border border-border px-5 py-2.5 font-semibold text-foreground hover:bg-muted">Demander la suppression de mon compte</Link>
        </div>
      </Card>

      <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4 text-sm">
        <span>Économiseur de données<span className="block text-xs text-muted-foreground">Évite le préchargement en arrière-plan.</span></span>
        <Switch checked={settings.dataSaver} onCheckedChange={(dataSaver) => setSettings({ dataSaver })} />
      </label>
      <p className="text-xs text-muted-foreground">Historique : {history.length} titres consultés récemment.</p>
    </div>
  );
}
