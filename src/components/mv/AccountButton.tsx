import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Shield, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/lib/auth";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function AccountButton() {
  const { user, isAdmin } = useAuthUser();
  return (
    <div className="flex items-center gap-1">
      {isAdmin && <Link to="/admin" aria-label="Panel admin" className="rounded-full p-2 text-muted-foreground hover:text-foreground"><Shield className="h-5 w-5" /></Link>}
      <Link to={user ? "/profil" : "/auth"} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
        <UserRound className="h-4 w-4" /><span className="hidden sm:inline">{user ? "Mon compte" : "Connexion"}</span>
      </Link>
    </div>
  );
}

export function InstallButton() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    const done = () => { setInstalled(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("appinstalled", done); };
  }, []);
  if (installed) return null;
  const click = async () => {
    if (evt) { await evt.prompt(); await evt.userChoice; setEvt(null); return; }
    const inIframe = window.self !== window.top;
    toast.info(inIframe
      ? "L'installation fonctionne uniquement sur le site publié, ouvert directement dans Chrome."
      : "Dans Chrome : menu ⋮ puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».");
  };
  return (
    <button onClick={click} aria-label="Installer l'application" className="rounded-full p-2 text-muted-foreground hover:text-foreground">
      <Download className="h-5 w-5" />
    </button>
  );
}
