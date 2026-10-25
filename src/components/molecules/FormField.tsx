import type { ChangeEvent, ReactNode } from "react";
import clsx from "clsx";
import { errorTextClass, inputClass, labelClass } from "@/components/tokens";

interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "date";
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  max?: string;
  placeholder?: string;
  value: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  /**
   * When false the field is shown as plain text (`displayValue`) instead of an input, so the same
   * field can be read first and edited after pressing Edit. Defaults to true.
   */
  editing?: boolean;
  displayValue?: ReactNode;
  /** What is wrong, in words the person can act on. Turns the field red. */
  error?: string;
  /** Classes that turn the field red when it has an error. Defaults to the site's red border. */
  errorClass?: string;
  /** The admin's look: a small quiet label over a milk-white input, for forms inside a card */
  compact?: boolean;
}

const COMPACT_LABEL = "mb-1 block text-xs text-gray-red";
const COMPACT_INPUT =
  "w-full rounded-md border border-crimson-light bg-milk px-3 py-2 text-sm text-gray-red outline-none transition-colors placeholder:text-gray-red placeholder:italic focus:ring-2 focus:ring-crimson disabled:cursor-not-allowed disabled:bg-crimson-light/15 disabled:text-gray-red/60";

// A label, its input and its error message, so every form field is built the same way.
const DEFAULT_ERROR_CLASS = "border-danger focus:border-danger focus:ring-danger/30";

export default function FormField({
  id,
  label,
  error,
  errorClass = DEFAULT_ERROR_CLASS,
  editing = true,
  displayValue,
  compact = false,
  ...input
}: FormFieldProps) {
  if (!editing) {
    return (
      <div className="flex flex-col gap-1">
        <p className="label-caps">{label}</p>
        <p className="wrap-break-words opacity-80">{displayValue}</p>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className={compact ? COMPACT_LABEL : labelClass}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={clsx(compact ? COMPACT_INPUT : inputClass, error && errorClass)}
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className={errorTextClass}>
          {error}
        </p>
      )}
    </div>
  );
}
