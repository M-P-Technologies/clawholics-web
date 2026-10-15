import clsx from "clsx";

interface BlushProps {
  /** Position and size, e.g. "-left-24 top-10 h-80 w-80". */
  className?: string;
  tone?: "crimson" | "crimson-light";
}

// A soft blurred glow of brand colour. Purely decorative: drop it inside any
// `relative` parent and place it with utility classes.
export default function Blush({ className, tone = "crimson-light" }: BlushProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "pointer-events-none absolute -z-10 rounded-full blur-3xl",
        tone === "crimson" ? "bg-crimson/25" : "bg-crimson-light/70",
        className,
      )}
    />
  );
}
