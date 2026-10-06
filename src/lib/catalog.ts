import { tmdbFetch } from "./tmdb.functions";

export type Kind = "film" | "manga" | "occidental" | "serie";
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
  serie: { label: "Séries", path: "/series", tagline: "Les séries du moment" },
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
export const SERIES_GENRES: TmdbGenre[] = [
  { slug: "action-aventure", label: "Action & Aventure", genre: 10759 },
  { slug: "comedie", label: "Comédie", genre: 35 },
  { slug: "drame", label: "Drame", genre: 18 },
  { slug: "crime", label: "Crime", genre: 80 },
  { slug: "mystere", label: "Mystère", genre: 9648 },
  { slug: "science-fiction", label: "Science-fiction & Fantastique", genre: 10765 },
  { slug: "famille", label: "Famille", genre: 10751 },
  { slug: "guerre-politique", label: "Guerre & Politique", genre: 10768 },
  { slug: "western", label: "Western", genre: 37 },
  { slug: "documentaire", label: "Documentaire", genre: 99 },
  { slug: "telerealite", label: "Téléréalité", genre: 10764 },
];
export const genresFor = (k: Kind) => (k === "film" ? FILM_GENRES : k === "manga" ? MANGA_GENRES : k === "serie" ? SERIES_GENRES : WEST_GENRES);

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

const ANI_PAGE = `query($page:Int,$genre:String,$tag:String,$sort:[MediaSort],$year:Int,$score:Int,$notGenres:[String]){Page(page:$page,perPage:24){pageInfo{hasNextPage} media(type:ANIME,countryOfOrigin:"JP",isAdult:false,genre:$genre,genre_not_in:$notGenres,tag:$tag,sort:$sort,seasonYear:$year,averageScore_greater:$score,format_in:[TV,MOVIE,ONA,OVA,TV_SHORT]){${MEDIA_FIELDS}}}}`;

export type Page = { items: Item[]; next: number | null };
export type Filters = { year?: string | undefined; minRating?: number | undefined; sort?: "popularity" | "rating" | "recent" | undefined; family?: boolean | undefined };

