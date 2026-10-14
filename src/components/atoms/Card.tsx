import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { surface } from "../tokens";

const PADDING = { none: "", sm: "p-4", md: "p-5" } as const;

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article" | "aside";
  padding?: keyof typeof PADDING;
  tone?: "milk" | "tint";
  children?: ReactNode;
}

// The admin's card. `tint` is the soft box that sits inside a card.
export default function Card({ as: Tag = "div", padding = "md", tone = "milk", className, children, ...rest }: CardProps) {
  return (
    <Tag className={clsx(tone === "milk" ? surface.card : surface.tint, PADDING[padding], className)} {...rest}>
      {children}
    </Tag>
  );
}
