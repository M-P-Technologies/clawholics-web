import clsx from "clsx";
import { splitSpecialties } from "@/lib/specialties";

// An artist's specialties, one bulleted item per line (the home spotlight, the artist page and
// its phone overview), however the admin typed them.
export default function SpecialtyList({ specialty, className }: { specialty: string; className?: string }) {
  const items = splitSpecialties(specialty);
  if (items.length === 0) return null;

  return (
    <ul className={clsx("list-disc pl-5 marker:text-crimson-ink", className)}>
      {/* By position: the admin may repeat an item */}
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
