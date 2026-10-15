import { ClientOnly } from "@/components/shared/ClientOnly";
import Booking from "@/features/booking/screens/Booking";

export default function Page() {
  return (
    <ClientOnly>
      <Booking />
    </ClientOnly>
  );
}
