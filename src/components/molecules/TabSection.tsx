import type { ReactNode } from "react";

// A titled block inside a tab panel, divided from the next by a line
export default function TabSection({ title, description, aside, children }: { title: string; description?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 border-b border-crimson-light/40 pb-6 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-normal text-gray-red">{title}</h2>
          {description && <p className="text-[13px] text-gray-red">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
