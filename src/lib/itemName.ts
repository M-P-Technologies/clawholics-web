/**
 * How a message names the thing it is about ("Miss Max", "Gel Manicure"): trimmed, on one line and
 * cut short if it is long. `fallback` ("this artist") stands in when there is no name yet.
 */
export function itemName(name: string | null | undefined, fallback: string, max = 50): string {
  const text = (name ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** The same for text that is not really a name, such as an FAQ's question: in quotes, "How much…" */
export function quotedName(text: string | null | undefined, fallback: string, max = 60): string {
  const short = itemName(text, "", max);
  return short ? `“${short}”` : fallback;
}

/** "this artist" -> "This artist", so a message can start with the name or its fallback */
export const upperFirst = (text: string): string => (text ? text[0].toUpperCase() + text.slice(1) : text);
