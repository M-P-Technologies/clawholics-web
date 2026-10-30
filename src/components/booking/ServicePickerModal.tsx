import Image from "next/image";
import { startingPrice } from "../../services/pricing";
import type { NailService } from "../../services/serviceService";
import { Button } from "@/components/atoms";
import { Dialog } from "@/components/organisms";

interface ServicePickerModalProps {
  open: boolean;
  /** The artist being booked, named in the heading */
  artistName: string;
  /** The services this artist offers */
  services: NailService[];
  onPick: (service: NailService) => void;
  onClose: () => void;
}

// "Book this artist" needs a service first: the booking page works out the artists, dates and
// prices from it. This lists what the artist offers; picking one goes on to the booking page.
export default function ServicePickerModal({ open, artistName, services, onPick, onClose }: ServicePickerModalProps) {
  return (
    <Dialog open={open} onClose={onClose} title={`Book ${artistName}`} size="xl">
      <p className="copy-note">
        Choose a service. Next you pick a date and time, with {artistName} already selected.
      </p>

      {services.length === 0 ? (
        <p className="copy-note">
          {artistName} has no services set up for booking yet. Please check back soon, or contact us and we will gladly help.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {services.map((service) => {
            const from = startingPrice(service);
            return (
              <li key={service.id} className="flex">
                <Button
                  variant="bare"
                  type="button"
                  onClick={() => onPick(service)}
                  className="flex w-full flex-col items-stretch whitespace-normal overflow-hidden rounded-xl border border-crimson-light text-left hover:border-crimson hover:bg-crimson-light/30"
                >
                  <span className="relative block aspect-square w-full overflow-hidden bg-sand/50">
                    {service.image && (
                      <Image src={service.image} alt="" fill sizes="(max-width: 672px) 45vw, 300px" className="object-cover" />
                    )}
                  </span>
                  <span className="flex flex-1 flex-col gap-1 p-3">
                    <span className="font-bold leading-snug text-gray-red">{service.name}</span>
                    {service.duration && <span className="text-sm text-gray-red">{service.duration}</span>}
                    {from !== null && <span className="mt-auto pt-1 text-sm font-bold text-crimson-ink">From ₱{from}</span>}
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Button type="button" variant="secondary" onClick={onClose} className="w-full">
        Cancel
      </Button>
    </Dialog>
  );
}
