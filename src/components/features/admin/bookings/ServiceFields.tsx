import { Select } from "@/components/atoms";
import { SectionHeader } from "@/components/molecules";
import type { CreateAppointment } from "@/hooks/admin/useCreateAppointment";

// The create-appointment form's artist and service section: the services offered by the chosen artist
export default function ServiceFields({ a }: { a: CreateAppointment }) {
  return (
    <section aria-label="Artist and service" className="flex flex-col gap-3">
      <SectionHeader size="label" title="Artist and service" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select value={a.nailistId} onChange={(e) => a.chooseArtist(e.target.value)} disabled={a.loadingNailists} triggerClassName="font-bold">
          <option value="">{a.loadingNailists ? "Loading nail artists..." : "Select nail artist"}</option>
          {a.nailists.map((nailist) => (
            <option key={nailist.id} value={nailist.id}>
              {nailist.name}
            </option>
          ))}
        </Select>

        <Select value={a.serviceId} onChange={(e) => a.setServiceId(e.target.value)} disabled={a.loadingServices} triggerClassName="font-bold">
          <option value="">{a.loadingServices ? "Loading services..." : "Select service"}</option>
          {a.artistServices.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </Select>
      </div>
    </section>
  );
}
