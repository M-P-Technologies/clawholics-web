import type { ReactNode } from "react";
import { Clock, ReceiptText, Wallet } from "lucide-react";
import { startingPrice } from "../../services/pricing";

// One text size for all the explanatory text below, so the description, prices and deposit read alike
// (a size set on a wrapper would not reach the <p>s: the site gives every <p> its own size)
const bodyClass = "text-base leading-relaxed";

type PriceLine = { id: string; label: string; amount: string };

interface ServiceOverviewProps {
  service: {
    name: string;
    category: string;
    description: string;
    duration: string;
    pricing_type?: "tiered" | "flat";
    master_price: number;
    junior_price: number;
    price?: number;
    variants?: { id?: number; price: number }[];
  };
  priceLines: PriceLine[];
}

const Stat = ({ icon, value, label }: { icon: ReactNode; value: string; label: string }) => (
  <div className="flex min-w-0 flex-col items-center gap-1 text-center">
    <span className="text-crimson-ink">{icon}</span>
    <span className="text-base font-bold leading-tight text-gray-red">{value}</span>
    <span className="text-xs text-gray-red">{label}</span>
  </div>
);

// The phone layout of a service's details: the name with its starting price, three quick facts,
// then the description under "About this service" and the pricing in full. (From `lg` up the
// details page uses its table instead.)
export default function ServiceOverview({ service, priceLines }: ServiceOverviewProps) {
  const from = startingPrice(service);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 font-display text-2xl font-normal uppercase leading-tight tracking-wider text-gray-red sm:text-3xl sm:tracking-widest">
          {service.name}
        </h1>
        {from !== null && (
          <p className="shrink-0 text-right">
            <span className="block text-xs text-gray-red">Starts at</span>
            <span className="text-xl font-bold text-crimson-ink">₱{from}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 border-y border-crimson-light/80 py-3">
        <Stat icon={<Clock size={28} strokeWidth={1.5} aria-hidden="true" />} value={service.duration} label="Duration" />
        <Stat icon={<Wallet size={28} strokeWidth={1.5} aria-hidden="true" />} value="₱500" label="Booking deposit" />
        <Stat icon={<ReceiptText size={28} strokeWidth={1.5} aria-hidden="true" />} value="₱400" label="Deductible" />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="label-caps">About this service</h2>
        <p className={`${bodyClass} text-gray-red`}>{service.description}</p>
      </div>

      <div className="flex flex-col gap-1 text-gray-red">
        <h2 className="label-caps">Price</h2>
        {priceLines.map((line) => (
          <p key={line.id} className={bodyClass}>
            <span className="font-bold">{line.label}</span>₱{line.amount}
          </p>
        ))}
        <p className={`${bodyClass} text-gray-red`}>
          Final fees vary depending on the complexity of your design. The rest of the payment is settled after your session.
        </p>
      </div>

      <div className="flex flex-col gap-1 text-gray-red">
        <h2 className="label-caps">Deposit</h2>
        <p className={bodyClass}>
          To secure your slot, a <b>₱500</b> booking deposit is required at checkout.
        </p>
        <ul className={`ml-3 list-disc text-gray-red ${bodyClass}`}>
          <li>₱400 is deductible from your final bill.</li>
          <li>₱100 is a non-refundable reservation fee.</li>
        </ul>
      </div>
    </div>
  );
}
