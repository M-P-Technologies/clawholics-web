import type { ReactNode } from "react";

/** One level of the library (Atoms, Molecules, Organisms), its components in two columns */
export function Group({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section aria-labelledby={`ds-${title}`} className="flex flex-col gap-3">
      <h2 id={`ds-${title}`} className="font-display text-2xl font-normal normal-case tracking-normal text-gray-red">{title}</h2>
      <div className="grid gap-3 xl:grid-cols-2">{children}</div>
    </section>
  );
}

/** One component's card, with its variants side by side */
export function GallerySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`ds-${title}`} className="flex flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk p-6 shadow-petal">
      <h3 id={`ds-${title}`} className="text-[13px] font-bold uppercase tracking-wide text-gray-red">{title}</h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}
