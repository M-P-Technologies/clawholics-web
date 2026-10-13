import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { useNavigate, useParams } from "@/lib/router";
import type { NailistGalleryImage } from "../services/nailistService";
import type { NailService } from "../services/serviceService";
import { artistPath, findBySlugOrId } from "../utils/slug";
import { useStartBooking } from "./useStartBooking";

const NO_GALLERY: NailistGalleryImage[] = [];

// One artist's page: their details, a gallery of their work, and the way into booking them.
export function useArtistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  // The address names the artist (/artists/miss-max); older ones carry the id
  const idInAddress = id && /^\d+$/.test(id) ? Number(id) : null;
  const listQuery = useQuery(publicQueries.nailists());
  const match = id && listQuery.data ? findBySlugOrId(listQuery.data, id) : null;
  // Without the list, only an id in the address can still be followed
  const artistId = match ? match.id : idInAddress;
  const listLoaded = !!listQuery.data;

  const enabled = artistId !== null;
  const artistQuery = useQuery({ ...publicQueries.nailist(artistId ?? 0), enabled });
  // The gallery and the service list are extras: if either fails, the page still shows the artist
  const galleryQuery = useQuery({ ...publicQueries.nailistGallery(artistId ?? 0), enabled });
  const servicesQuery = useQuery(publicQueries.services());

  const nailist = artistQuery.data ?? null;
  const gallery = galleryQuery.data ?? NO_GALLERY;
  const services = useMemo(() => (Array.isArray(servicesQuery.data) ? servicesQuery.data : []), [servicesQuery.data]);

  const notFound = !id || (listLoaded && artistId === null) || artistQuery.data === null;
  // A failed refresh keeps showing the copy already loaded
  const error = !notFound && (artistId === null ? listQuery.isError : artistQuery.isError && !nailist);
  // The page waits for the extras too, so it doesn't shift as they arrive
  const loading =
    !notFound && !error && (artistId === null || artistQuery.isPending || galleryQuery.isPending || servicesQuery.isPending);

  // An id in the address is swapped for the artist's name
  useEffect(() => {
    if (nailist && idInAddress !== null) navigate(artistPath(nailist), { replace: true });
  }, [nailist, idInAddress, navigate]);

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

  const reload = () => {
    void listQuery.refetch();
    if (enabled) {
      void artistQuery.refetch();
      void galleryQuery.refetch();
    }
    void servicesQuery.refetch();
  };
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
