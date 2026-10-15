import { usePreviewVersion } from "@/lib/cmsPreview";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "@/lib/router";
import {
  fetchNailists,
  fetchNailistById,
  fetchNailistGallery,
  type Nailist,
  type NailistGalleryImage,
} from "../services/nailistService";
import { fetchServices, type NailService } from "../services/serviceService";
import { artistPath, findBySlugOrId } from "../utils/slug";
import { useStartBooking } from "./useStartBooking";

// One artist's page: their details, a gallery of their work, and the way into booking them.
export function useArtistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [nailist, setNailist] = useState<Nailist | null>(null);
  const [gallery, setGallery] = useState<NailistGalleryImage[]>([]);
  const [services, setServices] = useState<NailService[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // In the admin editor's preview, fetch again when the unsaved changes do
  const previewVersion = usePreviewVersion();

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
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(false);

    (async () => {
      // The address names the artist (/artists/miss-max); older ones carry the id
      let artistId = /^\d+$/.test(id) ? Number(id) : null;
      try {
        const list = await fetchNailists();
        const match = Array.isArray(list) ? findBySlugOrId(list, id) : null;
        if (match) artistId = match.id;
      } catch {
        // Without the list, only an id in the address can still be followed
        if (artistId === null) {
          if (!cancelled) {
            setError(true);
            setLoading(false);
          }
          return;
        }
      }
      if (cancelled) return;
      if (artistId === null) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // The gallery and the service list are extras: if either fails, the page still shows the artist
      const [artistRes, galleryRes, servicesRes] = await Promise.allSettled([
        fetchNailistById(artistId),
        fetchNailistGallery(artistId),
        fetchServices(),
      ]);
      if (cancelled) return;

      if (artistRes.status === "rejected") setError(true);
      else if (artistRes.value === null) setNotFound(true);
      else {
        setNailist(artistRes.value);
        // An id in the address is swapped for the artist's name
        if (/^\d+$/.test(id)) navigate(artistPath(artistRes.value), { replace: true });
      }

      setGallery(galleryRes.status === "fulfilled" ? galleryRes.value : []);
      setServices(servicesRes.status === "fulfilled" && Array.isArray(servicesRes.value) ? servicesRes.value : []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, attempt, previewVersion]);

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
    /** Phones: the portrait first, then the photos of their work, in one carousel */
    carouselPhotos: nailist ? [{ id: "portrait", image_url: nailist.image }, ...gallery] : [],
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
