// The library's class recipes: the admin's surfaces, fields and focus, in one place. Components use
// these; screens use the components. Colors are theme names only, so the site theme still applies.

export const surface = {
  /** The admin's card: milk white, soft border and shadow */
  card: "rounded-2xl border border-crimson-light/40 bg-milk shadow-petal",
  /** A soft tinted box inside a card */
  tint: "rounded-xl bg-crimson-light/15",
} as const;

export const field = {
  input:
    "w-full rounded-md border border-crimson-light bg-milk px-3 py-2 text-sm text-gray-red outline-none placeholder:text-gray-red/50 focus:ring-2 focus:ring-crimson disabled:cursor-not-allowed disabled:opacity-60",
  label: "text-[13px] font-medium text-gray-red/80",
} as const;

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson";

export const nav = {
  /** A sidebar item: a pill, highlighted when it is the current screen */
  item: (active: boolean, collapsed: boolean) =>
    [
      "w-full whitespace-normal rounded-full text-left text-[14px] leading-snug transition-colors",
      collapsed ? "h-10 justify-center px-0" : "justify-start gap-2 px-3 py-1.5",
      active ? "bg-crimson-light/45 font-bold text-berry" : "text-gray-red hover:bg-crimson-light/25 hover:text-berry",
    ].join(" "),
  /** A phone tab */
  tab: (active: boolean) =>
    [
      "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-medium tracking-wide transition-colors",
      active ? "bg-crimson-light/40 text-berry" : "text-gray-red hover:text-berry",
    ].join(" "),
} as const;

// From the old ui/styles.ts: the public site's form and section classes (restyled in part 4)
export const labelClass =
  "mb-1.5 block label-caps";

export const inputClass =
  "w-full rounded-md border border-crimson-light bg-light-orange/70 px-4 py-2 text-base text-gray-red placeholder:text-gray-red/50 transition-colors focus:border-crimson focus:outline-none focus:ring-2 focus:ring-crimson/30 disabled:cursor-not-allowed disabled:opacity-60";

export const errorTextClass = "mt-1.5 text-sm text-danger";

export const chipClass = (active: boolean) =>
  `cursor-pointer whitespace-nowrap rounded-md border px-4 py-2 text-sm font-bold uppercase tracking-widest transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson ${
    active
      ? "border-crimson bg-crimson text-light-orange"
      : "border-crimson-light text-crimson hover:border-crimson"
  }`;

export const infoLabelClass = "label-caps";
// The same contact links, for use on a dark photo
export const contactLinkLightClass =
  "flex items-start gap-4 text-light-orange transition-colors hover:text-crimson-light";

// Heading of a section on a page
export const sectionTitleClass =
  "font-display text-3xl font-normal not-italic uppercase leading-tight tracking-widest text-gray-red md:text-4xl";
