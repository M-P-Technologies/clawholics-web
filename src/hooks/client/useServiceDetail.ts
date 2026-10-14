"use client";

import { useEffect, useState } from "react";
import { useParams } from "@/lib/router";
import { useToast } from "../../components/ui/ToastProvider";
import { fetchServiceById, fetchServiceGallery, type NailService } from "../../services/serviceService";
import { useStartBooking } from "../useStartBooking";

type Status = "loading" | "ready" | "missing" | "error";

// serviceService throws this for a 404
const isNotFound = (error: unknown) => error instanceof Error && error.message === "Service not found";

// A service's page in the app: the service, its photos (main photo, then its gallery), Book now
export function useServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [service, setService] = useState<NailService | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  const startBooking = useStartBooking((title, message, action) => {
    toast.show("error", title, message);
    action?.();
  });

  useEffect(() => {
    const serviceId = Number(id);
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      setStatus("missing");
      return;
    }
    let live = true;
    setStatus("loading");
    fetchServiceById(serviceId).then(
      (data) => {
        if (!live) return;
        setService(data ?? null);
        setStatus(data ? "ready" : "missing");
      },
      (error) => live && setStatus(isNotFound(error) ? "missing" : "error"),
    );
    // Photos are extra: without them the page shows the main photo only
    fetchServiceGallery(serviceId).then(
      (images) => live && setGallery(images.map((g) => g.image_url).filter(Boolean)),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [id, attempt]);

  return {
    service,
    photos: [service?.image, ...gallery].filter((url): url is string => !!url),
    status,
    retry: () => setAttempt((n) => n + 1),
    book: () => service && startBooking(service),
  };
}
