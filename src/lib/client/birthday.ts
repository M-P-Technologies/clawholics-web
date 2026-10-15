const manilaMonth = (now: number) => Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "numeric" }).format(now));

/** Whether `now` falls in the month of a YYYY-MM-DD birthday, in the salon's time zone */
export function isBirthdayMonth(dob: string | null | undefined, now: number): boolean {
  const match = /^\d{4}-(\d{2})-\d{2}/.exec(dob ?? "");
  return !!match && Number(match[1]) === manilaMonth(now);
}

/** The admin's birthday words with {name} filled in */
export const fillName = (text: string, firstName: string) => text.replaceAll("{name}", firstName.trim() || "there");
