import { CalendarDays, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "../atoms";

interface TopBarProps {
  title: string;
  /** Above the title on computers, e.g. "Welcome, Ana!" */
  greeting?: string;
  /** Beside the title, e.g. a Create button */
  titleAside?: ReactNode;
  /** The screen's own controls (wrap under the title on phones) */
  actions?: ReactNode;
  account: { name: string; email: string; imageUrl: string };
  /** E.g. "Wednesday, Oct 14"; empty until the page is in the browser */
  today?: string;
  /** E.g. a notifications bell, beside the account */
  bell?: ReactNode;
  /** Whether the computer layout is showing, so the bell is drawn in one place only */
  wide?: boolean;
}

// The bar across the top of every admin screen and client app tab: the greeting, title and the
// screen's controls on the left; the date, a link to the public site, an optional bell (e.g. new
// bookings) and who is signed in on the right.
export default function TopBar({ title, greeting, titleAside, actions, account, today, bell, wide = true }: TopBarProps) {
  return (
    <header className="flex w-full flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk/80 px-4 py-3 shadow-petal backdrop-blur-sm sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
      <div className="flex min-w-0 items-center justify-between gap-3 lg:shrink-0">
        <div className="flex min-w-0 flex-col gap-0.5">
          {greeting && <p className="hidden font-display text-base leading-none text-berry lg:block">{greeting}</p>}
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="font-display text-2xl font-normal normal-case leading-tight tracking-normal text-gray-red sm:text-3xl">{title}</h1>
            {titleAside}
          </div>
        </div>
        {/* On a phone the bell and the account sit beside the title */}
        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          {bell && !wide && bell}
          <Avatar name={account.name} imageUrl={account.imageUrl} />
        </div>
      </div>

      {/* One row on a computer: the screen's controls give way (and scroll sideways) before anything wraps */}
      <div className="flex min-w-0 flex-wrap items-center gap-3 lg:flex-1 lg:flex-nowrap lg:justify-end">
        {actions}
        {today && (
          <p className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-gray-red/80 xl:flex">
            <CalendarDays size={15} aria-hidden="true" className="text-berry" />
            {today}
          </p>
        )}
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-crimson-light px-3 py-1.5 text-[13px] font-bold text-berry transition-colors hover:bg-crimson-light/30 lg:flex"
        >
          View site
          <ExternalLink size={14} aria-hidden="true" />
        </a>

        {/* The bell is drawn once, in the place for the screen's width */}
        {bell && wide && <div className="hidden lg:block">{bell}</div>}

        <div className="hidden shrink-0 items-center gap-2.5 border-l border-crimson-light/60 pl-3 lg:flex">
          <Avatar name={account.name} imageUrl={account.imageUrl} />
          <div className="hidden min-w-0 flex-col leading-tight 2xl:flex">
            <span className="max-w-40 truncate text-[13px] font-bold text-gray-red">{account.name}</span>
            <span className="max-w-40 truncate text-[11px] text-gray-red/60">{account.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
