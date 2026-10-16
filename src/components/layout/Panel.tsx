import type { ElementType, ReactNode } from "react";
import clsx from "clsx";

interface PanelProps {
  title?: string;
  children: ReactNode;
  as?: ElementType;
  className?: string;
}

// Outlined surface used for grouped content: forms, details, schedules.
export default function Panel({ title, children, as: Tag = "section", className }: PanelProps) {
  return (
    <Tag
      className={clsx(
        "flex flex-col gap-3",
        "rounded-sm border border-crimson-light/80 bg-light-orange shadow-xl shadow-crimson/10 p-6 md:p-9",
        className,
      )}
    >
      {title && (
        <h2 className="font-display font-normal not-italic uppercase tracking-widest text-gray-red text-xl md:text-2xl">
          {title}
        </h2>
      )}
      {children}
    </Tag>
  );
}
