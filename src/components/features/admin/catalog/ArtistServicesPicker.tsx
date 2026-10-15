import { Check as CheckIcon } from "lucide-react";
import type { NailService } from "@/services/serviceService";
import { SectionHeader } from "@/components/molecules";

type ArtistServicesPickerProps = {
  services: NailService[];
  selectedIds: number[];
  disabled: boolean;
  onToggle: (serviceId: number) => void;
};

// The artist editor's "Services Offered": a tick box per service
const ArtistServicesPicker = ({ services, selectedIds, disabled, onToggle }: ArtistServicesPickerProps) => (
  <div className="flex flex-col gap-1.5">
    <SectionHeader size="label" title="Services Offered" />

    {services.length === 0 ? (
      <p className="text-[15px] text-gray-red">
        No services available.
      </p>
    ) : (
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {services.map((service) => (
          <label
            key={service.id}
            className="flex items-center gap-1 text-[14px] text-gray-red"
          >
            <span className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={selectedIds.includes(service.id)}
                disabled={disabled}
                onChange={() => onToggle(service.id)}
                className="
                  peer
                  w-4 h-4 appearance-none rounded-[3px]
                  border border-crimson bg-transparent
                  checked:bg-crimson
                  disabled:cursor-not-allowed
                "
              />

              <CheckIcon
                size={18} className="pointer-events-none absolute hidden peer-checked:block text-light-orange"
              />
            </span>

            {service.name}
          </label>
        ))}
      </div>
    )}
  </div>
);

export default ArtistServicesPicker;
