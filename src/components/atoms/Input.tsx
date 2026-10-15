import type { InputHTMLAttributes, Ref } from "react";
import clsx from "clsx";
import { field } from "../tokens";

// The admin's text input
export default function Input({ className, ref, ...rest }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={clsx(field.input, className)} {...rest} />;
}
