import { useEffect, useState } from "react";
import { Cloud, CloudOff } from "lucide-react";

export function ConnectionStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  if (online) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold shadow-2xl">
      <CloudOff className="h-4 w-4 text-primary" /> Hors ligne · contenu enregistré disponible
    </div>
  );
}

export function OnlinePill() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  const Icon = online ? Cloud : CloudOff;
  return <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{online ? "Connecté" : "Mode hors ligne"}</span>;
}