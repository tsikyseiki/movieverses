import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { readConsent, writeConsent } from "@/lib/consent";

export function ConsentBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const sync = () => setShow(!readConsent().decided);
    sync();
    window.addEventListener("mv:consent", sync);
    return () => window.removeEventListener("mv:consent", sync);
  }, []);
  if (!show) return null;
  return (
    <div role="dialog" aria-label="Préférences de confidentialité" className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-xl rounded-2xl border border-border bg-card p-4 shadow-2xl" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex gap-3">
        <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-semibold">Votre vie privée</p>
          <p className="mt-1 text-muted-foreground">
            MovieVerse affiche des annonces (Google AdSense) pour rester gratuit. Vous choisissez : annonces personnalisées ou non personnalisées. Détails dans notre{" "}
            <Link to="/confidentialite" className="text-primary underline">politique de confidentialité</Link>. Modifiable à tout moment dans « Données & confidentialité ».
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => writeConsent(true)} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Accepter les annonces personnalisées</button>
            <button onClick={() => writeConsent(false)} className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted">Annonces non personnalisées</button>
          </div>
        </div>
      </div>
    </div>
  );
}
