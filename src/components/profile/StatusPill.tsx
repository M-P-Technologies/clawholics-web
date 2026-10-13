export default function StatusPill({ label, dotClass }: { label: string; dotClass: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-crimson-light/40 px-2.5 py-0.5 text-[11px] font-bold uppercase text-gray-red">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
