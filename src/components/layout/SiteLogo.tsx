import Logo from "../../assets/logo/logo-primary.svg";

// The logo in the top bar: the one uploaded in Admin > Homepage, or the Clawholics bow
export default function SiteLogo({ src }: { src: string }) {
  if (!src) return <Logo className="h-11 w-11 text-crimson" aria-hidden="true" focusable="false" />;
  // eslint-disable-next-line @next/next/no-img-element -- an uploaded R2 image, sized by CSS like the built-in logo
  return <img src={src} alt="" aria-hidden="true" className="h-11 w-auto max-w-40 select-none object-contain" />;
}
