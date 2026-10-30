import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/router";

// A round icon before the client page's (screen-reader-only) title, like the settings and bell
// buttons; the client's name is in their profile panel. The page's loading, error and loaded states
// all use it, so the top bar doesn't change when the data arrives.
export default function ClientBackButton() {
  return (
    <Link
      to="/clients"
      aria-label="Back to clients"
      title="Back to clients"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-crimson-light text-berry transition-colors hover:bg-crimson-light/30 focus-visible:outline-2 focus-visible:outline-crimson"
    >
      <ArrowLeft size={17} aria-hidden="true" />
    </Link>
  );
}
