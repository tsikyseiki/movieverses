// Préférences de confidentialité (stockées sur l'appareil). Les annonces restent « non personnalisées » tant que l'accord n'est pas donné.
export type Consent = { decided: boolean; ads: boolean; at: number };
const KEY = "mv:consent";

export const readConsent = (): Consent => {
  try { return { decided: false, ads: false, at: 0, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Consent>) }; } catch { return { decided: false, ads: false, at: 0 }; }
};

export function writeConsent(ads: boolean) {
  const c: Consent = { decided: true, ads, at: Date.now() };
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* stockage indisponible */ }
  const w = window as Window & { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };
  w.adsbygoogle = w.adsbygoogle ?? [];
  w.adsbygoogle.requestNonPersonalizedAds = ads ? 0 : 1;
  window.dispatchEvent(new Event("mv:consent"));
  return c;
}
