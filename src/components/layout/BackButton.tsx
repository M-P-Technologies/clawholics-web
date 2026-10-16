import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";
import clsx from "clsx";
import { useNavigate } from "@/lib/router";
import { Button } from "@/components/atoms";

interface BackButtonProps {
  label?: string;
  /** Go to a fixed route instead of the previous history entry. */
  to?: string;
}

// Where the phone top bar keeps the back button, on the right of the logo (see NavBar)
export const BACK_SLOT_ID = "mobile-back-slot";

export default function BackButton({ label = "Back", to }: BackButtonProps) {
  const navigate = useNavigate();
  // The slot exists only on pages under the site's top bar; elsewhere the button stays inline
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById(BACK_SLOT_ID));
  }, []);

  const button = (className?: string) => (
    <Button
      variant="bare"
      type="button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className={clsx(
        "inline-flex w-fit items-center gap-3 text-base font-semibold text-gray-red transition-colors hover:text-crimson-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-crimson",
        className,
      )}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {label}
    </Button>
  );

  // Below `lg` the top bar holds the button, level with the logo; from `lg` up it stays in the page
  if (slot) {
    return (
      <>
        <span className="hidden lg:inline-flex">{button()}</span>
        {createPortal(button(), slot)}
      </>
    );
  }

  return button();
}
