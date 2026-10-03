import { Hourglass } from "lucide-react";

export function NotReady({ what }: { what: string }) {
  return (
    <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-border p-10 text-center">
      <Hourglass className="h-8 w-8 text-primary" />
      <p className="mt-3 text-lg font-bold">Bientôt disponible</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{what} sera activé dès que la base de données de MovieVerse aura été mise à jour.</p>
    </div>
  );
}
