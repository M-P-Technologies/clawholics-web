import { isMasterArtist } from "@/lib/artistRoles";
// The payment step's summary labels

interface PaidAppointment {
  nailist_name: string;
  nailist_category_id?: number | null;
  nailist_is_master?: number | null;
  service_price?: number | string | null;
}

/** The artist, with a star for a master */
export const paymentArtistLabel = (appointment: PaidAppointment) =>
  isMasterArtist({ is_master: appointment.nailist_is_master, category_id: appointment.nailist_category_id }) ? `★ ${appointment.nailist_name}` : appointment.nailist_name;

/** "Starts at ₱650"; empty without a price */
export const paymentPriceLabel = (appointment: PaidAppointment) => (appointment.service_price ? `Starts at ₱${appointment.service_price}` : "");
