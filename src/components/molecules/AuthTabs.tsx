import clsx from "clsx";
import { Link } from "@/lib/router";

// The Login | Sign up switch above the sign-in and sign-up forms. Each side is its own page, so
// moving between them keeps the address meaningful and the back button working.
export default function AuthTabs({ current }: { current: "login" | "signup" }) {
  const tab = (to: string, label: string, active: boolean) => (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex-1 rounded-md py-3 text-center text-base font-semibold transition-colors",
        active ? "bg-crimson text-light-orange shadow-md shadow-crimson/30" : "text-gray-red hover:text-crimson-ink",
      )}
    >
      {label}
    </Link>
  );

  return (
    <nav aria-label="Account" className="flex w-full max-w-100 gap-1 rounded-md border border-crimson-light bg-light-orange p-1">
      {tab("/login", "Login", current === "login")}
      {tab("/signup", "Sign up", current === "signup")}
    </nav>
  );
}
