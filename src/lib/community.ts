import { supabase } from "@/integrations/supabase/client";
import type { Kind } from "./catalog";

export type Post = {
  id: string;
  kind: string;
  item_id: string;
  title: string;
  poster: string | null;
  rating: number | null;
  user_rating: number | null;
  author: string;
  body: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
};
export type Comment = { id: string; post_id: string; author: string; body: string; created_at: string };

export function deviceId() {
  let id = localStorage.getItem("mv:device");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("mv:device", id);
  }
  return id;
}
export const getPseudo = () => localStorage.getItem("mv:pseudo") ?? "";
export const setPseudo = (p: string) => localStorage.setItem("mv:pseudo", p);
export function likedPosts(): string[] {
  try { return JSON.parse(localStorage.getItem("mv:liked") ?? "[]"); } catch { return []; }
}
function setLiked(ids: string[]) { localStorage.setItem("mv:liked", JSON.stringify(ids)); }

export function registerVisitOnce() {
  if (sessionStorage.getItem("mv:visited")) return;
  sessionStorage.setItem("mv:visited", "1");
  supabase.rpc("register_visit").then(() => {});
}

export async function fetchVisits() {
  const { data, error } = await supabase.from("site_stats").select("visits").eq("id", 1).single();
  if (error) throw error;
  return Number(data.visits);
}

export async function fetchPosts() {
  const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return data as Post[];
}
export async function fetchComments(postId: string) {
  const { data, error } = await supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at");
  if (error) throw error;
  return data as Comment[];
}
export async function createPost(p: { kind: Kind; item_id: string; title: string; poster: string | null; rating: number | null; user_rating: number | null; author: string; body: string }) {
  const { error } = await supabase.from("posts").insert(p);
  if (error) throw error;
}
export async function addComment(post_id: string, author: string, body: string) {
  const { error } = await supabase.from("post_comments").insert({ post_id, author, body });
  if (error) throw error;
}
export async function toggleLike(postId: string) {
  const { data, error } = await supabase.rpc("toggle_like", { _post: postId, _device: deviceId() });
  if (error) throw error;
  const l = likedPosts();
  setLiked(l.includes(postId) ? l.filter((x) => x !== postId) : [...l, postId]);
  return data as number;
}

export async function shareItem(opts: { title: string; rating: number | null | undefined; poster: string | null | undefined; url: string }) {
  const text = `${opts.title}${opts.rating != null ? ` — ★ ${opts.rating.toFixed(1)}/10` : ""} sur MovieVerse`;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share) {
    let files: File[] | undefined;
    if (opts.poster) {
      try {
        const blob = await fetch(opts.poster).then((r) => r.blob());
        const f = new File([blob], "affiche.jpg", { type: blob.type || "image/jpeg" });
        if (nav.canShare?.({ files: [f] })) files = [f];
      } catch { /* affiche non partageable */ }
    }
    try {
      await nav.share(files ? { title: opts.title, text: `${text}\n${opts.url}`, url: opts.url, files } : { title: opts.title, text, url: opts.url });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancel";
    }
  }
  await navigator.clipboard.writeText(`${text}\n${opts.url}`);
  return "copied";
}
