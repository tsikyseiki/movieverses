import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Activité globale, anonyme et en direct : aucune identité n'est envoyée, seulement le titre consulté.
export type Watching = { kind: string; id: string; title: string; poster: string | null };
export type LiveEntry = Watching & { count: number };

let channel: RealtimeChannel | null = null;
let ready = false;
let current: Watching | null = null;
let entries: LiveEntry[] = [];
const subs = new Set<(e: LiveEntry[]) => void>();

function anonKey() {
  let id = sessionStorage.getItem("mv:anon");
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("mv:anon", id); }
  return id;
}

function ensure() {
  if (channel) return;
  const ch = supabase.channel("mv-now-watching", { config: { presence: { key: anonKey() } } });
  channel = ch;
  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState() as unknown as Record<string, Watching[]>;
    const map = new Map<string, LiveEntry>();
    for (const metas of Object.values(state)) {
      for (const m of metas) {
        if (!m?.id) continue;
        const k = `${m.kind}:${m.id}`;
        const e = map.get(k);
        if (e) e.count++;
        else map.set(k, { kind: m.kind, id: m.id, title: m.title, poster: m.poster, count: 1 });
      }
    }
    entries = [...map.values()].sort((a, b) => b.count - a.count).slice(0, 12);
    subs.forEach((f) => f(entries));
  });
  ch.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      ready = true;
      if (current) await ch.track(current);
    }
  });
}

export function subscribeLive(cb: (e: LiveEntry[]) => void) {
  ensure();
  subs.add(cb);
  cb(entries);
  return () => { subs.delete(cb); };
}

export function announceWatching(w: Watching | null) {
  ensure();
  current = w;
  if (!ready || !channel) return;
  if (w) void channel.track(w);
  else void channel.untrack();
}
