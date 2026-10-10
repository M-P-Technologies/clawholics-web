import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@/lib/router";
import { fetchServiceById, fetchServiceGallery, type ServiceGalleryImage, type NailService } from "../services/serviceService";
import { fetchTacs, type Tac } from "../services/tacService";
import { useUser, useAuth } from "@clerk/nextjs";
import { startingPrice } from "../services/pricing";
import { fetchProfile } from "../services/userService";

export function useAppointment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [service, setService] = useState<NailService | null>(null);
  const [gallery, setGallery] = useState<ServiceGalleryImage[]>([]);
  const [terms, setTerms] = useState<Tac[]>([]);
  const [notFound, setNotFound] = useState(false);

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

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setNotFound(false);

        const [serviceRes, galleryRes, tacsRes] = await Promise.allSettled([
          fetchServiceById(Number(id)),
          fetchServiceGallery(Number(id)),
          fetchTacs(),
        ]);

        // SERVICE
        if (serviceRes.status === "fulfilled") {
          setService(serviceRes.value as any);
        } else {
          if (serviceRes.reason?.message === "Service not found") {
            setNotFound(true);
          } else {
            console.error(serviceRes.reason);
          }
        }

        // GALLERY
        if (galleryRes.status === "fulfilled") {
          setGallery(Array.isArray(galleryRes.value) ? galleryRes.value : []);
        }

        // TERMS
        if (tacsRes.status === "fulfilled") {
          const sorted = (
            Array.isArray(tacsRes.value) ? tacsRes.value : []
          ).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
          setTerms(sorted);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleContinue = async () => {
    if (!service) return;

    if (!isSignedIn || !user) {
      showModal(
        "Login Required",
        "Please log in to book. Once you are signed in, you can pick your artist, date and time.",
        () => navigate("/login"),
        "Go to Login",
      );

      return;
    }

    const token = await getToken();
    const profile = await fetchProfile(user.id, token);

    if (!profile || !profile.onboarded) {
      showModal(
        "Onboarding Required",
        "We need a few details, like your phone number and date of birth, so our team can reach you about your appointment. It only takes a minute.",
        () => navigate("/onboarding"),
        "Go to Onboarding",
      );
      return;
    }

    navigate("/booking", {
      state: {
        service_id: service.id,
        service_name: service.name,
        junior_price: service.junior_price,
        master_price: service.master_price,
        service_description: service.description,
        service_category: service.category,
        service_category_id: service.category_id,
        pricing_type: service.pricing_type,
        price: service.price,
        variants: service.variants,
      },
    });
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
