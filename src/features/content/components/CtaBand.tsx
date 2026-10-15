import Blush from "../../../components/ui/Blush";
import Button from "../../../components/ui/Button";
import Section from "../../../components/layout/Section";

interface CtaLink {
  /** A page inside the site */
  to?: string;
  /** Or a page outside the site, which opens in a new tab */
  href?: string;
  label: string;
}

interface CtaBandProps {
  title: string;
  text: string;
  primary: CtaLink;
  secondary?: CtaLink;
}

// A closing call to action: a headline, one line of help, and one or two buttons,
// on a soft pink glow. Used at the bottom of pages to point people to their next step.
export default function CtaBand({ title, text, primary, secondary }: CtaBandProps) {
  return (
    <Section innerClassName="items-center text-center gap-4 md:gap-8">
      <Blush
        tone="crimson"
        className="left-1/2 top-1/2 h-72 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2"
      />
      <h2 className="mx-auto max-w-xl font-display text-3xl font-normal not-italic uppercase leading-tight tracking-widest text-gray-red md:text-5xl">
        {title}
      </h2>
      <p className="mx-auto max-w-lg copy-lead">{text}</p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button to={primary.to} href={primary.href}>
          {primary.label}
        </Button>
        {secondary && (
          <Button to={secondary.to} href={secondary.href} variant="secondary">
            {secondary.label}
          </Button>
        )}
      </div>
    </Section>
  );
}
