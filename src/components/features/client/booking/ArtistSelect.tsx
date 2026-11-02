import { Users } from "lucide-react";
import { Avatar, Select } from "@/components/atoms";
import { publicPosition } from "@/lib/artistRoles";
import type { Nailist } from "@/utils/booking";

interface ArtistSelectProps {
  nailists: Nailist[];
  /** "Any available artist" is the current choice */
  anyArtist: boolean;
  selectedId?: number | null;
  /** Offers "Any available artist" first (when more than one artist does the service) */
  canChooseAny: boolean;
  onChange: (choice: number | "any") => void;
}

// The booking step's artist dropdown: each artist with their photo and role, and "Any available artist" first when offered
export default function ArtistSelect({ nailists, anyArtist, selectedId, canChooseAny, onChange }: ArtistSelectProps) {
  const options = [
    ...(canChooseAny
      ? [{
          value: "any",
          label: (
            <span className="flex min-w-0 flex-col">
              <span className="truncate">Any available artist</span>
              <span className="truncate text-xs font-normal text-gray-red">We&apos;ll assign a free artist</span>
            </span>
          ),
          leading: (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-crimson-light/40 text-berry">
              <Users size={16} aria-hidden="true" />
            </span>
          ),
        }]
      : []),
    ...nailists.map((n) => ({
      value: String(n.id),
      label: (
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{n.name}</span>
          <span className="truncate text-xs font-normal text-gray-red">{publicPosition(n)}</span>
        </span>
      ),
      leading: <Avatar name={n.name} imageUrl={n.image ?? ""} size="sm" cropTop decorative />,
    })),
  ];

  return (
    <Select
      aria-label="Preferred artist"
      placeholder="Select artist"
      value={anyArtist ? "any" : selectedId ?? ""}
      onChange={(e) => onChange(e.target.value === "any" ? "any" : Number(e.target.value))}
      options={options}
      triggerClassName="font-bold"
    />
  );
}
