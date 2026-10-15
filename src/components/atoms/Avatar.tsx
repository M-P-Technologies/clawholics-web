import clsx from "clsx";

const SIZE = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-lg",
  xl: "h-16 w-16 text-2xl",
  hero: "aspect-square h-24 w-24 text-3xl shadow-petal ring-4 ring-milk",
} as const;

/** "Ana Maria Cruz" → "AM" */
export const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

interface AvatarProps {
  name: string;
  /** A photo; empty shows the initials */
  imageUrl?: string;
  size?: keyof typeof SIZE;
  /** Keep the top of the photo (portraits) */
  cropTop?: boolean;
  /** Beside the person's name already: hidden from screen readers */
  decorative?: boolean;
  className?: string;
}

// A person's photo, or their initials in a soft circle. Always named unless decorative.
export default function Avatar({ name, imageUrl = "", size = "md", cropTop = false, decorative = false, className }: AvatarProps) {
  const label = name.trim() || "Unknown";
  const a11y = decorative ? { "aria-hidden": true as const } : { role: "img", "aria-label": label, title: label };

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- photos from Clerk and R2, sized by CSS
      <img
        src={imageUrl}
        alt={decorative ? "" : label}
        title={decorative ? undefined : label}
        aria-hidden={decorative || undefined}
        className={clsx("shrink-0 rounded-full border border-crimson-light object-cover", cropTop && "object-top", SIZE[size], className)}
      />
    );
  }
  return (
    <span {...a11y} className={clsx("flex shrink-0 items-center justify-center rounded-full bg-crimson-light/50 font-display text-berry", SIZE[size], className)}>
      {initialsOf(name) || "?"}
    </span>
  );
}
