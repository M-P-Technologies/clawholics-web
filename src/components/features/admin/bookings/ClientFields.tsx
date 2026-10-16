import { Input } from "@/components/atoms";
import { SectionHeader } from "@/components/molecules";
import type { CreateAppointment } from "@/hooks/admin/useCreateAppointment";

// The create-appointment form's client section: name, phone (digits only, up to 11) and email
export default function ClientFields({ a }: { a: CreateAppointment }) {
  return (
    <section aria-label="Client" className="flex flex-col gap-3">
      <SectionHeader size="label" title="Client" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input type="text" data-autofocus value={a.firstName} onChange={(e) => a.setFirstName(e.target.value)} placeholder="First name" />
        <Input type="text" value={a.lastName} onChange={(e) => a.setLastName(e.target.value)} placeholder="Last name" />
        <Input
          type="text"
          inputMode="numeric"
          value={a.phone}
          onChange={(e) => {
            if (/^\d{0,11}$/.test(e.target.value)) a.setPhone(e.target.value);
          }}
          placeholder="Phone number"
        />
        <Input type="email" value={a.email} onChange={(e) => a.setEmail(e.target.value)} placeholder="Email address (optional)" />
      </div>
    </section>
  );
}
