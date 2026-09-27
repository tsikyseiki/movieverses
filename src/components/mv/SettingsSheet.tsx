import { Menu, Moon, Sun, Type, Globe, LayoutGrid, Trash2, Heart, History } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/lib/store";
import { CATEGORIES, type Kind } from "@/lib/catalog";
import { cn } from "@/lib/utils";

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </div>
      {children}
    </div>
  );
}
function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid rounded-lg bg-muted p-1" style={{ gridTemplateColumns: `repeat(${options.length},1fr)` }}>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn("rounded-md py-2 text-sm font-medium transition", value === o.v ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function SettingsSheet() {
  const { settings, setSettings, clearHistory, favorites, history } = useStore();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button aria-label="Ouvrir le menu" className="rounded-full p-2 transition hover:bg-accent">
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Paramètres</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link to="/ma-liste" className="rounded-xl bg-muted p-4 transition hover:bg-accent">
              <Heart className="mb-2 h-5 w-5 text-primary" />
              <p className="font-semibold">Ma liste</p>
              <p className="text-xs text-muted-foreground">{favorites.length} titres</p>
            </Link>
            <Link to="/ma-liste" className="rounded-xl bg-muted p-4 transition hover:bg-accent">
              <History className="mb-2 h-5 w-5 text-primary" />
              <p className="font-semibold">Vu récemment</p>
              <p className="text-xs text-muted-foreground">{history.length} titres</p>
            </Link>
          </div>
          <Section icon={settings.theme === "dark" ? Moon : Sun} title="Apparence">
            <Seg value={settings.theme} onChange={(theme) => setSettings({ theme })} options={[{ v: "dark", l: "Sombre" }, { v: "light", l: "Clair" }]} />
          </Section>
          <Section icon={Type} title={`Taille du texte · ${settings.fontSize}px`}>
            <Slider min={13} max={21} step={1} value={[settings.fontSize]} onValueChange={([v]) => setSettings({ fontSize: v ?? 16 })} />
          </Section>
          <Section icon={Globe} title="Langue du contenu">
            <Seg value={settings.lang} onChange={(lang) => setSettings({ lang })} options={[{ v: "fr-FR", l: "Français" }, { v: "en-US", l: "English" }]} />
          </Section>
          <Section icon={LayoutGrid} title="Affichage">
            <p className="mb-2 text-sm">Taille des cartes</p>
            <Seg value={settings.cardSize} onChange={(cardSize) => setSettings({ cardSize })} options={[{ v: "compact", l: "Compact" }, { v: "normal", l: "Normal" }, { v: "large", l: "Grand" }]} />
            <p className="mb-2 mt-5 text-sm">Catégories sur l'accueil</p>
            <div className="space-y-3">
              {(Object.keys(CATEGORIES) as Kind[]).map((k) => (
                <label key={k} className="flex items-center justify-between text-sm">
                  {CATEGORIES[k].label}
                  <Switch checked={settings.categories[k]} onCheckedChange={(v) => setSettings({ categories: { ...settings.categories, [k]: v } })} />
                </label>
              ))}
              <label className="flex items-center justify-between text-sm">
                Défilement automatique de la une
                <Switch checked={settings.autoplayHero} onCheckedChange={(autoplayHero) => setSettings({ autoplayHero })} />
              </label>
            </div>
          </Section>
          <div className="py-5">
            <button onClick={clearHistory} className="inline-flex items-center gap-2 text-sm text-destructive hover:underline">
              <Trash2 className="h-4 w-4" /> Effacer l'historique
            </button>
            <p className="mt-6 text-xs text-muted-foreground">Données : TMDB, AniList, MangaDex. Tout est enregistré sur cet appareil.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
