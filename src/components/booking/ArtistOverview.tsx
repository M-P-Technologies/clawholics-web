import { publicPosition } from "@/lib/artistRoles";
import type { ReactNode } from "react";
import { Award, Images, Sparkles } from "lucide-react";
import SpecialtyList from "./SpecialtyList";

interface ArtistOverviewProps {
  nailist: {
    name: string;
    position: string;
    hide_position?: number;
    bio: string;
    specialty: string;
    offered_services?: string[];
  };
  /** How many photos of their work there are */
  workCount: number;
}

const Stat = ({ icon, value, label }: { icon: ReactNode; value: string; label: string }) => (
  <div className="flex min-w-0 flex-col items-center gap-1 text-center">
    <span className="text-crimson-ink">{icon}</span>
    <span className="text-base font-bold leading-tight text-gray-red">{value}</span>
    <span className="text-xs text-gray-red">{label}</span>
  </div>
);

// The phone layout of an artist's details, like a service's: the name, three quick facts, then
// "About" with the bio, their specialties and the services they offer. (From `lg` up the details
// page uses its two-column layout instead.)
export default function ArtistOverview({ nailist, workCount }: ArtistOverviewProps) {
  const [role, ...rest] = (publicPosition(nailist) || "Nail Technician").split(" ");
  const services = nailist.offered_services ?? [];

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-2xl font-normal uppercase leading-tight tracking-wider text-gray-red sm:text-3xl sm:tracking-widest">
        {nailist.name}
      </h1>

      <div className="flex justify-around gap-3 border-y border-crimson-light/80 py-3">
        <Stat icon={<Award size={28} strokeWidth={1.5} aria-hidden="true" />} value={role} label={rest.join(" ") || "Artist"} />
        {services.length > 0 && <Stat icon={<Sparkles size={28} strokeWidth={1.5} aria-hidden="true" />} value={String(services.length)} label="Services" />}
        {workCount > 0 && <Stat icon={<Images size={28} strokeWidth={1.5} aria-hidden="true" />} value={String(workCount)} label="Photos of work" />}
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="label-caps">About</h2>
        <p className="whitespace-pre-line copy-body">{nailist.bio}</p>
      </div>

      {nailist.specialty && (
        <div className="flex flex-col gap-1">
          <h2 className="label-caps">Specialties</h2>
          <SpecialtyList specialty={nailist.specialty} className="copy-body" />
        </div>
      )}

      {services.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="label-caps">Services</h2>
          <div className="flex flex-wrap gap-3">
            {services.map((name) => (
              <span key={name} className="rounded-full bg-crimson-light/40 px-3 py-1 text-sm text-berry">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
