"use client";

import type { ReactNode } from "react";
import AdminShell from "../components/admin/AdminShell";

// Every shared component and its variants, for checking the look. Admins only; not in the sidebar.
export default function DesignSystem() {
  return (
    <AdminShell title="Design system">
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pb-10">
        <Group title="Atoms">{/* Task 2+ add sections here */}</Group>
        <Group title="Molecules">{/* Task 6+ */}</Group>
        <Group title="Organisms">{/* Task 11+ */}</Group>
      </div>
    </AdminShell>
  );
}

function Group({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section aria-labelledby={`ds-${title}`} className="flex flex-col gap-4">
      <h2 id={`ds-${title}`} className="font-display text-2xl font-normal normal-case tracking-normal text-gray-red">{title}</h2>
      <div className="grid gap-4 xl:grid-cols-2">{children}</div>
    </section>
  );
}

export function GallerySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`ds-${title}`} className="flex flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk p-5 shadow-petal">
      <h3 id={`ds-${title}`} className="text-[13px] font-bold uppercase tracking-wide text-gray-red/70">{title}</h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}
