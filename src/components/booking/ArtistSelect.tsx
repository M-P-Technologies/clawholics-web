import type { Nailist } from "../../utils/booking";
import Select from "../ui/Select";

interface ArtistSelectProps {
  nailists: Nailist[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

// Round photo of the artist, or their first letter while there is no photo
function Avatar({ nailist }: { nailist: Nailist }) {
  return nailist.image ? (
    <img
      src={nailist.image}
      alt=""
      loading="lazy"
      className="h-8 w-8 shrink-0 rounded-full border border-crimson-light object-cover object-top"
    />
  ) : (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-crimson-light bg-crimson-light/40 text-sm font-bold text-gray-red"
    >
      {nailist.name.charAt(0)}
    </span>
  );
}

// The shared Select, with each artist's face beside their name. Master technicians get a star.
export default function ArtistSelect({ nailists, selectedId, onSelect }: ArtistSelectProps) {
  return (
    <Select
      aria-label="Preferred artist"
      placeholder="Select artist"
      value={selectedId ?? ""}
      onChange={(e) => onSelect(Number(e.target.value))}
      options={nailists.map((n) => ({
        value: String(n.id),
        label: n.category_id === 1 ? `${n.name} ★` : n.name,
        leading: <Avatar nailist={n} />,
      }))}
      triggerClassName="font-bold"
    />
  );
}
