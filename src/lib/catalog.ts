import { tmdbFetch } from "./tmdb.functions";

export type Kind = "film" | "manga" | "occidental";
export type Item = {
  kind: Kind;
  id: string;
  title: string;
  poster: string | null;
  backdrop: string | null;
  rating: number | null; // /10
  date: string | null;
  overview: string;
  genreIds?: number[] | undefined;
};

export const CATEGORIES: Record<Kind, { label: string; path: string; tagline: string }> = {
  film: { label: "Films", path: "/films", tagline: "Le cinéma du monde entier" },
  manga: { label: "Animé Manga", path: "/manga", tagline: "L'animation japonaise" },
  occidental: { label: "Animé Occidental", path: "/occidental", tagline: "Dessins animés et séries animées" },
};

type TmdbGenre = { slug: string; label: string; genre?: number; keyword?: number };
export const FILM_GENRES: TmdbGenre[] = [
  { slug: "romance", label: "Romance", genre: 10749 },
  { slug: "action", label: "Action", genre: 28 },
  { slug: "horreur", label: "Horreur", genre: 27 },
  { slug: "zombie", label: "Zombie", keyword: 12377 },
  { slug: "comedie", label: "Comédie", genre: 35 },
  { slug: "thriller", label: "Thriller", genre: 53 },
  { slug: "science-fiction", label: "Science-fiction", genre: 878 },
  { slug: "drame", label: "Drame", genre: 18 },
  { slug: "aventure", label: "Aventure", genre: 12 },
  { slug: "fantastique", label: "Fantastique", genre: 14 },
  { slug: "documentaire", label: "Documentaire", genre: 99 },
  { slug: "animation", label: "Animation", genre: 16 },
  { slug: "guerre", label: "Guerre", genre: 10752 },
  { slug: "policier", label: "Policier", genre: 80 },
];
export const WEST_GENRES: TmdbGenre[] = [
  { slug: "action", label: "Action", genre: 10759 },
  { slug: "comedie", label: "Comédie", genre: 35 },
  { slug: "aventure", label: "Aventure", genre: 10759 },
  { slug: "super-heros", label: "Super-héros", keyword: 9715 },
  { slug: "science-fiction", label: "Science-fiction", genre: 10765 },
  { slug: "famille", label: "Famille", genre: 10751 },
];
type AniGenre = { slug: string; label: string; genre?: string; tag?: string };
export const MANGA_GENRES: AniGenre[] = [
  { slug: "shonen", label: "Shonen", tag: "Shounen" },
  { slug: "shojo", label: "Shojo", tag: "Shoujo" },
  { slug: "seinen", label: "Seinen", tag: "Seinen" },
  { slug: "isekai", label: "Isekai / Réincarnation", tag: "Isekai" },
  { slug: "mecha", label: "Mecha", genre: "Mecha" },
  { slug: "slice-of-life", label: "Tranche de vie", genre: "Slice of Life" },
  { slug: "horreur", label: "Horreur", genre: "Horror" },
  { slug: "sport", label: "Sport", genre: "Sports" },
  { slug: "fantastique", label: "Fantastique", genre: "Fantasy" },
  { slug: "comedie", label: "Comédie", genre: "Comedy" },
];
export const genresFor = (k: Kind) => (k === "film" ? FILM_GENRES : k === "manga" ? MANGA_GENRES : WEST_GENRES);

const IMG = "https://image.tmdb.org/t/p/";
const WEST_ORIGINS = "US|GB|FR|CA|BE|IE|AU|DE|ES|IT";

export class MissingKeyError extends Error {}

export async function tmdb<T = any>(path: string, params: Record<string, string> = {}): Promise<T> {
  const r = await tmdbFetch({ data: { path, params } });
  if (r.error === "missing_key") throw new MissingKeyError("Clé TMDB manquante");
  if (r.error || !r.data) throw new Error(`TMDB: ${r.error}`);
  return JSON.parse(r.data) as T;
}

