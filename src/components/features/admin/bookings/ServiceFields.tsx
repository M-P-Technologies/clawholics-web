import { Select } from "@/components/atoms";
import type { CreateAppointment } from "@/hooks/admin/useCreateAppointment";

// The create-appointment form's artist and service section: the services offered by the chosen artist
export default function ServiceFields({ a }: { a: CreateAppointment }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-crimson-light/50 p-3">
      <h4 className="font-display text-lg font-normal text-gray-red">
        Artist and service
      </h4>

      <div className="flex flex-col gap-3">
        <Select
            value={a.nailistId}
            onChange={(e) => a.chooseArtist(e.target.value)}
            disabled={a.loadingNailists}
          >
            <option value="">
              {a.loadingNailists
                ? "Loading nail artists..."
                : "Select nail artist"}
            </option>

            {a.nailists.map((nailist) => (
              <option key={nailist.id} value={nailist.id}>
                {nailist.name}
              </option>
            ))}
          </Select>

        <Select
            value={a.serviceId}
            onChange={(e) => a.setServiceId(e.target.value)}
            disabled={a.loadingServices}
          >
            <option value="">
              {a.loadingServices ? "Loading services..." : "Select service"}
            </option>

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
