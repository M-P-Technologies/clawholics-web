"use client";

import type { ReactNode } from "react";
import { Blush, Button, LoadingBar, Pearls, Select, StarPicker, Stars } from "../components/atoms";
import AdminShell from "../components/admin/AdminShell";

// Every shared component and its variants, for checking the look. Admins only; not in the sidebar.
export default function DesignSystem() {
  return (
    <AdminShell title="Design system">
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pb-10">
        <Group title="Atoms">
          <GallerySection title="Button">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="bare">Bare</Button>
            <Button disabled>Disabled</Button>
            <Button loading loadingText="Saving...">Save</Button>
          </GallerySection>
          <GallerySection title="Select">
            <Select aria-label="Example" value="a" onChange={() => {}}>
              <option value="a">Option A</option>
              <option value="b">Option B</option>
            </Select>
          </GallerySection>
          <GallerySection title="LoadingBar"><LoadingBar inline label="Loading" /></GallerySection>
          <GallerySection title="Blush"><div className="relative h-20 w-40 overflow-hidden rounded-xl"><Blush className="left-0 top-0 h-20 w-20" /></div></GallerySection>
          <GallerySection title="StarRating">
            <Stars rating={4} />
            <StarPicker value={3} onChange={() => {}} />
          </GallerySection>
          <GallerySection title="Pearls"><Pearls className="w-40" /></GallerySection>
        </Group>
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
