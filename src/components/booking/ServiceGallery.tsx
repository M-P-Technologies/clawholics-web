import { createPortal } from "react-dom";
import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/atoms";

type Image = {
  id: number;
  image_url: string;
};

export default function ServiceGallery({ images, label = "Service image gallery" }: { images: Image[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  if (!images.length) return null;

  const preview = images.slice(0, 3);
  const remaining = images.length - 3;

  return (
    <>
      {/* PREVIEW GRID */}
      <div className="grid grid-cols-3 gap-3">
        {preview.map((img, index) => (
          <Button
            variant="bare"
            key={img.id}
            type="button"
            aria-label={`Open gallery image ${index + 1}`}
            className="relative cursor-pointer overflow-hidden rounded-sm focus-visible:outline-2 focus-visible:outline-crimson"
            onClick={() => {
              setCurrent(index);
              setOpen(true);
            }}
          >
            <img
              loading="lazy"
              src={img.image_url}
              alt={`Gallery preview ${index + 1}`}
              className="aspect-square w-full object-cover transition duration-300 hover:opacity-90"
            />

            {index === 2 && remaining > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-red/60 transition duration-300 hover:bg-gray-red/50">
                <span className="text-xl font-bold text-light-orange">+{remaining}</span>
              </div>
            )}
          </Button>
        ))}
      </div>

      {/* FULLSCREEN VIEW */}
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="fixed inset-0 z-50 flex flex-col bg-gray-red/90"
          >
            <div className="relative flex flex-1 items-center justify-center overflow-hidden">
              <div
                className="flex h-full transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${current * 100}%)` }}
              >
                {images.map((img) => (
                  <div key={img.id} className="flex h-full w-full shrink-0 items-center justify-center">
                    <img
                      loading="lazy"
                      src={img.image_url}
                      alt=""
                      className="max-h-[80vh] max-w-full w-auto object-contain"
                    />
                  </div>
                ))}
              </div>

              <Button
                variant="bare"
                type="button"
                aria-label="Previous image"
                onClick={() => setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                className="absolute left-4 cursor-pointer text-light-orange transition hover:scale-110"
              >
                <ChevronLeft size={36} aria-hidden="true" />
              </Button>

              <Button
                variant="bare"
                type="button"
                aria-label="Next image"
                onClick={() => setCurrent((prev) => (prev + 1) % images.length)}
                className="absolute right-4 cursor-pointer text-light-orange transition hover:scale-110"
              >
                <ChevronRight size={36} aria-hidden="true" />
              </Button>

              <Button
                variant="bare"
                type="button"
                aria-label="Close gallery"
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 cursor-pointer text-light-orange transition hover:scale-110"
              >
                <X size={24} aria-hidden="true" />
              </Button>
            </div>

            <div className="flex gap-1 overflow-x-auto p-3 md:items-center md:justify-center">
              {images.map((img, index) => (
                <Button
                  variant="bare"
                  key={img.id}
                  type="button"
                  aria-label={`View gallery image ${index + 1}`}
                  onClick={() => setCurrent(index)}
                  className={`cursor-pointer border-2 transition hover:opacity-100 focus-visible:outline-2 focus-visible:outline-light-orange ${
                    index === current ? "scale-110 border-light-orange" : "border-transparent opacity-60"
                  }`}
                >
                  <img
                    loading="lazy"
                    src={img.image_url}
                    alt={`Gallery thumbnail ${index + 1}`}
                    className="h-14 w-20 aspect-square object-cover"
                  />
                </Button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
