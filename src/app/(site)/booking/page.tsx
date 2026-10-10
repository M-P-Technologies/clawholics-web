import { ClientOnly } from "@/components/guards/ClientOnly";
import Booking from "@/views/booking/Booking";

export default function Page() {
  return (
    <ClientOnly>
      <Booking />
    </ClientOnly>
  );
}
