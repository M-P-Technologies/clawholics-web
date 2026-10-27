import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import clsx from "clsx";
import { Avatar } from "../atoms";

/** On phones the bar stays at the top as the tab bar stays at the bottom: edge to edge (out of its
 *  frame's 12px padding), rounded below, over the page as it scrolls */
export const PHONE_STICKY_TOP_BAR =
  "max-sm:sticky max-sm:top-0 max-sm:z-40 max-sm:-mx-3 max-sm:-mt-3 max-sm:w-auto max-sm:rounded-none max-sm:rounded-b-3xl max-sm:border-x-0 max-sm:border-t-0 max-sm:bg-milk/95 max-sm:pt-[calc(0.75rem+env(safe-area-inset-top))] max-sm:backdrop-blur-md";

interface TopBarProps {
  title: string;
  /** Keeps the title for screen readers only (the screen has a back button and no visible title) */
  hideTitle?: boolean;
  /** Above the title on computers, e.g. "Welcome, Ana!" */
  greeting?: string;
  /** Beside the title, e.g. a Create button */
  titleAside?: ReactNode;
  /** Before the title, in the same row, e.g. a round back button on phones */
  leading?: ReactNode;
  /** The screen's own controls (wrap under the title on phones) */
  actions?: ReactNode;
  account: { name: string; email: string; imageUrl: string };
  /** E.g. a notifications bell, beside the account */
  bell?: ReactNode;
  /** Whether the computer layout is showing, so the bell is drawn in one place only */
  wide?: boolean;
  /** False when the actions only show on a computer (e.g. a text Back link that's an icon on
   *  phones), so the phone layout doesn't keep an empty row under the title */
  actionsOnPhone?: boolean;
  className?: string;
}

// The bar across the top of every admin screen and client app tab: the greeting, title and the
// screen's controls on the left; a link to the public site, an optional bell (e.g. new bookings)
// and who is signed in on the right.
export default function TopBar({ title, hideTitle = false, greeting, titleAside, leading, actions, account, bell, wide = true, actionsOnPhone = true, className }: TopBarProps) {
  return (
    <header className={clsx("flex w-full flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk/80 px-3 py-3 shadow-petal backdrop-blur-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6", className)}>
      <div className="flex min-w-0 items-center justify-between gap-3 lg:shrink-0">
        <div className="flex min-w-0 flex-col gap-0.5">
          {/* A screen with a back button has no greeting: it would sit above the button and look out of place */}
          {greeting && !leading && <p className="hidden font-display text-base leading-none text-berry lg:block">{greeting}</p>}
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            {leading}
            <h1 className={clsx("font-display text-2xl font-normal normal-case leading-tight tracking-normal text-gray-red sm:text-3xl", hideTitle && "sr-only")}>{title}</h1>
            {titleAside}
          </div>
        </div>
        {/* On a phone the bell and the account sit beside the title */}
        <div className="flex shrink-0 items-center gap-3 lg:hidden">
          {bell && !wide && bell}
          <Avatar name={account.name} imageUrl={account.imageUrl} />
        </div>
      </div>

      {/* One row on a computer: the screen's controls give way (and scroll sideways) before anything wraps */}
      {/* clsx, not a template string: Tailwind only finds whole words, and "lg:justify-end${" isn't one */}
      <div className={clsx("flex min-w-0 flex-wrap items-center gap-3 lg:flex-1 lg:flex-nowrap lg:justify-end", (!actions || !actionsOnPhone) && "max-lg:hidden")}>
        {actions}
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-crimson-light px-3 py-1.5 text-sm font-bold text-berry transition-colors hover:bg-crimson-light/30 lg:flex"
        >
          View site
          <ExternalLink size={14} aria-hidden="true" />
        </a>

        {/* The bell is drawn once, in the place for the screen's width */}
        {bell && wide && <div className="hidden lg:block">{bell}</div>}

        <div className="hidden shrink-0 items-center gap-3 border-l border-crimson-light/60 pl-3 lg:flex">
          <Avatar name={account.name} imageUrl={account.imageUrl} />
          <div className="hidden flex-col leading-tight md:flex">
            <span className="whitespace-nowrap text-[13px] font-bold text-gray-red">{account.name}</span>
            <span className="whitespace-nowrap text-xs text-gray-red">{account.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
