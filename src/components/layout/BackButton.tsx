import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@/lib/router";
import Button from "../ui/Button";

interface BackButtonProps {
  label?: string;
  /** Go to a fixed route instead of the previous history entry. */
  to?: string;
}

export default function BackButton({ label = "Back", to }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <Button
      variant="bare"
      type="button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className="inline-flex w-fit items-center gap-2 text-sm font-bold uppercase tracking-extrawide text-gray-red transition-colors hover:text-crimson focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-crimson"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {label}
    </Button>
  );
}
