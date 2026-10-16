import { Plus, X } from "lucide-react";
import { MAX_OFFERS, type HomeOffer } from "@/lib/homeSections";
import { serviceDetailPath } from "@/lib/client/clientNav";
import type { NailService } from "@/services/serviceService";
import { Button } from "@/components/atoms";
import { fieldClass, fieldLabelClass } from "@/components/features/admin/cms/fields";

interface OffersEditorProps {
  offers: HomeOffer[];
  services: NailService[];
  onChange: (offers: HomeOffer[]) => void;
  upload: (slot: string, file: File) => Promise<string | null>;
  uploading: Record<string, boolean>;
}

const NEW_OFFER: HomeOffer = { title: "", line: "", note: "", image: "", buttonLabel: "Book now", link: "/my/explore" };

type OfferText = "title" | "line" | "note" | "buttonLabel";

// The client app's Special offers banners (shown on its Home tab, after the birthday banner)
export default function OffersEditor({ offers, services, onChange, upload, uploading }: OffersEditorProps) {
  const update = (index: number, change: Partial<HomeOffer>) => onChange(offers.map((o, i) => (i === index ? { ...o, ...change } : o)));
  const linkOptions = [{ value: "/my/explore", label: "All services" }, ...services.map((s) => ({ value: serviceDetailPath(s.id), label: s.name }))];

  return (
    <div className="flex flex-col gap-3">
      {offers.map((offer, i) => {
        const slot = `offer-${i}`;
        const field = (label: string, key: OfferText) => (
          <label className="flex flex-col gap-1">
            <span className={fieldLabelClass}>{label}</span>
            <input value={offer[key]} onChange={(e) => update(i, { [key]: e.target.value })} className={fieldClass} />
          </label>
        );
        return (
          <div key={i} className="flex flex-col gap-3 rounded-xl border border-crimson-light/50 bg-milk p-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-gray-red">Offer {i + 1}</span>
              <Button type="button" variant="bare" aria-label={`Remove offer ${i + 1}`} onClick={() => onChange(offers.filter((_, j) => j !== i))} className="rounded-full p-1.5 text-crimson-ink hover:bg-crimson-light/30">
                <X size={16} aria-hidden="true" />
              </Button>
            </div>
            {field("Headline", "title")}
            {field("Line under it", "line")}
            {field("Small print", "note")}
            {field("Button text", "buttonLabel")}
            <label className="flex flex-col gap-1">
              <span className={fieldLabelClass}>Button opens</span>
              <select value={offer.link} onChange={(e) => update(i, { link: e.target.value })} className={fieldClass}>
                {linkOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className={`inline-flex w-fit cursor-pointer items-center rounded-md border border-crimson-light px-3 py-1 text-xs font-bold text-gray-red hover:bg-crimson-light/30 ${uploading[slot] ? "pointer-events-none opacity-50" : ""}`}>
              {uploading[slot] ? "Uploading…" : offer.image ? "Replace photo" : "Add a photo"}
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  const url = await upload(slot, file);
                  if (url) update(i, { image: url });
                }}
              />
            </label>
            {offer.image && (
              <Button type="button" variant="bare" onClick={() => update(i, { image: "" })} className="w-fit rounded-md px-3 py-1 text-xs font-bold text-gray-red hover:bg-crimson-light/30">
                Remove photo
              </Button>
            )}
          </div>
        );
      })}
      <Button type="button" variant="secondary" disabled={offers.length >= MAX_OFFERS} onClick={() => onChange([...offers, NEW_OFFER])} className="w-fit px-3! py-1.5! text-[13px]">
        <Plus size={14} aria-hidden="true" />
        Add an offer
      </Button>
    </div>
  );
}
