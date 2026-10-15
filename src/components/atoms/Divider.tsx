import clsx from "clsx";

// A quiet line between groups inside a card
export default function Divider({ className }: { className?: string }) {
  return <hr className={clsx("border-0 border-t border-crimson-light/50", className)} />;
}
