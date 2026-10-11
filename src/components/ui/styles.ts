// Shared class strings so every form, chip and button on inner pages looks
// like the landing page.

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
