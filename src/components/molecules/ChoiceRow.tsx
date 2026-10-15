import type { ReactNode } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { Button } from "@/components/atoms";

interface ChoiceRowProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  /** Shown at the right end of the row, for example a price */
  trailing?: ReactNode;
  /** radio: pick one of several. checkbox: tick to agree. */
  kind?: "radio" | "checkbox";
  /** Where the radio sits against the content: at the top (default, for text that wraps) or centred */
  align?: "start" | "center";
}

// Row used for choices: a radio for picking one option, a checkbox for ticking an agreement.
export default function ChoiceRow({ selected, onClick, children, className, kind = "radio", trailing, align = "start" }: ChoiceRowProps) {
  return (
    <Button
      variant="bare"
      type="button"
      role={kind}
      aria-checked={selected}
      onClick={onClick}
      className={clsx(
        "flex w-full cursor-pointer justify-start gap-3 whitespace-normal rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson",
        align === "center" ? "items-center" : "items-start",
        selected ? "border-crimson bg-crimson-light/15" : "border-crimson-light bg-milk hover:border-crimson",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "flex h-5 w-5 shrink-0 items-center justify-center border-2",
          kind === "radio" ? "rounded-full" : "rounded-md",
          kind === "checkbox" && selected ? "border-crimson bg-crimson" : selected ? "border-crimson" : "border-crimson-light",
        )}
      >
        {selected && kind === "radio" && <span className="h-2.5 w-2.5 rounded-full bg-crimson" />}
        {selected && kind === "checkbox" && <Check size={14} strokeWidth={3} className="text-milk" />}
      </span>
      <span className="min-w-0 flex-1 text-gray-red">{children}</span>
      {trailing && <span className="shrink-0 text-gray-red">{trailing}</span>}
    </Button>
  );
}
