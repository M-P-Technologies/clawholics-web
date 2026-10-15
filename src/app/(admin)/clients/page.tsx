import { Suspense } from "react";
import ClientDirectory from "@/features/clients/screens/ClientDirectory";

// Clients & Bookings. Suspense: the screen reads ?view=leads and ?status=
export default function Page() {
  return (
    <Suspense>
      <ClientDirectory />
    </Suspense>
  );
}