function mapTmdb(kind: Kind, r: any): Item {
  return {
    kind,
    id: String(r.id),
    title: r.title ?? r.name ?? "",
    poster: r.poster_path ? `${IMG}w342${r.poster_path}` : null,
    backdrop: r.backdrop_path ? `${IMG}w1280${r.backdrop_path}` : null,
    rating: r.vote_average ? Math.round(r.vote_average * 10) / 10 : null,
    date: r.release_date ?? r.first_air_date ?? null,
    overview: r.overview ?? "",
    genreIds: r.genre_ids,
  };
}

// ---------- AniList ----------
export async function anilist<T = any>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const j = await res.json();
  if (j.errors) throw new Error(j.errors[0]?.message ?? "AniList");
  return j.data as T;
}
const MEDIA_FIELDS = `id title{romaji english userPreferred} coverImage{extraLarge large} bannerImage averageScore startDate{year month day} description(asHtml:false) genres`;
function strip(s: string | null) {
  return (s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
function aniDate(d: any) {
  if (!d?.year) return null;
  return `${d.year}-${String(d.month ?? 1).padStart(2, "0")}-${String(d.day ?? 1).padStart(2, "0")}`;
}

const ANI_GENRES_FR: Record<string, string> = {
  Action: "Action",
  Adventure: "Aventure",
  Comedy: "Comédie",
  Drama: "Drame",
  Ecchi: "Ecchi",
  Fantasy: "Fantastique",
  Horror: "Horreur",
  MahouShoujo: "Magical girl",
  Mecha: "Mecha",
  Music: "Musique",
  Mystery: "Mystère",
  Psychological: "Psychologique",
  Romance: "Romance",
  SciFi: "Science-fiction",
  SliceOfLife: "Tranche de vie",
  Sports: "Sport",
  Supernatural: "Surnaturel",
  Thriller: "Thriller",
};

function frenchAniGenre(genre: string): string {
  return ANI_GENRES_FR[genre.replaceAll(" ", "")] ?? genre;
}
export function mapAni(m: any): Item {
  return {
    kind: "manga",
    id: String(m.id),
    title: m.title.english ?? m.title.userPreferred ?? m.title.romaji,
    poster: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
    backdrop: m.bannerImage ?? m.coverImage?.extraLarge ?? null,
    rating: m.averageScore ? m.averageScore / 10 : null,
    date: aniDate(m.startDate),
    overview: strip(m.description),
  };
}

const ANI_PAGE = `query($page:Int,$genre:String,$tag:String,$sort:[MediaSort]){Page(page:$page,perPage:24){pageInfo{hasNextPage} media(type:ANIME,countryOfOrigin:"JP",isAdult:false,genre:$genre,tag:$tag,sort:$sort,format_in:[TV,MOVIE,ONA,OVA,TV_SHORT]){${MEDIA_FIELDS}}}}`;

export type Page = { items: Item[]; next: number | null };

export async function fetchCatalog(kind: Kind, genre: string | null, page: number, lang: string): Promise<Page> {
  if (kind === "manga") {
    const g = MANGA_GENRES.find((x) => x.slug === genre);
    const d = await anilist(ANI_PAGE, {
      page,
      genre: g?.genre,
      tag: g?.tag,
      sort: g ? ["POPULARITY_DESC"] : ["TRENDING_DESC"],
    });
    return { items: d.Page.media.map(mapAni), next: d.Page.pageInfo.hasNextPage ? page + 1 : null };
  }
  const list = kind === "film" ? FILM_GENRES : WEST_GENRES;
  const g = list.find((x) => x.slug === genre);
  const params: Record<string, string> = {
    page: String(page),
    language: lang,
    sort_by: "popularity.desc",
    include_adult: "false",
    "vote_count.gte": "20",
  };
  if (kind === "film") {
    if (g?.genre) params["with_genres"] = String(g.genre);
    if (g?.keyword) params["with_keywords"] = String(g.keyword);
    // Strict separation: animated films live under "Animation" only
    if (g?.genre !== 16) params["without_genres"] = "16";
    const d = await tmdb("/discover/movie", params);
    return { items: d.results.map((r: any) => mapTmdb("film", r)), next: page < Math.min(d.total_pages, 500) ? page + 1 : null };
  }
  params["with_genres"] = g?.genre ? `16,${g.genre}` : "16";
  if (g?.keyword) params["with_keywords"] = String(g.keyword);
  params["with_origin_country"] = WEST_ORIGINS;
  params["without_genres"] = "10762"; // no kids-only preschool noise
  const d = await tmdb("/discover/tv", params);
  const items = d.results
    .filter((r: any) => r.genre_ids?.includes(16) && !(r.origin_country ?? []).includes("JP"))
    .map((r: any) => mapTmdb("occidental", r));
  return { items, next: page < Math.min(d.total_pages, 500) ? page + 1 : null };
}

export async function fetchFeatured(lang: string): Promise<Item[]> {
  const [films, west, ani] = await Promise.allSettled([
    tmdb("/trending/movie/day", { language: lang }),
    tmdb("/discover/tv", { language: lang, with_genres: "16", with_origin_country: WEST_ORIGINS, sort_by: "popularity.desc" }),
    anilist(`query{Page(perPage:15){media(type:ANIME,countryOfOrigin:"JP",isAdult:false,sort:TRENDING_DESC){${MEDIA_FIELDS}}}}`, {}),
  ]);
  const out: Item[] = [];
  if (films.status === "fulfilled") out.push(...films.value.results.filter((r: any) => !r.genre_ids?.includes(16)).map((r: any) => mapTmdb("film", r)));
  if (west.status === "fulfilled") out.push(...west.value.results.filter((r: any) => !(r.origin_country ?? []).includes("JP")).map((r: any) => mapTmdb("occidental", r)));
  if (ani.status === "fulfilled") out.push(...ani.value.Page.media.map(mapAni));
  return out.filter((i) => i.backdrop);
}

export async function fetchRow(kind: Kind, lang: string): Promise<Item[]> {
  return (await fetchCatalog(kind, null, 1, lang)).items.slice(0, 18);
}

// ---------- Detail ----------
export type Detail = Item & {
  genres: string[];
  runtime: string | null;
  trailer: string | null;
  cast: { name: string; role: string; photo: string | null }[];
  similar: Item[];
  availability: { name: string; logo: string | null; url?: string }[];
  status: string | null;
  altTitles: string[];
};

export async function fetchDetail(kind: Kind, id: string, lang: string): Promise<Detail> {
  if (kind === "manga") {
    const q = `query($id:Int){Media(id:$id,type:ANIME){${MEDIA_FIELDS} status episodes duration synonyms title{native} trailer{id site}
      externalLinks{site url type icon} characters(perPage:10,sort:ROLE){edges{role node{name{full} image{medium}} voiceActors(language:JAPANESE){name{full}}}}
      recommendations(perPage:12,sort:RATING_DESC){nodes{mediaRecommendation{${MEDIA_FIELDS} countryOfOrigin type}}}}}`;
    const { Media: m } = await anilist(q, { id: Number(id) });
    const base = mapAni(m);
    return {
      ...base,
      genres: (m.genres ?? []).map(frenchAniGenre),
      runtime: m.episodes ? `${m.episodes} épisodes${m.duration ? ` · ${m.duration} min` : ""}` : null,
      trailer: m.trailer?.site === "youtube" ? m.trailer.id : null,
      cast: (m.characters?.edges ?? []).map((e: any) => ({
        name: e.node.name.full,
         role: e.voiceActors?.[0]?.name?.full ? `Doublé par ${e.voiceActors[0].name.full}` : e.role === "MAIN" ? "Personnage principal" : "Personnage secondaire",
        photo: e.node.image?.medium ?? null,
      })),
      similar: (m.recommendations?.nodes ?? [])
        .map((n: any) => n.mediaRecommendation)
        .filter((r: any) => r && r.type === "ANIME" && r.countryOfOrigin === "JP")
        .map(mapAni),
      availability: (m.externalLinks ?? [])
        .filter((l: any) => l.type === "STREAMING")
        .map((l: any) => ({ name: l.site, logo: l.icon, url: l.url })),
      status: m.status,
      altTitles: [m.title.romaji, m.title.english, m.title.native, ...(m.synonyms ?? [])].filter(Boolean),
    };
  }
  const t = kind === "film" ? "movie" : "tv";
  const d = await tmdb(`/${t}/${id}`, {
    language: lang,
    append_to_response: "videos,credits,recommendations,similar,watch/providers",
    include_video_language: `${lang.slice(0, 2)},en,null`,
  });
  const vids = (d.videos?.results ?? []).filter((v: any) => v.site === "YouTube");
  const trailer = vids.find((v: any) => v.type === "Trailer") ?? vids[0];
  const prov = d["watch/providers"]?.results ?? {};
  const region = prov.FR ?? prov.US ?? Object.values(prov)[0] ?? {};
  const avail = [...(region.flatrate ?? []), ...(region.rent ?? [])];
  const uniq = new Map<string, any>();
  avail.forEach((p: any) => uniq.set(p.provider_name, p));
  const recs = [...(d.recommendations?.results ?? []), ...(d.similar?.results ?? [])];
  const strictRecs = recs.filter((r: any) =>
    kind === "film" ? !r.genre_ids?.includes(16) || d.genres?.some((g: any) => g.id === 16) : r.genre_ids?.includes(16) && !(r.origin_country ?? []).includes("JP"),
  );
  const seen = new Set<number>();
  return {
    ...mapTmdb(kind, d),
    genres: (d.genres ?? []).map((g: any) => g.name),
    runtime: d.runtime ? `${Math.floor(d.runtime / 60)}h${String(d.runtime % 60).padStart(2, "0")}` : d.number_of_seasons ? `${d.number_of_seasons} saison(s) · ${d.number_of_episodes} épisodes` : null,
    trailer: trailer?.key ?? null,
    cast: (d.credits?.cast ?? []).slice(0, 12).map((c: any) => ({
      name: c.name,
      role: c.character,
      photo: c.profile_path ? `${IMG}w185${c.profile_path}` : null,
    })),
    similar: strictRecs.filter((r: any) => !seen.has(r.id) && seen.add(r.id)).slice(0, 12).map((r: any) => mapTmdb(kind, r)),
    availability: [...uniq.values()].map((p: any) => ({ name: p.provider_name, logo: p.logo_path ? `${IMG}w92${p.logo_path}` : null, url: region.link })),
    status: d.status ?? null,
    altTitles: [d.original_title ?? d.original_name].filter(Boolean),
  };
}

// ---------- Search ----------
export async function searchAll(q: string, lang: string): Promise<Item[]> {
  const [m, tv, ani] = await Promise.allSettled([
    tmdb("/search/movie", { query: q, language: lang, include_adult: "false" }),
    tmdb("/search/tv", { query: q, language: lang, include_adult: "false" }),
    anilist(`query($q:String){Page(perPage:6){media(search:$q,type:ANIME,countryOfOrigin:"JP",isAdult:false){${MEDIA_FIELDS}}}}`, { q }),
  ]);
  const out: Item[] = [];
  if (m.status === "fulfilled") out.push(...m.value.results.filter((r: any) => !r.genre_ids?.includes(16)).slice(0, 5).map((r: any) => mapTmdb("film", r)));
  if (ani.status === "fulfilled") out.push(...ani.value.Page.media.map(mapAni));
  if (tv.status === "fulfilled")
    out.push(...tv.value.results.filter((r: any) => r.genre_ids?.includes(16) && !(r.origin_country ?? []).includes("JP")).slice(0, 4).map((r: any) => mapTmdb("occidental", r)));
  return out;
}

// ---------- Upcoming (notifications) ----------
export async function fetchUpcoming(genreIds: number[], lang: string): Promise<Item[]> {
  const today = new Date().toISOString().slice(0, 10);
  const params: Record<string, string> = { language: lang, "primary_release_date.gte": today, sort_by: "popularity.desc", without_genres: "16" };
  if (genreIds.length) params["with_genres"] = genreIds.join("|");
  const d = await tmdb("/discover/movie", params);
  return d.results.slice(0, 10).map((r: any) => mapTmdb("film", r));
}

export function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = b[i]!;
    b[i] = b[j]!;
    b[j] = t;
  }
  return b;
}
