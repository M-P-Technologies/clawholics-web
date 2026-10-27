import { useState } from "react";
import { ListChecks, Plus, RotateCcw, X } from "lucide-react";
import { MAX_STRIP_SLIDES, type StripSlide } from "@/lib/homeSections";
import type { NailService } from "@/services/serviceService";
import { Button, IconButton, Select } from "@/components/atoms";
import { DragHandle, SortableList } from "@/components/molecules";
import PhotoPickerDialog from "@/components/features/admin/cms/PhotoPickerDialog";
import { useServiceVisitPhotos } from "@/hooks/admin/useServiceVisitPhotos";
import { fieldClass, fieldLabelClass } from "@/components/features/admin/cms/fields";

interface StripEditorProps {
  services: NailService[];
  strip: StripSlide[] | null;
  onChange: (strip: StripSlide[] | null) => void;
}

// The service strip's slides. Until slides are chosen it shows every service with a photo; choosing
// starts from exactly that, so nothing on the page moves until something is changed.
export default function StripEditor({ services, strip, onChange }: StripEditorProps) {
  // The slide (its service) whose photo is being chosen
  const [picking, setPicking] = useState<number | null>(null);
  // Only the photos added to completed visits of that service
  const visitPhotos = useServiceVisitPhotos(picking);
  const withPhotos = services.filter((s) => s.image);
  const serviceOf = (id: number) => services.find((s) => s.id === id);

  if (!strip) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl bg-crimson-light/20 p-3 text-[13px] leading-snug text-gray-red">
        <p className="text-[13px] leading-snug">
          Right now the strip shows every service that has a photo ({withPhotos.length}), using each service&apos;s name and photo.
        </p>
        <Button
          type="button"
          variant="bare"
          disabled={withPhotos.length === 0}
          onClick={() => onChange(withPhotos.slice(0, MAX_STRIP_SLIDES).map((s) => ({ serviceId: s.id, title: "", image: "" })))}
          className="gap-1 text-[13px] font-bold text-berry underline underline-offset-4 disabled:opacity-50"
        >
          Choose the slides
          <ListChecks size={16} aria-hidden="true" />
        </Button>
      </div>
    );
  }

  const unused = services.filter((s) => !strip.some((slide) => slide.serviceId === s.id));
  const update = (index: number, change: Partial<StripSlide>) => onChange(strip.map((slide, i) => (i === index ? { ...slide, ...change } : slide)));
  const keyed = strip.map((slide) => ({ ...slide, id: slide.serviceId }));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-snug text-gray-red">The price, hours and Book button always come from the service. Drag to change the order.</p>
      {keyed.length > 0 && (
        <SortableList
          items={keyed}
          getItemId={(slide) => slide.id}
          onReorder={(items) => onChange(items.map(({ serviceId, title, image }) => ({ serviceId, title, image })))}
          className="flex flex-col gap-3"
          renderItem={(slide, { dragHandleProps, isDragging }) => {
            const index = strip.findIndex((s) => s.serviceId === slide.serviceId);
            const service = serviceOf(slide.serviceId);
            const photo = slide.image || service?.image || "";
            return (
              <div className={`flex flex-col gap-3 rounded-xl border border-crimson-light/50 bg-milk p-3 ${isDragging ? "opacity-0" : ""}`}>
                <div className="flex items-center gap-3">
                  <DragHandle {...dragHandleProps} />
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- R2 images, sized by CSS like the rest of the admin
                    <img src={photo} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-crimson-light/30 text-center text-[10px] text-gray-red">No photo</span>
                  )}
                  <Select
                    aria-label="Service"
                    value={String(slide.serviceId)}
                    onChange={(e) => update(index, { serviceId: Number(e.target.value), title: "", image: "" })}
                    className="min-w-0 flex-1"
                    triggerClassName="py-1.5"
                    options={[
                      ...[service, ...unused].filter((s): s is NailService => !!s).map((s) => ({ value: String(s.id), label: s.name })),
                      ...(service ? [] : [{ value: String(slide.serviceId), label: "A deleted service" }]),
                    ]}
                  />
                  <IconButton size="sm" icon={X} label={`Remove the ${service?.name ?? "deleted service"} slide`} onClick={() => onChange(strip.filter((_, i) => i !== index))} />
                </div>
                <label className="flex flex-col gap-1">
                  <span className={fieldLabelClass}>Title on the photo</span>
                  <input value={slide.title} placeholder={service?.name ?? ""} onChange={(e) => update(index, { title: e.target.value })} className={fieldClass} />
                </label>
                <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
                  <Button type="button" variant="bare" onClick={() => setPicking(slide.serviceId)} className="rounded-md border border-crimson-light px-3 py-1 font-bold text-gray-red hover:bg-crimson-light/30">
                    {slide.image ? "Change photo" : "Use another photo"}
                  </Button>
                  {slide.image && (
                    <Button type="button" variant="bare" onClick={() => update(index, { image: "" })} className="rounded-md px-3 py-1 font-bold text-gray-red hover:bg-crimson-light/30">
                      Use the service photo
                    </Button>
                  )}
                  {!photo && <span className="text-danger-ink">This slide is hidden until it has a photo.</span>}
                </div>
              </div>
            );
          }}
          renderOverlay={(slide) => (
            <div className="rounded-xl border border-crimson bg-milk p-3 text-[13px] font-bold text-gray-red shadow-xl">{slide.title || serviceOf(slide.serviceId)?.name}</div>
          )}
        />
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          type="button"
          variant="secondary"
          disabled={strip.length >= MAX_STRIP_SLIDES || unused.length === 0}
          onClick={() => onChange([...strip, { serviceId: (unused.find((s) => s.image) ?? unused[0]).id, title: "", image: "" }])}
        >
          <Plus size={16} aria-hidden="true" />
          Add a slide
        </Button>
        <Button type="button" variant="bare" onClick={() => onChange(null)} className="gap-1 rounded-md px-3 py-1.5 text-sm font-bold text-gray-red hover:bg-crimson-light/30">
          <RotateCcw size={16} aria-hidden="true" />
          Show every service again
        </Button>
      </div>

      <PhotoPickerDialog
        open={picking !== null}
        onClose={() => setPicking(null)}
        choices={visitPhotos.photos}
        taken={[]}
        loading={visitPhotos.isLoading}
        emptyText="No completed visit of this service has a photo yet. Add one when completing a visit."
        onPick={(url) => {
          const index = strip.findIndex((slide) => slide.serviceId === picking);
          if (index >= 0) update(index, { image: url });
        }}
      />
    </div>
  );
}
