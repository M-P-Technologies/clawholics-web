import { ExternalLink, Monitor, PenLine, RotateCw, Smartphone, Eye } from "lucide-react";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import clsx from "clsx";
import AdminShell from "../AdminShell";
import { Button } from "@/components/atoms";
import { Select } from "@/components/atoms";
import { PREVIEW_FRAME_NAME, type PreviewDrafts, type PreviewMessage } from "../../../lib/cmsPreview";

interface PreviewPage {
  label: string;
  path: string;
}

type Device = "desktop" | "mobile";

const DESKTOP_WIDTH = 1280;
// screenRadius: the frame's 36px corners (rounded-[2.25rem]) less its 10px bezel
const PHONE = { width: 390, height: 844, bezel: 10, screenRadius: 26 };

const EditorContext = createContext<{ showPage: (path: string) => void }>({ showPage: () => {} });

/** For the panel's controls: show the page they change in the preview */
export const useCmsEditor = () => useContext(EditorContext);

interface CmsEditorProps {
  title: string;
  /** The public pages this editor changes; the preview opens on the first */
  pages: PreviewPage[];
  /** Unsaved changes, shown in the preview as they're made */
  drafts?: PreviewDrafts;
  /** Changed after every save, so the preview loads the saved content again */
  refreshKey?: number;
  /** The top of the panel, above the controls: a SaveBar or an ItemsNote */
  header?: ReactNode;
  children: ReactNode;
}

