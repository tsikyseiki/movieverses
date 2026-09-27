import { Link } from "@tanstack/react-router";
import { Heart, Star } from "lucide-react";
import type { Item } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function PosterCard({ item, index = 0 }: { item: Item; index?: number }) {
  const { isFavorite, toggleFavorite } = useStore();
  const fav = isFavorite(item);
  return (
    <div className="group relative animate-rise" style={{ animationDelay: `${Math.min(index % 24, 12) * 30}ms` }}>
      <Link
        to="/titre/$kind/$id"
        params={{ kind: item.kind, id: item.id }}
        className="block overflow-hidden rounded-xl bg-muted ring-1 ring-border transition duration-500 group-hover:-translate-y-1 group-hover:ring-primary/60 group-hover:shadow-2xl group-hover:shadow-primary/20"
      >
        <div className="relative aspect-[2/3]">
          {item.poster ? (
            <img src={item.poster} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center p-3 text-center text-sm text-muted-foreground">{item.title}</div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-scrim/95 to-transparent opacity-80" />
          {item.rating != null && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-scrim/80 px-2 py-0.5 text-xs font-semibold text-foreground backdrop-blur">
              <Star className="h-3 w-3 fill-gold text-gold" /> {item.rating.toFixed(1)}
            </span>
          )}
        </div>
      </Link>
      <button
        aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
        onClick={() => toggleFavorite(item)}
        className={cn(
          "absolute right-2 top-2 rounded-full bg-scrim/80 p-1.5 backdrop-blur transition",
          fav ? "text-primary" : "text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100",
        )}
      >
        <Heart className={cn("h-4 w-4", fav && "fill-primary")} />
      </button>
      <div className="mt-2 px-0.5">
        <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
        <p className="text-xs text-muted-foreground">{item.date?.slice(0, 4) ?? "—"}</p>
      </div>
    </div>
  );
}

export function PosterSkeleton() {
  return (
    <div>
      <div className="aspect-[2/3] animate-pulse rounded-xl bg-muted" />
      <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function gridCols(size: "compact" | "normal" | "large") {
  return size === "compact"
    ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
    : size === "large"
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
}
