import type { ReactNode } from "react";

// A titled list of contact links, for use on a dark photo
export default function ContactGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-lg font-normal uppercase tracking-widest text-light-orange">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}
