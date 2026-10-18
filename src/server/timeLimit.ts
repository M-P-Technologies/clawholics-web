import "server-only";

// A time limit for the database reads that pages make while they're built (the content they're
// prerendered with, their schema markup, their metadata). A clean build reads the database from
// several workers at once, and a read that stalls would otherwise hold the page past Next's
// 60-second limit and fail the whole build. Past the limit the read is given up on, and the page
// does without that piece (the browser fetches the content itself).

/** How long a page waits for one read */
const READ_LIMIT_MS = 3000;

/** The read's result, or a rejection once it has taken longer than `ms` */
export function withTimeLimit<T>(read: () => PromiseLike<T>, label: string, ms = READ_LIMIT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}: no answer within ${ms}ms`)), ms);
    Promise.resolve()
      .then(read)
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  });
}

/** The read's result, or null when it fails or takes too long (logged, never thrown) */
export async function readOrNull<T>(read: () => PromiseLike<T>, label: string, ms = READ_LIMIT_MS): Promise<T | null> {
  try {
    return await withTimeLimit(read, label, ms);
  } catch (error) {
    console.warn("Left out:", error instanceof Error ? error.message : error);
    return null;
  }
}
