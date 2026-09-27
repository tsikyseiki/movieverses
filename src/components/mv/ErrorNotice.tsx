import { KeyRound, WifiOff } from "lucide-react";
import { MissingKeyError } from "@/lib/catalog";

export function ErrorNotice({ error }: { error: unknown }) {
  const missing = error instanceof MissingKeyError || String((error as Error)?.message).includes("TMDB manquante");
  return (
    <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-border p-10 text-center">
      {missing ? <KeyRound className="h-8 w-8 text-primary" /> : <WifiOff className="h-8 w-8 text-muted-foreground" />}
      <p className="mt-3 font-display text-lg font-bold">{missing ? "Clé TMDB à ajouter" : "Contenu indisponible"}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {missing ? "Les films et animés occidentaux s'afficheront dès que la clé TMDB sera enregistrée." : "Vérifiez votre connexion. Les derniers catalogues chargés restent consultables hors-ligne."}
      </p>
    </div>
  );
}
