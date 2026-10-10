import type { ReactNode } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import Button from "./Button";

interface ChoiceRowProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  /** Shown at the right end of the row, for example a price */
  trailing?: ReactNode;
  /** radio: pick one of several. checkbox: tick to agree. */
  kind?: "radio" | "checkbox";
}

// Row used for choices: a radio for picking one option, a checkbox for ticking an agreement.
export default function ChoiceRow({ selected, onClick, children, className, kind = "radio", trailing }: ChoiceRowProps) {
  return (
    <Button
      variant="bare"
      type="button"
      role={kind}
      aria-checked={selected}
      onClick={onClick}
      className={clsx(
        "flex w-full cursor-pointer items-start justify-start gap-4 rounded-sm border bg-light-orange px-4 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson",
        selected ? "border-crimson ring-2 ring-crimson/20" : "border-crimson-light hover:border-crimson",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "flex h-5 w-5 shrink-0 items-center justify-center border-2",
          kind === "radio" ? "rounded-full" : "rounded-sm",
          kind === "checkbox" && selected ? "border-crimson bg-crimson" : selected ? "border-crimson" : "border-crimson-light",
        )}
      >
        {selected && kind === "radio" && <span className="h-2.5 w-2.5 rounded-full bg-crimson" />}
        {selected && kind === "checkbox" && <Check size={14} strokeWidth={3} className="text-light-orange" />}
      </span>
      <span className="flex-1 text-gray-red">{children}</span>
      {trailing && <span className="shrink-0 text-gray-red">{trailing}</span>}
    </Button>
  );
}
