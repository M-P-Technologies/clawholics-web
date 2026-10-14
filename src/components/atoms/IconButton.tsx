import type { LucideIcon } from "lucide-react";
import clsx from "clsx";
import Button from "./Button";

const TONE = {
  plain: "text-gray-red/70 hover:bg-crimson-light/30 hover:text-berry",
  milk: "bg-milk text-gray-red shadow-petal hover:text-crimson",
  brand: "bg-crimson text-milk hover:bg-crimson/85",
} as const;
const SIZE = { sm: "h-8 w-8", md: "h-10 w-10" } as const;

interface IconButtonProps {
  /** What it does, for screen readers and as a tooltip */
  label: string;
  icon: LucideIcon;
  size?: keyof typeof SIZE;
  tone?: keyof typeof TONE;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}

// A round button with only an icon. It always has a name.
export default function IconButton({ label, icon: Icon, size = "md", tone = "plain", onClick, disabled, type = "button", className }: IconButtonProps) {
  return (
    <Button
      variant="bare"
      type={type}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={clsx("flex shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40", SIZE[size], TONE[tone], className)}
    >
      <Icon size={size === "sm" ? 16 : 18} aria-hidden="true" />
    </Button>
  );
}
