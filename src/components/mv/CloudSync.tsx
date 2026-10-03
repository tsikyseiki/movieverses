import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cloud, isMissingTable } from "@/lib/cloud";
import { useStore } from "@/lib/store";
import { computeStats, trophies } from "@/lib/insights";

// Synchronise favoris, notes et journal avec le compte. Hors connexion, les changements restent
// enregistrés sur l'appareil (marqués « à envoyer ») et partent automatiquement au retour du réseau.
const META = "mv:sync";
type Meta = { lastSync: number; dirty: boolean };
const readMeta = (): Meta => {
  try { return { lastSync: 0, dirty: false, ...(JSON.parse(localStorage.getItem(META) ?? "{}") as Partial<Meta>) }; } catch { return { lastSync: 0, dirty: false }; }
};
const writeMeta = (m: Meta) => { try { localStorage.setItem(META, JSON.stringify(m)); } catch { /* stockage indisponible */ } };

export function CloudSync() {
  const { ready, favorites, ratings, ratingMeta, watched, applyCloud } = useStore();
  const snap = useRef({ favorites, ratings, ratingMeta, watched });
  snap.current = { favorites, ratings, ratingMeta, watched };
  const uid = useRef<string | null>(null);
  const disabled = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const suppress = useRef(false);
  const initHash = useRef<string | null>(null);

  const push = async () => {
    if (!uid.current || disabled.current || !navigator.onLine) return;
    const s = snap.current;
    const now = new Date().toISOString();
    const { error } = await cloud.from("user_data").upsert({ user_id: uid.current, data: s, updated_at: now });
    if (error) { if (isMissingTable(error)) disabled.current = true; return; }
    writeMeta({ lastSync: Date.parse(now), dirty: false });
    const st = computeStats(s.watched, s.ratings, s.ratingMeta);
    const rc = Object.keys(s.ratings).length;
    const tr = trophies(st, rc, s.favorites.length).filter((t) => t.value >= t.goal).length;
    await cloud.from("user_stats").upsert({
      user_id: uid.current, watched_count: st.total, ratings_count: rc, trophies_count: tr,
      points: st.total * 10 + rc * 3 + tr * 50 + s.favorites.length, updated_at: now,
    });
  };

  // 1) Au démarrage : récupérer / envoyer
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      uid.current = s.session?.user.id ?? null;
      if (!uid.current || !navigator.onLine) return;
      const { data: row, error } = await cloud.from("user_data").select("data,updated_at").eq("user_id", uid.current).maybeSingle();
      if (!alive) return;
      if (error) { if (isMissingTable(error)) disabled.current = true; return; }
      const meta = readMeta();
      const l = snap.current;
      const localEmpty = !l.favorites.length && !Object.keys(l.ratings).length && !l.watched.length;
      if (!row) { if (!localEmpty) await push(); return; }
      if (meta.dirty && meta.lastSync > 0) { await push(); return; } // ce qui a été fait ici gagne
      if (meta.lastSync === 0 && !localEmpty) { applyCloud(row.data ?? {}, "union"); window.setTimeout(push, 1500); return; } // première synchro : on fusionne
      if (Date.parse(row.updated_at) > meta.lastSync) {
        suppress.current = true;
        applyCloud(row.data ?? {}, "replace");
        writeMeta({ lastSync: Date.now(), dirty: false });
      }
    })();
    return () => { alive = false; };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2) À chaque changement local : marquer « à envoyer » puis envoyer (différé)
  const hash = JSON.stringify([favorites.map((f) => `${f.kind}:${f.id}`), ratings, watched.map((w) => [w.kind, w.id, w.at])]);
  useEffect(() => {
    if (!ready) return;
    if (initHash.current === null) { initHash.current = hash; return; }
    if (hash === initHash.current) return;
    initHash.current = hash;
    if (suppress.current) { suppress.current = false; return; }
    writeMeta({ ...readMeta(), dirty: true });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(push, 3000);
  }, [hash, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3) Retour du réseau
  useEffect(() => {
    const on = () => { if (readMeta().dirty) void push(); };
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
