import { Suspense } from "react";
import ClientDirectory from "@/admin/ClientDirectory";

// Suspense: the screen reads ?view=leads
export default function Page() {
  return (
    <Suspense>
      <ClientDirectory />
    </Suspense>
  );
}
