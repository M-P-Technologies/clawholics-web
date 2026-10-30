

export interface Nailist {
  id: number;
  name: string;
  category_id?: number;
  /** The role's name, whether it charges the master price, and whether the artist hides it */
  position?: string;
  is_master?: number;
  hide_position?: number;
  image?: string;
}


export interface BookingState {
  service_id: number;
  service_name: string;
  junior_price: number;
  master_price: number;
  service_description: string;
  service_category: string;
  service_category_id?: number | null;
  pricing_type?: "tiered" | "flat";
  price?: number;
  variants?: { id: number; name: string; price: number }[];
  /** The service's main photo, shown in the booking summary */
  service_image?: string;
  /** An artist to have already chosen on the booking page, when the visitor came from their page */
  nailist_id?: number;
}

type BookableService = {
  id: number;
  name: string;
  junior_price: number;
  master_price: number;
  description: string;
  category: string;
  category_id: number | null;
  pricing_type: "tiered" | "flat";
  price: number;
  variants: { id: number; name: string; price: number }[];
  image?: string;
};

/** What the booking page needs to know about the service being booked (and the chosen artist). */
export const bookingStateFor = (service: BookableService, nailistId?: number): BookingState => ({
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
  service_image: service.image,
  ...(nailistId === undefined ? {} : { nailist_id: nailistId }),
});


export const parseTimeRange = (range: string) => {
  const [start, end] = range.split("-");

  const toNumber = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  return {
    start: toNumber(start),
    end: toNumber(end),
  };
};
