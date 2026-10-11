import { useEffect, useMemo, useState } from "react";
import { useParams } from "@/lib/router";
import {
  fetchNailistById,
  fetchNailistGallery,
  type Nailist,
  type NailistGalleryImage,
} from "../services/nailistService";
import { fetchServices, type NailService } from "../services/serviceService";
import { useStartBooking } from "./useStartBooking";

// One artist's page: their details, a gallery of their work, and the way into booking them.
export function useArtistDetail() {
  const { id } = useParams();

  const [nailist, setNailist] = useState<Nailist | null>(null);
  const [gallery, setGallery] = useState<NailistGalleryImage[]>([]);
  const [services, setServices] = useState<NailService[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalButtonText, setModalButtonText] = useState("OK");
  const [modalAction, setModalAction] = useState<(() => void) | undefined>();

  const showModal = (title: string, message: string, action?: () => void, buttonText = "OK") => {
    setModalTitle(title);
    setModalMessage(message);
    setModalAction(() => action);
    setModalButtonText(buttonText);
    setModalOpen(true);
  };

  const startBooking = useStartBooking(showModal);

  useEffect(() => {
    if (!id || !/^\d+$/.test(id)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(false);

    // The gallery and the service list are extras: if either fails, the page still shows the artist
    Promise.allSettled([fetchNailistById(Number(id)), fetchNailistGallery(Number(id)), fetchServices()]).then(
      ([artistRes, galleryRes, servicesRes]) => {
        if (cancelled) return;

        if (artistRes.status === "rejected") setError(true);
        else if (artistRes.value === null) setNotFound(true);
        else setNailist(artistRes.value);

        setGallery(galleryRes.status === "fulfilled" ? galleryRes.value : []);
        setServices(servicesRes.status === "fulfilled" && Array.isArray(servicesRes.value) ? servicesRes.value : []);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  // The services this artist offers, as full services (the booking page needs their prices)
  const offeredServices = useMemo(
    () => (nailist?.service_ids ? services.filter((service) => nailist.service_ids!.includes(service.id)) : []),
    [nailist, services],
  );

  const pickService = (service: NailService) => {
    if (!nailist) return;
    setPickerOpen(false);
    startBooking(service, nailist.id);
  };

  const reload = () => setAttempt((n) => n + 1);
  const closeModal = () => setModalOpen(false);

  return {
    loading,
    notFound,
    error,
    reload,
    nailist,
    gallery,
    offeredServices,
    pickerOpen,
    setPickerOpen,
    pickService,
    modalOpen,
    modalTitle,
    modalMessage,
    modalButtonText,
    modalAction,
    closeModal,
  };
}
