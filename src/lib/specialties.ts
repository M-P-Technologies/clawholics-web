/**
 * An artist's specialties as a list. The admin writes them one per line, or on one line as
 * "• one • two"; either way each item comes back on its own, without its bullet ("-", "*",
 * "1." and the like at the start of a line are dropped too, so the list doesn't show two).
 */
export function splitSpecialties(specialty: string | null | undefined): string[] {
  return (specialty ?? "")
    .split(/[•·\n]+/)
    .map((item) => item.trim().replace(/^(?:[-*–]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}
