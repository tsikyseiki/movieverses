import { useEffect, useState } from "react";

export type RGB = { r: number; g: number; b: number };

/** Couleur dominante (privilégie les teintes vives) d'une image, ou null si l'image n'est pas lisible. */
export async function dominantColor(src: string): Promise<RGB | null> {
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) return null;
    const bmp = await createImageBitmap(await res.blob());
    const S = 40;
    const canvas = document.createElement("canvas");
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bmp, 0, 0, S, S);
    bmp.close?.();
    const px = ctx.getImageData(0, 0, S, S).data;
    const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i]!, g = px[i + 1]!, b = px[i + 2]!, a = px[i + 3]!;
      if (a < 200) continue;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const l = (max + min) / 510;
      if (l < 0.12 || l > 0.92) continue;
      const sat = max === 0 ? 0 : (max - min) / max;
      const w = 0.2 + sat * sat * 3;
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const e = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0 };
      e.w += w; e.r += r * w; e.g += g * w; e.b += b * w;
      buckets.set(key, e);
    }
    let best: { w: number; r: number; g: number; b: number } | null = null;
    for (const e of buckets.values()) if (!best || e.w > best.w) best = e;
    if (!best) return null;
    return { r: Math.round(best.r / best.w), g: Math.round(best.g / best.w), b: Math.round(best.b / best.w) };
  } catch {
    return null;
  }
}

export const rgbCss = (c: RGB, a = 1) => `rgb(${c.r} ${c.g} ${c.b} / ${a})`;
export const readableOn = (c: RGB) => (0.299 * c.r + 0.587 * c.g + 0.114 * c.b > 150 ? "#111111" : "#ffffff");

export function useDominantColor(src: string | null | undefined) {
  const [color, setColor] = useState<RGB | null>(null);
  useEffect(() => {
    let alive = true;
    setColor(null);
    if (src) dominantColor(src).then((c) => { if (alive) setColor(c); });
    return () => { alive = false; };
  }, [src]);
  return color;
}
