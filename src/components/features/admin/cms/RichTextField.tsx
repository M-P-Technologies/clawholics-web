import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Pilcrow, Redo2, RemoveFormatting, Undo2, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/atoms";
import { fieldClass, fieldLabelClass } from "@/components/features/admin/cms/fields";

interface RichTextFieldProps {
  label: string;
  /** The HTML to start from; the field is reset to it whenever `resetKey` changes */
  initialHtml: string;
  resetKey: number;
  onChange: (html: string) => void;
}

type Command = { label: string; Icon: LucideIcon; run: () => void };

// Formatted text for long pages like the privacy policy: a toolbar over an editable area. The
// browser's editing commands do the work, so the text keeps whatever formatting it came with.
export default function RichTextField({ label, initialHtml, resetKey, onChange }: RichTextFieldProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");

  // Fill the area when it's first shown or reset; afterwards the browser owns its contents
  useEffect(() => {
    if (areaRef.current) areaRef.current.innerHTML = initialHtml;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on reset, not on every change
  }, [resetKey]);

  const changed = () => onChange(areaRef.current?.innerHTML ?? "");
  const exec = (command: string, value?: string) => {
    areaRef.current?.focus();
    document.execCommand(command, false, value);
    changed();
  };

  const commands: Command[] = [
    { label: "Heading", Icon: Heading2, run: () => exec("formatBlock", "h2") },
    { label: "Subheading", Icon: Heading3, run: () => exec("formatBlock", "h3") },
    { label: "Paragraph", Icon: Pilcrow, run: () => exec("formatBlock", "p") },
    { label: "Bold", Icon: Bold, run: () => exec("bold") },
    { label: "Italic", Icon: Italic, run: () => exec("italic") },
    { label: "Bulleted list", Icon: List, run: () => exec("insertUnorderedList") },
    { label: "Numbered list", Icon: ListOrdered, run: () => exec("insertOrderedList") },
    {
      label: "Link",
      Icon: Link2,
      run: () => {
        // Keep the selected words, since typing the address moves the focus away
        const selection = window.getSelection();
        savedRange.current = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
        setLinkOpen(true);
      },
    },
    { label: "Clear formatting", Icon: RemoveFormatting, run: () => exec("removeFormat") },
    { label: "Undo", Icon: Undo2, run: () => exec("undo") },
    { label: "Redo", Icon: Redo2, run: () => exec("redo") },
  ];

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!/^(https?:\/\/\S+|mailto:\S+)$/i.test(url) || !savedRange.current) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(savedRange.current);
    exec("createLink", url);
    setLinkOpen(false);
    setLinkUrl("https://");
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className={fieldLabelClass}>{label}</span>
      <div className="overflow-hidden rounded-md border border-crimson-light bg-milk focus-within:ring-2 focus-within:ring-crimson">
        <div role="toolbar" aria-label={`${label} formatting`} className="flex flex-wrap gap-0.5 border-b border-crimson-light/60 bg-light-orange/40 p-1">
          {commands.map(({ label: name, Icon, run }) => (
            <button
              key={name}
              type="button"
              title={name}
              aria-label={name}
              // Keep the selection in the text while the button is pressed
              onMouseDown={(e) => e.preventDefault()}
              onClick={run}
              className="flex h-8 w-8 items-center justify-center rounded text-gray-red transition-colors hover:bg-crimson-light/40 focus-visible:outline-2 focus-visible:outline-crimson"
            >
              <Icon size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
        {linkOpen && (
          <div className="flex flex-wrap items-center gap-3 border-b border-crimson-light/60 p-2">
            <input
              aria-label="Link address"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyLink())}
              className={clsx(fieldClass, "min-w-0 flex-1 py-1.5!")}
              autoFocus
            />
            <Button type="button" onClick={applyLink} className="px-3! py-1.5! text-xs">
              Add link
            </Button>
            <Button type="button" variant="secondary" onClick={() => setLinkOpen(false)} className="px-3! py-1.5! text-xs">
              Cancel
            </Button>
            <p className="w-full text-xs text-gray-red">Select the words first, then type a web address (https://…) or an email (mailto:…).</p>
          </div>
        )}
        <div
          ref={areaRef}
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          contentEditable
          suppressContentEditableWarning
          onInput={changed}
          onBlur={changed}
          className="legal-text max-h-[60vh] min-h-64 overflow-y-auto px-3 py-2 text-sm text-gray-red outline-none"
        />
      </div>
    </div>
  );
}
