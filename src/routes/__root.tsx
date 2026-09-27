import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider } from "@/lib/store";
import { Header } from "@/components/mv/Header";
import { Toaster } from "@/components/ui/sonner";

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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
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
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap" },
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [persister] = useState(() =>
    typeof window !== "undefined" ? createSyncStoragePersister({ storage: window.localStorage, key: "mv:cache" }) : undefined,
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    registerVisitOnce();
    const inIframe = window.self !== window.top;
    if ("serviceWorker" in navigator && !inIframe && import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  const content = (
    <StoreProvider>
      <Header />
      <main className="min-h-screen">
        {mounted ? <Outlet /> : <div className="h-[82vh] animate-pulse bg-muted" />}
      </main>
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        MovieVerse · Données TMDB, AniList & MangaDex
      </footer>
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
