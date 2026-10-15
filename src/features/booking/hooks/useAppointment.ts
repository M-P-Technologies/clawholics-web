import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueries, SERVICE_NOT_FOUND } from "@/lib/tanstack-query/publicQueries";
import { useNavigate, useParams } from "@/lib/router";
import type { ServiceGalleryImage } from "../../catalog/api/serviceService";
import { startingPrice } from "../lib/pricing";
import { findBySlugOrId, servicePath } from "../../../lib/slug";
import { useStartBooking } from "./useStartBooking";

const NO_GALLERY: ServiceGalleryImage[] = [];

export function useAppointment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalButtonText, setModalButtonText] = useState("OK");
  const [modalAction, setModalAction] = useState<(() => void) | undefined>();

  const showModal = (
    title: string,
    message: string,
    action?: () => void,
    buttonText = "OK",
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalAction(() => action);
    setModalButtonText(buttonText);
    setModalOpen(true);
  };

  // The address names the service (/services/hard-gel); older ones carry its id
  const idInAddress = id && /^\d+$/.test(id) ? Number(id) : null;
  const listQuery = useQuery(publicQueries.services());
  const match = id && listQuery.data ? findBySlugOrId(listQuery.data, id) : null;
  // Without the list, only an id in the address can still be followed
  const serviceId = match ? match.id : idInAddress;

  const enabled = serviceId !== null;
  const serviceQuery = useQuery({ ...publicQueries.service(serviceId ?? 0), enabled });
  // The gallery and the terms are extras: the page shows the service without them
  const galleryQuery = useQuery({ ...publicQueries.serviceGallery(serviceId ?? 0), enabled });
  const tacsQuery = useQuery(publicQueries.tacs());

  const service = serviceQuery.data ?? null;
  const gallery = galleryQuery.data ?? NO_GALLERY;
  const terms = useMemo(
    () => [...(Array.isArray(tacsQuery.data) ? tacsQuery.data : [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [tacsQuery.data],
  );

  const notFound =
    !id || (!!listQuery.data && serviceId === null) || serviceQuery.error?.message === SERVICE_NOT_FOUND;
  // Waits for the extras too, so the page doesn't shift as they arrive. If neither the list nor
  // the service can load, the page stops loading and shows no service.
  const loading =
    !notFound &&
    (serviceId === null ? listQuery.isPending : serviceQuery.isPending || galleryQuery.isPending || tacsQuery.isPending);

  // An id in the address is swapped for the service's name
  useEffect(() => {
    if (service && idInAddress !== null) navigate(servicePath(service), { replace: true });
  }, [service, idInAddress, navigate]);

  const startBooking = useStartBooking(showModal);

  const handleContinue = async () => {
    if (!service) return;
    await startBooking(service);
  };

  const closeModal = () => setModalOpen(false);

  // The price lines of the details table: each option, or the flat price, or each technician tier
  const money = (amount: number) => amount.toFixed(2);
  const priceLines: { id: string; label: string; amount: string }[] = !service
    ? []
    : service.variants?.length
      ? service.variants.map((v) => ({ id: `v${v.id}`, label: `${v.name}: `, amount: money(v.price) }))
      : service.pricing_type === "flat"
        ? [{ id: "flat", label: "Starts at ", amount: money(startingPrice(service) ?? 0) }]
        : [
            ...(service.master_price > 0
              ? [{ id: "master", label: "Master technician: starts at ", amount: money(service.master_price) }]
              : []),
            ...(service.junior_price > 0
              ? [{ id: "junior", label: "Junior technician: starts at ", amount: money(service.junior_price) }]
              : []),
          ];

  return { priceLines, navigate, loading, service, gallery, terms, notFound, modalOpen, setModalOpen, modalTitle, modalMessage, modalButtonText, modalAction, handleContinue, closeModal };
}
