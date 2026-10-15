import type { ReactNode } from "react";
import clsx from "clsx";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const TONE: Record<BadgeTone, string> = {
  success: "bg-success/20 text-gray-red",
  warning: "bg-sand text-gray-red",
  danger: "bg-danger/15 text-gray-red",
  info: "bg-info/15 text-gray-red",
  neutral: "bg-crimson-light/40 text-gray-red",
  brand: "bg-crimson-light/50 text-berry",
};

const DOT: Record<BadgeTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-gray-red/50",
  brand: "bg-crimson-light",
};

interface BadgeProps {
  tone?: BadgeTone;
  /** A colored dot before the words */
  dot?: BadgeTone;
  caps?: boolean;
  className?: string;
  children: ReactNode;
}

// A small rounded label, e.g. an appointment's status. The words carry the meaning; color only helps.
export default function Badge({ tone = "neutral", dot, caps = false, className, children }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-0.5 font-bold",
        caps ? "text-[11px] uppercase" : "text-[12px]",
        TONE[tone],
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={clsx("h-2 w-2 rounded-full", DOT[dot])} />}
      {children}
    </span>
  );
}
