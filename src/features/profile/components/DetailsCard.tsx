import Button from "../../../components/ui/Button";

// The client's own details, read-only, with a way into the edit sheet. Sits inside the profile
// panel, so it is a titled list rather than a card of its own.
export default function DetailsCard({ rows, onEdit }: { rows: { label: string; value: string }[]; onEdit: () => void }) {
  return (
    <section aria-label="My details" className="flex flex-col gap-3 border-t border-crimson-light/50 pt-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-normal normal-case tracking-normal text-gray-red">My details</h2>
        <Button type="button" variant="secondary" onClick={onEdit} className="!px-4 !py-1.5 text-[12px]">
          Edit
        </Button>
      </div>
      <dl className="flex flex-col gap-3">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-[12px] text-gray-red/70">{label}</dt>
            <dd className="min-w-0 text-sm font-medium text-gray-red [overflow-wrap:anywhere]">{value || "-"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
