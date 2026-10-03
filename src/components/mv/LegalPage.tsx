import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-36 lg:pt-28">
      <h1 className="text-4xl font-extrabold md:text-5xl">{title}</h1>
      {updated && <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : {updated}</p>}
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-muted-foreground [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:text-primary [&_a]:underline">{children}</div>
    </div>
  );
}
