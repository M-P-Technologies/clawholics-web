import { useState, useId } from "react";
import { Minus, Plus } from "lucide-react";
import type { Faq } from "../../types";
import { Button } from "@/components/atoms";

function FaqItem({ faq }: { faq: Faq }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <li className="border-b border-crimson-light/80">
      <Button
        variant="bare"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 whitespace-normal py-3 text-left md:gap-9"
      >
        <span className="min-w-0 flex-1 font-display text-base tracking-wide text-gray-red md:text-lg">
          {faq.question}
        </span>
        {open ? (
          <Minus size={20} className="shrink-0 text-crimson" aria-hidden="true" />
        ) : (
          <Plus size={20} className="shrink-0 text-crimson" aria-hidden="true" />
        )}
      </Button>
      <div
        id={panelId}
        role="region"
        className={`grid transition-all duration-300 ${
          open ? "grid-rows-[1fr] pb-3 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <p className="overflow-hidden whitespace-pre-line copy-body">
          {faq.answer}
        </p>
      </div>
    </li>
  );
}

export default function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <ul className="border-t border-crimson-light/80">
      {faqs.map((faq) => (
        <FaqItem key={faq.id} faq={faq} />
      ))}
    </ul>
  );
}
