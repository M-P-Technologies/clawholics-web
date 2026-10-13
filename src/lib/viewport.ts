// True from Tailwind's `lg` breakpoint (64rem) up. Asking in rem keeps it in step with the CSS
// even when the browser's default font size isn't 16px. Without matchMedia (tests, server) it is
// false, i.e. the phone layout.
export const isDesktopWidth = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(min-width: 64rem)").matches;
