import { useSyncExternalStore } from "react";

// The live preview in the admin's content editors. The editor shows the real public page in an
// iframe named PREVIEW_FRAME_NAME and posts it the unsaved changes; inside that frame the content
// services return the saved content with those changes laid over it, and the pages fetch again
// whenever the changes do. Outside the frame nothing here does anything.

export const PREVIEW_FRAME_NAME = "clawholics-cms-preview";

/** What the parts of the site can be previewed with: `home` and `about` are merged over the
 *  saved content, `carousel` replaces the saved photos */
export type PreviewDrafts = Partial<{
  home: Record<string, string>;
  about: Record<string, string>;
  team: Record<string, string>;
  legal: Record<string, string>;
  carousel: { id: number; image_url: string; position: number }[];
}>;

export type PreviewMessage =
  | { type: "cms-preview:ready" }
  | { type: "cms-preview:draft"; drafts: PreviewDrafts }
  | { type: "cms-preview:refresh" };

/** True inside the editor's preview frame. The frame's name stays the same as it navigates. */
export function inCmsPreview() {
  return typeof window !== "undefined" && window.name === PREVIEW_FRAME_NAME && window.parent !== window;
}

let drafts: PreviewDrafts = {};
let version = 0;
const listeners = new Set<() => void>();
// The saved content, fetched once per frame and kept until the editor says something was saved
const saved = new Map<string, Promise<unknown>>();
let firstDrafts: Promise<void> = Promise.resolve();

function bump() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function start() {
  if (!inCmsPreview()) return;
  let received!: () => void;
  // The editor answers "ready" at once; the wait is capped so the page never hangs on it
  firstDrafts = new Promise((resolve) => {
    received = resolve;
    setTimeout(resolve, 1500);
  });

  window.addEventListener("message", (event: MessageEvent<PreviewMessage>) => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    if (event.data?.type === "cms-preview:draft") {
      drafts = event.data.drafts ?? {};
      received();
      bump();
    } else if (event.data?.type === "cms-preview:refresh") {
      saved.clear();
      bump();
    }
  });
  window.parent.postMessage({ type: "cms-preview:ready" } satisfies PreviewMessage, window.location.origin);

  // A preview of one section (e.g. /#faq): scroll to it once the page has drawn it
  const id = window.location.hash.slice(1);
  if (id) {
    let tries = 0;
    const timer = setInterval(() => {
      const target = document.getElementById(id);
      // Scroll this page only: scrollIntoView would also scroll the editor around the frame
      if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY });
      if (target || ++tries > 30) clearInterval(timer);
    }, 100);
  }
}

if (typeof window !== "undefined") start();

/**
 * A content fetch that the preview can see unsaved changes in. Outside the preview it is just
 * `load()`. Inside it, the saved content is fetched once (until a save) and the draft under
 * `key`, if any, is merged over it.
 */
export async function previewed<T>(key: string, load: () => Promise<T>, draftKey?: keyof PreviewDrafts): Promise<T> {
  if (!inCmsPreview()) return load();
  let base = saved.get(key) as Promise<T> | undefined;
  if (!base) {
    base = load();
    saved.set(key, base);
    base.catch(() => saved.delete(key));
  }
  const value = await base;
  if (!draftKey) return value;
  await firstDrafts;
  const draft = drafts[draftKey];
  if (draft === undefined) return value;
  return (Array.isArray(draft) ? draft : { ...(value as object), ...draft }) as T;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Changes whenever the preview's drafts change or a save lands; 0 outside the preview. Put it in
 *  a fetching effect's dependencies so the page fetches again. */
export function usePreviewVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}
