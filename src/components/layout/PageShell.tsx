import type { ReactNode } from "react";
import clsx from "clsx";
import Blush from "../ui/Blush";

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

// Wraps the content of an inner page: leaves room for the fixed top bar and adds the soft
// blush glows behind the content. The top bar and footer come from SiteLayout.
export default function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={clsx("relative min-h-[calc(100vh-4rem)] overflow-x-clip pt-12", className)}>
      <Blush className="-left-40 top-24 h-96 w-96" />
      <Blush tone="crimson" className="-right-40 top-1/2 h-96 w-96" />

      {children}
    </div>
  );
}
