import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const UA = { "User-Agent": "MovieVerse/1.0", accept: "application/json" };

async function md(path: string) {
  const res = await fetch(`https://api.mangadex.org${path}`, { headers: UA });
  if (!res.ok) throw new Error(`MangaDex ${res.status}`);
  return res.json() as Promise<any>;
}

export type MdChapter = { id: string; chapter: string | null; title: string | null; lang: string; pages: number };

export const findMangaChapters = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ titles: z.array(z.string()).min(1).max(4) }).parse(d))
  .handler(async ({ data }) => {
    let mangaId: string | null = null;
    let mangaTitle = "";
    for (const t of data.titles) {
      const r = await md(`/manga?limit=1&title=${encodeURIComponent(t)}&order[relevance]=desc`);
      if (r.data?.[0]) {
        mangaId = r.data[0].id;
        const tt = r.data[0].attributes.title;
        mangaTitle = tt.en ?? tt["ja-ro"] ?? Object.values(tt)[0] ?? t;
        break;
      }
    }
    if (!mangaId) return { mangaId: null, mangaTitle: "", chapters: [] as MdChapter[] };
    const feed = await md(
      `/manga/${mangaId}/feed?limit=300&translatedLanguage[]=fr&translatedLanguage[]=en&order[chapter]=asc&includeExternalUrl=0&contentRating[]=safe&contentRating[]=suggestive`,
    );
    const seen = new Map<string, MdChapter>();
    for (const c of feed.data ?? []) {
      const a = c.attributes;
      if (!a.pages) continue;
      const k = `${a.chapter}-${a.translatedLanguage}`;
      if (!seen.has(k))
        seen.set(k, { id: c.id, chapter: a.chapter, title: a.title, lang: a.translatedLanguage, pages: a.pages });
    }
    return { mangaId, mangaTitle, chapters: [...seen.values()] };
  });

export const getChapterPages = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const r = await md(`/at-home/server/${data.id}`);
    const base = `${r.baseUrl}/data-saver/${r.chapter.hash}`;
    return { pages: (r.chapter.dataSaver as string[]).map((p) => `${base}/${p}`) };
  });
