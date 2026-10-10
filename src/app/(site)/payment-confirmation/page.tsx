import { Suspense } from "react";
import { OnboardingGate } from "@/components/guards/OnboardingGate";
import PaymentConfirmation from "@/views/booking/PaymentConfirmation";

export default function Page() {
  return (
    <Suspense>
      <OnboardingGate>
        <PaymentConfirmation />
      </OnboardingGate>
    </Suspense>
  );
}
