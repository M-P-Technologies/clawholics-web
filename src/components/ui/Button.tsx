import { Children } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Link } from "@/lib/router";
import { ArrowRight, Loader2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "bare";

interface ButtonOwnProps {
  /**
   * primary: solid brand button, the main action on a screen.
   * secondary: outlined, for the other choice next to it.
   * bare: no look of its own. For icon buttons, tabs, list rows and links that style themselves
   * through `className`. It still gets the same focus ring, pointer, disabled and loading behavior.
   */
  variant?: ButtonVariant;
  /** Shows a spinner, blocks clicks and tells screen readers it is busy */
  loading?: boolean;
  /** Text shown instead of the children while loading, for example "Saving..." */
  loadingText?: string;
  fullWidth?: boolean;
  /** A sliding arrow after the label, for "go to" links */
  arrow?: boolean;
  /** Goes to a page inside the site (router link) */
  to?: string;
  state?: unknown;
  /** Goes to a page outside the site, in a new tab */
  href?: string;
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps>;
type NativeAnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonOwnProps>;
export type ButtonProps = ButtonOwnProps & NativeButtonProps & NativeAnchorProps;

const BASE =
  "inline-flex min-w-0 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "rounded-md bg-crimson px-4 py-2 text-sm font-bold uppercase tracking-extrawide text-light-orange sm:px-6 sm:py-3 shadow-md shadow-crimson/30 hover:bg-gray-red active:translate-y-px",
  secondary:
    "rounded-md border border-crimson px-4 py-2 text-sm font-bold uppercase tracking-extrawide text-crimson sm:px-6 sm:py-3 hover:bg-crimson hover:text-light-orange active:translate-y-px",
  bare: "",
};

// States that every variant shares
const STATES = "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";
const LOADING = "cursor-wait opacity-70 pointer-events-none";

// The one button of the site. Renders a <button>, a router <Link> (`to`) or an <a> (`href`).
export default function Button({
  variant = "primary",
  loading = false,
  loadingText,
  fullWidth = false,
  arrow = false,
  to,
  state,
  href,
  className,
  children,
  type,
  disabled,
  ref,
  ...rest
}: ButtonProps) {
  const classes = twMerge(
    clsx(
      BASE,
      VARIANTS[variant],
      STATES,
      arrow && "group",
      fullWidth && "w-full",
      loading && LOADING,
      className,
    ),
  );

  const label = loading && loadingText ? loadingText : children;

  const content = (
    <>
      {loading && <Loader2 size={16} aria-hidden="true" className="shrink-0 animate-spin" />}
      {/* Long labels shrink with an ellipsis. Only the text is clipped, so the focus ring stays visible,
          and icons placed beside the text stay in the same row.
          A bare button keeps its children as they are, since it lays them out itself. */}
      {variant === "bare"
        ? label
        : Children.map(label, (child) =>
            typeof child === "string" || typeof child === "number" ? (
              <span className="min-w-0 truncate">{child}</span>
            ) : (
              child
            ),
          )}
      {arrow && !loading && (
        <ArrowRight
          size={16}
          aria-hidden="true"
          className="shrink-0 transition-transform duration-300 group-hover:translate-x-1"
        />
      )}
    </>
  );

  const isDisabled = disabled || loading;

  if (to !== undefined && !isDisabled) {
    return (
      <Link ref={ref as Ref<HTMLAnchorElement>} to={to} state={state} className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </Link>
    );
  }

  if (href !== undefined && !isDisabled) {
    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  // A disabled link is shown as a disabled button, so it cannot be clicked or focused
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={classes}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
}
