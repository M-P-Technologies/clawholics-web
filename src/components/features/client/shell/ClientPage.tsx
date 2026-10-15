"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { IconButton } from "@/components/atoms";

// An inner screen of the app (booking steps): a back arrow and the title, then the content
export default function ClientPage({ title, back, children }: { title: string; back?: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-10 pt-4 lg:pt-8">
      <header className="flex items-center gap-3">
        <IconButton label="Back" icon={ArrowLeft} tone="milk" onClick={() => (back ? navigate(back) : navigate(-1))} />
        <h1 className="font-display text-2xl font-normal normal-case tracking-normal text-gray-red">{title}</h1>
      </header>
      {children}
    </div>
  );
}
