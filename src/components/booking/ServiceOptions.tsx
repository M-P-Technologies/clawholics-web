import clsx from "clsx";

interface ServiceOptionsProps {
  options?: { id: number; name: string; price: number }[];
  /** The heading's look, to match the section it sits in */
  headingClassName?: string;
  className?: string;
}

// A service's add-on options in a section of their own: optional extras the client can add when
// booking, each priced on top of the service and paid at the salon (the deposit stays the same).
// Nothing when the service has none.
export default function ServiceOptions({ options, headingClassName = "label-caps", className }: ServiceOptionsProps) {
  if (!options?.length) return null;
  return (
    <section aria-label="Add-on options" className={clsx("flex flex-col gap-2 text-gray-red", className)}>
      <h2 className={headingClassName}>Add-on options</h2>
      <p className="text-sm">Optional extras you can add when you book. They&apos;re paid at the salon, on top of the service price.</p>
      <ul className="flex flex-col divide-y divide-crimson-light/60 rounded-xl border border-crimson-light/60 bg-milk">
        {options.map((option) => (
          <li key={option.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0 font-bold">{option.name}</span>
            <span className="shrink-0 font-bold text-crimson-ink">+₱{option.price.toLocaleString("en-US")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
