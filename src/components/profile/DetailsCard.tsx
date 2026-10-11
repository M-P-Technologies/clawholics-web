import Button from "../ui/Button";

export default function DetailsCard({ rows, onEdit }: { rows: { label: string; value: string }[]; onEdit: () => void }) {
  return (
    <section aria-label="My details" className="flex flex-col gap-4 rounded-sm border border-crimson-light/80 bg-light-orange p-4 shadow-xl shadow-crimson/10 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="label-caps">My details</h2>
        <Button type="button" variant="secondary" onClick={onEdit}>Edit</Button>
      </div>
      <dl className="flex flex-col divide-y divide-crimson-light/80">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-start justify-between gap-4 py-3">
            <dt className="label-caps shrink-0">{label}</dt>
            <dd className="min-w-0 text-right text-gray-red [overflow-wrap:anywhere]">{value || "-"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
