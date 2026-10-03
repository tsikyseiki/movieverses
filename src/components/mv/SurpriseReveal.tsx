import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, RefreshCw, Shuffle, Star, X } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, fetchRandom, type Kind } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Filters = { year?: string; minRating?: number; family?: boolean };

type Props = {
  kind: Kind;
  genre: string | null;
  lang: string;
  filters: Filters;
  open: boolean;
  onClose: () => void;
};

type Picked = Awaited<ReturnType<typeof fetchRandom>>;

export function SurpriseReveal({ kind, genre, lang, filters, open, onClose }: Props) {
  const nav = useNavigate();
  const [phase, setPhase] = useState<"idle" | "rolling" | "ready">("idle");
  const [item, setItem] = useState<NonNullable<Picked> | null>(null);
  const runRef = useRef(0);

  const roll = useCallback(async () => {
    const run = ++runRef.current;
    setPhase("rolling");
    const started = Date.now();
    try {
      const it = await fetchRandom(kind, genre, lang, filters);
      // Court temps de suspense pour que la révélation ait du poids.
      const wait = Math.max(0, 850 - (Date.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      if (run !== runRef.current) return;
      if (it) {
        setItem(it);
        setPhase("ready");
      } else {
        toast.info("Aucun titre ne correspond à ces filtres.");
        onClose();
      }
    } catch {
      if (run !== runRef.current) return;
      toast.error("Impossible de tirer un titre pour le moment.");
      onClose();
    }
  }, [kind, genre, lang, filters, onClose]);

  useEffect(() => {
    if (open) roll();
    else {
      runRef.current++;
      setPhase("idle");
      setItem(null);
    }
  }, [open, roll]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Suggestion aléatoire"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 backdrop-blur-xl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-4 top-4 z-10 rounded-full border border-border bg-card/80 p-2.5 text-muted-foreground transition hover:border-foreground/40 hover:text-foreground md:right-8 md:top-8"
      >
        <X className="h-5 w-5" />
      </button>

      {phase === "rolling" && (
        <div className="flex flex-col items-center gap-8 px-6">
          <div className="flex items-end gap-3">
            {[0, 1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="w-14 rounded-lg border border-border bg-card shadow-lg md:w-20"
                style={{
                  height: n === 2 ? "11rem" : "9.5rem",
                  animation: "rise 0.9s ease-in-out infinite alternate",
                  animationDelay: `${n * 0.12}s`,
                }}
              />
            ))}
          </div>
          <p className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Sélection en cours
          </p>
        </div>
      )}

      {phase === "ready" && item && (
        <div className="relative mx-4 w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:mx-8">
          {item.backdrop ? (
            <div className="absolute inset-0">
              <img
                src={item.backdrop}
                alt=""
                className="h-full w-full scale-105 object-cover opacity-25 animate-kenburns"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
            </div>
          ) : null}

          <div className="relative flex flex-col items-center gap-7 p-6 animate-rise md:flex-row md:items-end md:gap-10 md:p-10">
            <div className="relative shrink-0">
              {item.poster ? (
                <img
                  src={item.poster}
                  alt={item.title}
                  className="h-64 w-44 rounded-xl border border-border object-cover shadow-2xl shadow-black/50 md:h-80 md:w-56"
                />
              ) : (
                <div className="flex h-64 w-44 items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground md:h-80 md:w-56">
                  Affiche indisponible
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
                Notre suggestion
              </p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight md:text-5xl">{item.title}</h2>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
                {item.rating != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {item.rating.toFixed(1)}
                    <span className="font-medium opacity-80">/ 10</span>
                  </span>
                )}
                {item.date && (
                  <span className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
                    {item.date.slice(0, 4)}
                  </span>
                )}
                <span className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
                  {CATEGORIES[kind].label}
                </span>
              </div>

              {item.overview && (
                <p className="mt-5 line-clamp-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {item.overview}
                </p>
              )}

              <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center md:justify-start">
                <button
                  onClick={() => {
                    onClose();
                    nav({ to: "/titre/$kind/$id", params: { kind: item.kind, id: item.id } });
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110"
                >
                  Découvrir ce titre
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={roll}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-background/60 px-6 text-sm font-semibold transition hover:border-foreground/40"
                >
                  <RefreshCw className="h-4 w-4" />
                  Autre suggestion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const SurpriseButton = ({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "ml-auto inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110",
      className,
    )}
  >
    <Shuffle className="h-4 w-4" /> Surprends-moi
  </button>
);
