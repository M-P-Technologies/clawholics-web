import type { ElementType, ReactNode } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { surface } from "../tokens";

interface PanelProps {
  title?: string;
  children: ReactNode;
  as?: ElementType;
  className?: string;
}

// The admin's card shape, in the site's cream, for grouped content: forms, details, schedules.
export default function Panel({ title, children, as: Tag = "section", className }: PanelProps) {
  return (
    <Tag
      className={twMerge(clsx(
        "flex flex-col gap-3",
        // The admin's card shape and shadow, in the site's cream
        surface.card,
        "bg-light-orange p-6 md:p-9",
        className,
      ))}
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
