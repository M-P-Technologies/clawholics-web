

export interface Nailist {
  id: number;
  name: string;
  category_id?: number;
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
}


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
