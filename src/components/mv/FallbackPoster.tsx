// Affiche de remplacement : généré à partir du titre (même titre = même visuel), pour les titres sans image.
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function FallbackPoster({ title, year, className = "" }: { title: string; year?: string | null | undefined; className?: string }) {
  const h = hash(title);
  const a = h % 360;
  const b = (a + 40 + (h % 80)) % 360;
  const angle = 120 + (h % 120);
  return (
    <div
      role="img" aria-label={`Affiche non disponible : ${title}`}
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-4 text-center text-white ${className}`}
      style={{ background: `linear-gradient(${angle}deg, hsl(${a} 65% 32%), hsl(${b} 70% 20%))` }}
    >
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-black/20" />
      <p className="relative line-clamp-5 font-display text-lg font-extrabold leading-tight drop-shadow">{title}</p>
      {year && <p className="relative mt-2 text-xs font-semibold uppercase tracking-widest text-white/70">{year}</p>}
    </div>
  );
}
