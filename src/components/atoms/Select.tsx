import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEventHandler,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { inputClass } from "@/components/tokens";

export interface SelectOption {
  value: string;
  label: ReactNode;
  /** Shown before the label, for example a photo */
  leading?: ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  value: string | number;
  /**
   * Called with the chosen value in `e.target.value`, the same shape a native <select> gives,
   * so existing handlers keep working.
   */
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  /** Either pass `options`, or <option value="..."> children as with a native select */
  options?: SelectOption[];
  children?: ReactNode;
  /** Shown when no option matches the value */
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  /** Classes for the whole control, for example a width */
  className?: string;
  /** Classes for the closed box, to make it smaller */
  triggerClassName?: string;
  onFocus?: FocusEventHandler<HTMLButtonElement>;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

// <option> elements (also inside arrays and fragments) -> options
function optionsFromChildren(children: ReactNode): SelectOption[] {
  const out: SelectOption[] = [];
  const visit = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>;
      if (el.type === "option") {
        out.push({ value: String(el.props.value ?? el.props.children), label: el.props.children, disabled: el.props.disabled });
      } else if (el.props.children) {
        visit(el.props.children); // fragments
      }
    });
  };
  visit(children);
  return out;
}

// Branded replacement for the browser's own select list: the same cream card, pink border
// and crimson highlight as the rest of the site, and it can show a picture next to each option.
export default function Select({
  value,
  onChange,
  options: optionsProp,
  children,
  placeholder = "Select",
  disabled = false,
  id,
  className,
  triggerClassName,
  onFocus,
  onClick,
  ...aria
}: SelectProps) {
  const options = optionsProp ?? optionsFromChildren(children);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === String(value));

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (option: SelectOption) => {
    if (option.disabled) return;
    onChange?.({ target: { value: option.value }, currentTarget: { value: option.value } } as unknown as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };

  const openList = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === String(value))));
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + options.length) % options.length);
    } else if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    }
  };

  return (
    <div ref={rootRef} className={clsx("relative", className ?? "w-full")} onKeyDown={onKeyDown}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={aria["aria-label"]}
        disabled={disabled}
        onFocus={onFocus}
        onClick={(e) => {
          onClick?.(e);
          if (open) setOpen(false);
          else openList();
        }}
        className={clsx(
          inputClass,
          "flex cursor-pointer items-center gap-2 py-2 pr-10 text-left text-sm",
          triggerClassName,
        )}
      >
        {selected?.leading}
        <span className={clsx("min-w-0 flex-1 truncate", !selected && "text-gray-red/50")}>
          {selected ? selected.label : placeholder}
        </span>
      </button>

      <ChevronDown
        aria-hidden="true"
        size={16}
        className={clsx(
          "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-crimson transition-transform duration-200",
          open && "rotate-180",
        )}
      />

      {open && (
        <ul
          role="listbox"
          aria-label={aria["aria-label"]}
          className="absolute left-0 top-full z-30 mt-2 flex max-h-72 min-w-full flex-col gap-1 overflow-y-auto rounded-sm border border-crimson-light bg-light-orange p-2 shadow-xl shadow-crimson/20"
        >
          {options.map((option, index) => {
            const isSelected = option.value === String(value);
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActive(index)}
                  className={clsx(
                    "flex w-full cursor-pointer items-center gap-4 whitespace-nowrap rounded-sm px-4 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    index === active ? "bg-crimson-light/30" : "",
                    isSelected ? "font-bold text-crimson" : "text-gray-red",
                  )}
                >
                  {option.leading}
                  <span className="flex-1">{option.label}</span>
                  {isSelected && <Check size={16} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
