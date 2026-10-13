import { Suspense } from "react";
import Appointments from "@/admin/Appointments";

export default function Page() {
  return (
    <Suspense>
      <Appointments />
    </Suspense>
  );
}