export async function fetchCatalog(kind: Kind, genre: string | null, page: number, lang: string, f: Filters = {}): Promise<Page> {
  if (kind === "manga") {
    const g = MANGA_GENRES.find((x) => x.slug === genre);
    const d = await anilist(ANI_PAGE, {
      page,
      genre: g?.genre,
      tag: g?.tag,
      sort: f.sort === "rating" ? ["SCORE_DESC"] : f.sort === "recent" ? ["START_DATE_DESC"] : g || f.year || f.minRating ? ["POPULARITY_DESC"] : ["TRENDING_DESC"],
      notGenres: f.family ? ["Horror", "Ecchi", "Hentai"] : undefined,
      year: f.year ? Number(f.year) : undefined,
      score: f.minRating ? Math.round(f.minRating * 10) - 1 : undefined,
    });
    return { items: d.Page.media.map(mapAni), next: d.Page.pageInfo.hasNextPage ? page + 1 : null };
  }
  const list = kind === "film" ? FILM_GENRES : kind === "serie" ? SERIES_GENRES : WEST_GENRES;
  const g = list.find((x) => x.slug === genre);
  const params: Record<string, string> = {
    page: String(page),
    language: lang,
    sort_by: "popularity.desc",
    include_adult: "false",
    "vote_count.gte": "20",
  };
  if (f.minRating) params["vote_average.gte"] = String(f.minRating);
  const today = new Date().toISOString().slice(0, 10);
  if (f.sort === "rating") { params["sort_by"] = "vote_average.desc"; params["vote_count.gte"] = "300"; }
  if (f.sort === "recent") {
    params["sort_by"] = kind === "film" ? "primary_release_date.desc" : "first_air_date.desc";
    params["vote_count.gte"] = "50";
    params[kind === "film" ? "primary_release_date.lte" : "first_air_date.lte"] = today;
  }
  if (kind === "film") {
    if (f.year) params["primary_release_year"] = f.year;
    if (g?.genre) params["with_genres"] = String(g.genre);
    if (g?.keyword) params["with_keywords"] = String(g.keyword);
    // Strict separation: animated films live under "Animation" only
    if (g?.genre !== 16) params["without_genres"] = "16";
    if (f.family) params["without_genres"] = `${params["without_genres"] ? params["without_genres"] + "," : ""}27,53,80`;
    const d = await tmdb("/discover/movie", params);
    return { items: d.results.map((r: any) => mapTmdb("film", r)), next: page < Math.min(d.total_pages, 500) ? page + 1 : null };
  }
  if (f.year) params["first_air_date_year"] = f.year;
  if (kind === "serie") {
    // Séries télévisées : tout sauf l'animation (qui reste dans « Animé occidental » et « Animé manga »)
    if (g?.genre) params["with_genres"] = String(g.genre);
    params["without_genres"] = f.family ? "16,10762,80,9648,10764" : "16,10762";
    const ds = await tmdb("/discover/tv", params);
    return {
      items: ds.results.filter((r: any) => !r.genre_ids?.includes(16)).map((r: any) => mapTmdb("serie", r)),
      next: page < Math.min(ds.total_pages, 500) ? page + 1 : null,
    };
  }
  params["with_genres"] = g?.genre ? `16,${g.genre}` : "16";
  if (g?.keyword) params["with_keywords"] = String(g.keyword);
  params["with_origin_country"] = WEST_ORIGINS;
  params["without_genres"] = f.family ? "10762,80,9648" : "10762"; // pas de contenu préscolaire ; mode famille : sans crime/mystère
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

export async function fetchRandom(kind: Kind, genre: string | null, lang: string, f: Filters = {}): Promise<Item | null> {
  const first = await fetchCatalog(kind, genre, 1, lang, f);
  if (!first.items.length) return null;
  const maxPage = first.next ? 5 : 1;
  const page = 1 + Math.floor(Math.random() * maxPage);
  const p = page === 1 ? first : await fetchCatalog(kind, genre, page, lang, f).catch(() => first);
  const pool = p.items.length ? p.items : first.items;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export async function fetchRow(kind: Kind, lang: string): Promise<Item[]> {
  return (await fetchCatalog(kind, null, 1, lang)).items.slice(0, 18);
}

// ---------- Detail ----------
export type Detail = Item & {
  genres: string[];
  runtime: string | null;
  runtimeMin: number | null;
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
      runtimeMin: m.episodes && m.duration ? m.episodes * m.duration : (m.duration ?? null),
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
    kind === "film" ? !r.genre_ids?.includes(16) || d.genres?.some((g: any) => g.id === 16) : kind === "serie" ? !r.genre_ids?.includes(16) || d.genres?.some((g: any) => g.id === 16) : r.genre_ids?.includes(16) && !(r.origin_country ?? []).includes("JP"),
  );
  const seen = new Set<number>();
  return {
    ...mapTmdb(kind, d),
    genres: (d.genres ?? []).map((g: any) => g.name),
    runtime: d.runtime ? `${Math.floor(d.runtime / 60)}h${String(d.runtime % 60).padStart(2, "0")}` : d.number_of_seasons ? `${d.number_of_seasons} saison(s) · ${d.number_of_episodes} épisodes` : null,
    runtimeMin: d.runtime ?? (d.number_of_episodes ? (d.episode_run_time?.[0] ?? 24) * d.number_of_episodes : null),
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

// ---------- Connexions (constellation) ----------
export type Connection = { item: Item; group: "director" | "studio" | "franchise" | "univers" | "similaire"; label: string };

const REL_FR: Record<string, string> = {
  SEQUEL: "Suite", PREQUEL: "Préquelle", SIDE_STORY: "Histoire parallèle", SPIN_OFF: "Spin-off",
  PARENT: "Œuvre mère", ALTERNATIVE: "Version alternative", SUMMARY: "Résumé", CHARACTER: "Mêmes personnages", OTHER: "Même univers",
};

export async function fetchConnections(kind: Kind, id: string, lang: string): Promise<Connection[]> {
  const out: Connection[] = [];
  const seen = new Set<string>([`${kind}:${id}`]);
  const counts: Record<string, number> = {};
  const add = (item: Item, group: Connection["group"], label: string, max = 5) => {
    const k = `${item.kind}:${item.id}`;
    if (seen.has(k) || !item.poster || (counts[group] ?? 0) >= max) return;
    seen.add(k);
    counts[group] = (counts[group] ?? 0) + 1;
    out.push({ item, group, label });
  };

  if (kind === "manga") {
    const q = `query($id:Int){Media(id:$id,type:ANIME){studios(isMain:true){nodes{id name}} relations{edges{relationType node{${MEDIA_FIELDS} type countryOfOrigin}}}}}`;
    const { Media: m } = await anilist(q, { id: Number(id) });
    for (const e of m.relations?.edges ?? []) {
      if (e.node?.type === "ANIME") add(mapAni(e.node), "univers", REL_FR[e.relationType] ?? "Même univers", 6);
    }
    const studio = m.studios?.nodes?.[0];
    if (studio) {
      const s = await anilist(`query($id:Int){Studio(id:$id){media(perPage:12,sort:POPULARITY_DESC){nodes{${MEDIA_FIELDS} type countryOfOrigin}}}}`, { id: studio.id }).catch(() => null);
      for (const n of s?.Studio?.media?.nodes ?? []) if (n.type === "ANIME" && n.countryOfOrigin === "JP") add(mapAni(n), "studio", studio.name, 6);
    }
    return out;
  }

  const t = kind === "film" ? "movie" : "tv";
  const d = await tmdb(`/${t}/${id}`, { language: lang, append_to_response: "credits,recommendations" });
  const isAnim = d.genres?.some((g: any) => g.id === 16);
  const okKind = (r: any) =>
    kind === "film" || kind === "serie" ? !r.genre_ids?.includes(16) || isAnim : r.genre_ids?.includes(16) && !(r.origin_country ?? []).includes("JP");
  const tasks: Promise<void>[] = [];

  const director = kind === "film" ? d.credits?.crew?.find((c: any) => c.job === "Director") : d.created_by?.[0];
  if (director?.id) {
    tasks.push(
      tmdb(`/person/${director.id}/${t}_credits`, { language: lang }).then((r) => {
        const list = (r.crew ?? []).filter((c: any) => t === "tv" || c.job === "Director").sort((a: any, b: any) => (b.popularity ?? 0) - (a.popularity ?? 0));
        for (const x of list) if (okKind(x)) add(mapTmdb(kind, x), "director", director.name);
      }),
    );
  }
  if (kind === "film" && d.belongs_to_collection?.id) {
    tasks.push(
      tmdb(`/collection/${d.belongs_to_collection.id}`, { language: lang }).then((r) => {
        for (const x of r.parts ?? []) add(mapTmdb(kind, x), "franchise", r.name ?? "Saga", 6);
      }),
    );
  }
  const company = (d.production_companies ?? []).find((c: any) => c.id);
  if (company) {
    const params: Record<string, string> = { language: lang, with_companies: String(company.id), sort_by: "popularity.desc", include_adult: "false" };
    if (kind === "occidental") params["with_genres"] = "16";
    tasks.push(
      tmdb(`/discover/${t}`, params).then((r) => {
        for (const x of r.results ?? []) if (okKind(x)) add(mapTmdb(kind, x), "studio", company.name);
      }),
    );
  }
  await Promise.allSettled(tasks);
  for (const x of d.recommendations?.results ?? []) if (okKind(x)) add(mapTmdb(kind, x), "similaire", "Dans le même esprit", 4);
  return out;
}


// ---------- Recherche de personnes ----------
export type Person = { id: string; name: string; photo: string | null; known: string };
export async function searchPeople(q: string, lang: string): Promise<Person[]> {
  const d = await tmdb("/search/person", { query: q, language: lang, include_adult: "false" });
  return (d.results ?? [])
    .filter((p: any) => p.profile_path)
    .slice(0, 4)
    .map((p: any) => ({
      id: String(p.id),
      name: p.name,
      photo: `${IMG}w185${p.profile_path}`,
      known: p.known_for_department === "Directing" ? "Réalisation" : p.known_for_department === "Acting" ? "Acteur·rice" : (p.known_for_department ?? ""),
    }));
}

export type PersonDetail = { id: string; name: string; photo: string | null; bio: string; birthday: string | null; place: string | null; works: Item[] };
export async function fetchPerson(id: string, lang: string): Promise<PersonDetail> {
  const d = await tmdb(`/person/${id}`, { language: lang, append_to_response: "combined_credits" });
  const raw = [
    ...(d.combined_credits?.cast ?? []),
    ...(d.combined_credits?.crew ?? []).filter((c: any) => c.job === "Director" || c.job === "Creator"),
  ];
  const seen = new Set<string>();
  const works: Item[] = [];
  for (const x of raw.sort((a: any, b: any) => (b.popularity ?? 0) - (a.popularity ?? 0))) {
    if (!x.poster_path) continue;
    let kind: Kind | null = null;
    if (x.media_type === "movie" && !x.genre_ids?.includes(16)) kind = "film";
    else if (x.media_type === "tv" && x.genre_ids?.includes(16) && !(x.origin_country ?? []).includes("JP")) kind = "occidental";
    else if (x.media_type === "tv" && !x.genre_ids?.includes(16)) kind = "serie";
    if (!kind) continue;
    const k = `${kind}:${x.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    works.push(mapTmdb(kind, x));
    if (works.length >= 36) break;
  }
  return {
    id: String(d.id), name: d.name, photo: d.profile_path ? `${IMG}w342${d.profile_path}` : null,
    bio: d.biography ?? "", birthday: d.birthday ?? null, place: d.place_of_birth ?? null, works,
  };
}

// ---------- « Que regarder ce soir ? » ----------
export type Mood = "rire" | "frissons" | "emotion" | "action" | "reve";
export type Tonight = { mood: Mood; kind: Kind; short: boolean; family: boolean };
export async function fetchTonight(t: Tonight, lang: string): Promise<Item[]> {
  const page = 1 + Math.floor(Math.random() * 3);
  if (t.kind === "manga") {
    const g = { rire: "Comedy", frissons: "Horror", emotion: "Drama", action: "Action", reve: "Fantasy" }[t.mood];
    const d = await anilist(ANI_PAGE, { page, genre: g, sort: ["POPULARITY_DESC"], score: 69 });
    return d.Page.media.map(mapAni);
  }
  const params: Record<string, string> = { language: lang, page: String(page), sort_by: "popularity.desc", include_adult: "false", "vote_average.gte": "6.5", "vote_count.gte": "200" };
  if (t.kind === "film") {
    params["with_genres"] = { rire: "35", frissons: "27|53", emotion: "18|10749", action: "28|12", reve: "14|878" }[t.mood];
    params["without_genres"] = t.family ? "16,27,53,80" : "16";
    if (t.short) { params["with_runtime.lte"] = "105"; params["with_runtime.gte"] = "60"; }
    const d = await tmdb("/discover/movie", params);
    return (d.results ?? []).map((x: any) => mapTmdb("film", x));
  }
  const g = { rire: "35", frissons: "9648", emotion: "18", action: "10759", reve: "10765" }[t.mood];
  if (t.kind === "serie") {
    params["with_genres"] = g;
    params["without_genres"] = t.family ? "16,10762,80,9648" : "16,10762";
    const ds = await tmdb("/discover/tv", params);
    return (ds.results ?? []).filter((x: any) => !x.genre_ids?.includes(16)).map((x: any) => mapTmdb("serie", x));
  }
  params["with_genres"] = `16,${g}`;
  if (t.family) params["without_genres"] = "10768";
  const d = await tmdb("/discover/tv", params);
  return (d.results ?? []).filter((x: any) => !(x.origin_country ?? []).includes("JP")).map((x: any) => mapTmdb("occidental", x));
}

// ---------- Calendrier ----------
export async function fetchReleases(lang: string): Promise<Item[]> {
  const from = new Date();
  const to = new Date(Date.now() + 75 * 864e5);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const pages = await Promise.all([1, 2].map((page) =>
    tmdb("/discover/movie", {
      language: lang, page: String(page), region: "FR", with_release_type: "2|3", sort_by: "popularity.desc", include_adult: "false",
      "primary_release_date.gte": iso(from), "primary_release_date.lte": iso(to),
    }).catch(() => ({ results: [] })),
  ));
  const seen = new Set<string>();
  return pages
    .flatMap((p) => p.results ?? [])
    .filter((x: any) => x.poster_path && x.release_date && !seen.has(x.id) && seen.add(x.id))
    .map((x: any) => mapTmdb("film", x))
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}

export type Airing = { at: number; episode: number; item: Item };
export async function fetchAiring(): Promise<Airing[]> {
  const from = Math.floor(Date.now() / 1000);
  const to = from + 7 * 86400;
  const q = `query($from:Int,$to:Int,$page:Int){Page(page:$page,perPage:50){airingSchedules(airingAt_greater:$from,airingAt_lesser:$to,sort:TIME){airingAt episode media{${MEDIA_FIELDS} popularity countryOfOrigin isAdult}}}}`;
  const pages = await Promise.all([1, 2, 3].map((page) => anilist(q, { from, to, page }).catch(() => null)));
  const seen = new Set<string>();
  const out: Airing[] = [];
  for (const p of pages) {
    for (const s of p?.Page?.airingSchedules ?? []) {
      const m = s.media;
      if (!m || m.isAdult || m.countryOfOrigin !== "JP" || (m.popularity ?? 0) < 6000) continue;
      const k = `${m.id}:${s.episode}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ at: s.airingAt, episode: s.episode, item: mapAni(m) });
    }
  }
  return out.sort((a, b) => a.at - b.at);
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
    {
      out.push(...tv.value.results.filter((r: any) => r.genre_ids?.includes(16) && !(r.origin_country ?? []).includes("JP")).slice(0, 4).map((r: any) => mapTmdb("occidental", r)));
      out.push(...tv.value.results.filter((r: any) => !r.genre_ids?.includes(16)).slice(0, 4).map((r: any) => mapTmdb("serie", r)));
    }
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
