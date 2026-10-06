import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { Outlet, Link, createRootRouteWithContext, useRouter, useNavigate, useRouterState, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider } from "@/lib/store";
import { registerVisitOnce } from "@/lib/community";
import { Header } from "@/components/mv/Header";
import { Toaster } from "@/components/ui/sonner";
import { ConnectionStatus } from "@/components/mv/ConnectionStatus";
import { setupOfflineApp } from "@/lib/pwa";
import { supabase } from "@/integrations/supabase/client";
import { fetchCatalog, fetchFeatured } from "@/lib/catalog";
import { SITE } from "@/lib/site-config";
import { CloudSync } from "@/components/mv/CloudSync";
import { ConsentBanner } from "@/components/mv/ConsentBanner";
import { CommandPalette } from "@/components/mv/CommandPalette";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <div className="mt-6">
          <Link to="/" className="inline-flex rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Cette page n'a pas pu se charger</h1>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Réessayer</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#15141c" },
      { title: "MovieVerse — Films, animés manga et animés occidentaux" },
      { name: "description", content: "Catalogue en temps réel de films, animés japonais et animés occidentaux." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "MovieVerse" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:image", content: "https://movieverses.lovable.app/icon-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://movieverses.lovable.app/icon-512.png" },
      ...(SITE.googleSiteVerification ? [{ name: "google-site-verification", content: SITE.googleSiteVerification }] : []),
    ],
    scripts: SITE.adsenseClient
      ? [
          { children: 'try{var c=JSON.parse(localStorage.getItem("mv:consent")||"{}");(window.adsbygoogle=window.adsbygoogle||[]).requestNonPersonalizedAds=c.ads===true?0:1;}catch(e){}' },
          { src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsenseClient}`, async: true, crossOrigin: "anonymous" as const },
        ]
      : [],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Pages accessibles sans être connecté
const PUBLIC_PATHS = ["/auth", "/reset-password", "/aide", "/developpeurs", "/confidentialite", "/conditions", "/a-propos", "/contact", "/statut"];

type SessionState = "loading" | "in" | "out";

function useSessionState(): SessionState {
  const [state, setState] = useState<SessionState>("loading");
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setState(data.session ? "in" : "out"); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (alive) setState(session ? "in" : "out"); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  return state;
}

function GuestHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-scrim/80 to-transparent">
      <div className="mx-auto flex max-w-[1500px] items-center px-4 py-3 md:px-8">
        <Link to="/auth" className="font-display text-xl font-extrabold tracking-tight">
          Movie<span className="text-primary">Verse</span>
        </Link>
      </div>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [persister] = useState(() =>
    typeof window !== "undefined" ? createSyncStoragePersister({ storage: window.localStorage, key: "mv:cache" }) : undefined,
  );
  const [mounted, setMounted] = useState(false);
  const session = useSessionState();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const isPublic = PUBLIC_PATHS.includes(pathname.replace(/\/+$/, "") || "/");
  const isAuthPage = pathname === "/auth";
  useEffect(() => {
    if (session === "out" && !isPublic) void nav({ to: "/auth", replace: true });
  }, [session, isPublic, nav]);
  const canShow = mounted && (isPublic || session === "in");

  // Précharge les résultats populaires en arrière-plan (sauf mode « économiseur de données »)
  useEffect(() => {
    if (session !== "in") return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    let saver = false;
    try { saver = !!(JSON.parse(localStorage.getItem("mv:settings") ?? "{}") as { dataSaver?: boolean }).dataSaver; } catch { /* ignoré */ }
    if (conn?.saveData || saver) return;
    const run = () => {
      void queryClient.prefetchQuery({ queryKey: ["featured", "fr-FR"], queryFn: () => fetchFeatured("fr-FR"), staleTime: 15 * 60_000 });
      (["film", "manga", "occidental", "serie"] as const).forEach((k) => {
        void queryClient.prefetchInfiniteQuery({
          queryKey: ["catalog", k, null, "fr-FR", "", 0, false],
          queryFn: ({ pageParam }) => fetchCatalog(k, null, pageParam, "fr-FR"),
          initialPageParam: 1,
          pages: 1,
          getNextPageParam: (_l: unknown, all: unknown[]) => all.length + 1,
          staleTime: 10 * 60_000,
        });
      });
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run);
    else setTimeout(run, 1500);
  }, [session, queryClient]);
  useEffect(() => {
    setMounted(true);
    registerVisitOnce();
    setupOfflineApp();
    const back = () => queryClient.refetchQueries({ type: "active" });
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, [queryClient]);
  const content = (
    <StoreProvider>
      {session === "in" && <CloudSync />}
      {session === "in" && <CommandPalette />}
      {session === "in" ? <Header /> : session === "out" && !isAuthPage ? <GuestHeader /> : null}
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Aller au contenu</a>
      <main id="contenu" tabIndex={-1} className="min-h-screen outline-none">
        {canShow ? <Outlet /> : <div className="h-[82vh] animate-pulse bg-muted" />}
      </main>
      {!isAuthPage && <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        <nav className="mb-3 flex flex-wrap justify-center gap-x-5 gap-y-2" aria-label="Pied de page">
          <Link to="/a-propos" className="hover:text-foreground">À propos</Link>
          <Link to="/aide" className="hover:text-foreground">Aide</Link>
          <Link to="/confidentialite" className="hover:text-foreground">Confidentialité</Link>
          <Link to="/conditions" className="hover:text-foreground">Conditions</Link>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
          <Link to="/developpeurs" className="hover:text-foreground">API</Link>
          <Link to="/statut" className="hover:text-foreground">État du système</Link>
        </nav>
        <p>MovieVerse · 100 % gratuit · Données TMDB, AniList & Internet Archive</p>
        <p className="mx-auto mt-1 max-w-xl">Ce produit utilise l'API de TMDB mais n'est ni approuvé ni certifié par TMDB.</p>
      </footer>}
      <ConsentBanner />
      <ConnectionStatus />
      <Toaster />
    </StoreProvider>
  );
  if (!persister) return <QueryClientProviderFallback client={queryClient}>{content}</QueryClientProviderFallback>;
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 7 * 24 * 3600_000, buster: "v1" }}>
      {content}
    </PersistQueryClientProvider>
  );
}

import { QueryClientProvider as QueryClientProviderFallback } from "@tanstack/react-query";
