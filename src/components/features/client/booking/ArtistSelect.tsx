import type { Nailist } from "@/utils/booking";
import { Avatar, Select } from "@/components/atoms";

interface ArtistSelectProps {
  nailists: Nailist[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

// The shared Select, with each artist's face beside their name and their title underneath.
const titleOf = (n: Nailist) => (n.category_id === 1 ? "Master Technician" : "Junior Technician");

export default function ArtistSelect({ nailists, selectedId, onSelect }: ArtistSelectProps) {
  return (
    <Select
      aria-label="Preferred artist"
      placeholder="Select artist"
      value={selectedId ?? ""}
      onChange={(e) => onSelect(Number(e.target.value))}
      options={nailists.map((n) => ({
        value: String(n.id),
        label: (
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{n.name}</span>
            <span className="truncate text-xs font-normal text-gray-red/70">{titleOf(n)}</span>
          </span>
        ),
        leading: <Avatar name={n.name} imageUrl={n.image ?? ""} size="sm" cropTop decorative />,
      }))}
      triggerClassName="font-bold"
    />
  );
}