// A content editor laid out like a site builder: the controls in a panel on the left and the
// real public page on the right, in a desktop or phone frame, showing the unsaved changes live.
// On a phone the two take turns, with Edit and Preview tabs.
export default function CmsEditor({ title, pages, drafts, refreshKey = 0, header, children }: CmsEditorProps) {
  const [path, setPath] = useState(pages[0]?.path ?? "/");
  const [device, setDevice] = useState<Device>("desktop");
  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [reloads, setReloads] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  usePreviewFrame(frameRef, drafts, refreshKey);

  // A section can point at part of a page (/#faq); it shows if that page is one of the editor's
  const base = (p: string) => p.split("#")[0] || "/";
  const showPage = (next: string) => {
    if (pages.some((p) => base(p.path) === base(next))) setPath(next);
  };
  const current = pages.find((p) => p.path === path) ?? pages.find((p) => base(p.path) === base(path)) ?? pages[0];

  return (
    <AdminShell title={title}>
      <EditorContext.Provider value={{ showPage }}>
        {/* Phone: Edit or Preview */}
        <div role="tablist" aria-label="Editor view" className="flex w-fit gap-1 self-start rounded-full bg-crimson-light/25 p-1 lg:hidden">
          {(
            [
              { value: "edit", label: "Edit", Icon: PenLine },
              { value: "preview", label: "Preview", Icon: Eye },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={pane === value}
              onClick={() => setPane(value)}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors",
                pane === value ? "bg-milk text-berry shadow-sm" : "text-gray-red/80 hover:text-berry",
              )}
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 gap-5">
          <aside
            aria-label={`${title} settings`}
            className={clsx(
              "min-h-0 w-full shrink-0 flex-col overflow-clip rounded-2xl border border-crimson-light/40 bg-milk shadow-petal lg:flex lg:w-95 xl:w-105",
              pane === "edit" ? "flex" : "hidden",
            )}
          >
            {header}
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </aside>

          <section
            aria-label="Preview"
            className={clsx(
              "h-[78vh] min-w-0 flex-1 flex-col overflow-clip rounded-2xl border border-crimson-light/40 bg-milk shadow-petal lg:flex lg:h-auto",
              pane === "preview" ? "flex" : "hidden",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-crimson-light/40 px-3 py-2">
              {pages.length > 1 ? (
                <Select aria-label="Page" value={current?.path ?? path} onChange={(e) => setPath(e.target.value)} className="w-44" options={pages.map((p) => ({ value: p.path, label: p.label }))} />
              ) : (
                <p className="px-1 text-[13px] font-bold text-gray-red">{pages[0]?.label}</p>
              )}

              <div role="group" aria-label="Device" className="flex gap-1 rounded-full bg-crimson-light/25 p-1">
                {(
                  [
                    { value: "desktop", label: "Desktop", Icon: Monitor },
                    { value: "mobile", label: "Mobile", Icon: Smartphone },
                  ] as const
                ).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={device === value}
                    onClick={() => setDevice(value)}
                    className={clsx(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold transition-colors",
                      device === value ? "bg-milk text-berry shadow-sm" : "text-gray-red/80 hover:text-berry",
                    )}
                  >
                    <Icon size={14} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <Button type="button" variant="bare" aria-label="Reload preview" onClick={() => setReloads((n) => n + 1)} className="rounded-full p-2 text-gray-red hover:bg-crimson-light/30">
                  <RotateCw size={16} aria-hidden="true" />
                </Button>
                <a
                  href={path}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open the live page in a new tab"
                  className="rounded-full p-2 text-gray-red transition-colors hover:bg-crimson-light/30 focus-visible:outline-2 focus-visible:outline-crimson"
                >
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
              </div>
            </div>

            <PreviewStage frameRef={frameRef} src={path} device={device} reloadKey={reloads} title={`Preview of ${current?.label ?? "the page"}`} />
          </section>
        </div>
      </EditorContext.Provider>
    </AdminShell>
  );
}

interface PreviewStageProps {
  frameRef: RefObject<HTMLIFrameElement | null>;
  src: string;
  device: Device;
  reloadKey: number;
  title: string;
}

// The page itself, drawn at a real desktop or phone width (so the site's own breakpoints apply)
// and scaled down to fit the space
function PreviewStage({ frameRef, src, device, reloadKey, title }: PreviewStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Which page and reload has finished loading: until it's the current one, show the spinner.
  // A jump to a section of the same page (/#faq) doesn't load the page again, so it's ignored.
  const frameKey = `${src.split("#")[0]}|${reloadKey}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== frameKey;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => setSize({ width: stage.clientWidth, height: stage.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const desktopScale = size.width ? Math.min(1, size.width / DESKTOP_WIDTH) : 1;
  const phoneOuter = { width: PHONE.width + PHONE.bezel * 2, height: PHONE.height + PHONE.bezel * 2 };
  const phoneScale = size.width ? Math.min(1, (size.width - 32) / phoneOuter.width, (size.height - 32) / phoneOuter.height) : 1;

  const frameStyle =
    device === "desktop"
      ? { width: DESKTOP_WIDTH, height: size.height / desktopScale, top: 0, transform: `translateX(-50%) scale(${desktopScale})` }
      : { width: phoneOuter.width, height: phoneOuter.height, top: 16, transform: `translateX(-50%) scale(${phoneScale})` };

  return (
    <div ref={stageRef} className="relative min-h-0 flex-1 overflow-clip bg-crimson-light/20">
      <div
        data-device={device}
        style={frameStyle}
        className={clsx(
          "absolute left-1/2 origin-top overflow-clip bg-light-orange",
          device === "mobile" && "rounded-[2.25rem] border-10 border-gray-red shadow-xl",
        )}
      >
        <iframe
          key={reloadKey}
          ref={frameRef}
          name={PREVIEW_FRAME_NAME}
          title={title}
          src={src}
          onLoad={() => setLoadedKey(frameKey)}
          // The phone's rounded screen. Chrome doesn't clip a scaled iframe by its parent's rounded
          // corners, so the page showed past them; clipping the iframe itself always works.
          style={device === "mobile" ? { borderRadius: PHONE.screenRadius, clipPath: `inset(0 round ${PHONE.screenRadius}px)` } : undefined}
          className="h-full w-full border-0 bg-light-orange"
        />
      </div>
      {loading && (
        <div role="status" className="absolute inset-0 flex items-center justify-center bg-milk/60 text-[13px] font-bold text-gray-red">
          Loading preview…
        </div>
      )}
    </div>
  );
}

// Keeps the preview frame up to date: the drafts when it's ready and whenever they change (a
// moment after typing stops), and a refresh after each save
function usePreviewFrame(frameRef: RefObject<HTMLIFrameElement | null>, drafts: PreviewDrafts | undefined, refreshKey: number) {
  const serialized = JSON.stringify(drafts ?? {});
  const latest = useRef(serialized);

  useEffect(() => {
    latest.current = serialized;
  }, [serialized]);

  useEffect(() => {
    const post = (message: PreviewMessage) => frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
    const onMessage = (event: MessageEvent<PreviewMessage>) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "cms-preview:ready") post({ type: "cms-preview:draft", drafts: JSON.parse(latest.current) });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameRef]);

  useEffect(() => {
    const timer = setTimeout(() => {
      frameRef.current?.contentWindow?.postMessage({ type: "cms-preview:draft", drafts: JSON.parse(serialized) } satisfies PreviewMessage, window.location.origin);
    }, 250);
    return () => clearTimeout(timer);
  }, [frameRef, serialized]);

  useEffect(() => {
    if (refreshKey === 0) return;
    frameRef.current?.contentWindow?.postMessage({ type: "cms-preview:refresh" } satisfies PreviewMessage, window.location.origin);
  }, [frameRef, refreshKey]);
}

// Instead of the editor when its content couldn't load: an empty form could be saved over the
// live content, so there's nothing to edit until it loads
export function CmsLoadError({ title, what, onRetry }: { title: string; what: string; onRetry: () => void }) {
  return (
    <AdminShell title={title}>
      <div role="alert" className="flex max-w-lg flex-col items-start gap-3 rounded-2xl border border-crimson-light/40 bg-milk p-5 text-sm text-gray-red shadow-petal">
        <p className="font-display text-xl">We couldn&apos;t load {what}</p>
        <p className="text-[13px] leading-snug text-gray-red/80">
          The website still shows it as it was. Editing is paused until it loads, so nothing gets replaced by an empty form.
        </p>
        <Button type="button" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </AdminShell>
  );
}
