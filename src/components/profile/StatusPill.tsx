export default function StatusPill({ label, dotClass }: { label: string; dotClass: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-crimson-light px-3 py-1 text-xs font-bold uppercase text-gray-red">
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
