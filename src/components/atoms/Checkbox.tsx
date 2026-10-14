import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

export default function Checkbox({ className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return <input type="checkbox" className={clsx("h-4 w-4 shrink-0 cursor-pointer accent-crimson", className)} {...rest} />;
}
