import type { CreateAppointment } from "@/hooks/admin/useCreateAppointment";

const inputClass =
  "h-9 w-full rounded-md border border-crimson-light bg-milk px-3 text-[13px] text-gray-red placeholder:text-gray-red/60 outline-none focus:ring-2 focus:ring-crimson";

// The create-appointment form's client section: name, phone (digits only, up to 11) and email
export default function ClientFields({ a }: { a: CreateAppointment }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-crimson-light/50 p-3">
      <h4 className="font-display text-lg font-normal text-gray-red">
        Client
      </h4>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            data-autofocus
            value={a.firstName}
            onChange={(e) => a.setFirstName(e.target.value)}
            placeholder="First name"
            className={inputClass}
          />

          <input
            type="text"
            value={a.lastName}
            onChange={(e) => a.setLastName(e.target.value)}
            placeholder="Last name"
            className={inputClass}
          />
        </div>

        <input
          type="text"
          value={a.phone}
          onChange={(e) => {
            const value = e.target.value;

            if (/^\d{0,11}$/.test(value)) {
              a.setPhone(value);
            }
          }}
          placeholder="Phone number"
          className={inputClass}
        />

        <input
          type="email"
          value={a.email}
          onChange={(e) => a.setEmail(e.target.value)}
          placeholder="Email address (optional)"
          className={inputClass}
        />
      </div>
    </section>
  );
}
