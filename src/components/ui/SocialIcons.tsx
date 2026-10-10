// Brand icons for the social links. lucide-react does not ship brand logos, so they live
// here and are shared by the footer, the contact page and the floating Facebook button.

interface IconProps {
  className?: string;
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export function TikTokIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.96-.5 3.96-1.82 5.36-1.35 1.43-3.35 2.15-5.3 2.1-1.95-.05-3.86-.85-5.17-2.32-1.3-1.48-1.95-3.48-1.8-5.46.16-1.98 1.05-3.83 2.5-5.1 1.45-1.28 3.42-1.86 5.37-1.74v4.06c-1.3-.08-2.6.48-3.32 1.53-.7.98-.82 2.3-.43 3.4.4 1.1 1.34 1.95 2.5 2.22 1.16.27 2.44-.04 3.28-.85.86-.82 1.25-2 1.25-3.18V.02z" />
    </svg>
  );
}
