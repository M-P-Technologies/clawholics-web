// The hosts next/image may resize (images.remotePatterns in next.config.ts). An image from
// anywhere else (a pasted web address) must be drawn with `unoptimized`, or next/image throws.
const OPTIMIZED_HOSTS = ["images.clawholicsbymax.com", "clawholics-api-staging.clawholicsdev.workers.dev"];

/** True when next/image can resize this image: one of our hosts, or a file of the site itself */
export function canOptimizeImage(src: string): boolean {
  if (src.startsWith("/")) return !src.startsWith("//");
  try {
    const url = new URL(src);
    return url.protocol === "https:" && OPTIMIZED_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}
