import { Suspense } from "react";
import { OnboardingGate } from "@/features/auth/components/OnboardingGate";
import PaymentConfirmation from "@/features/payments/screens/PaymentConfirmation";

export default function Page() {
  return (
    <Suspense>
      <OnboardingGate>
        <PaymentConfirmation />
      </OnboardingGate>
    </Suspense>
  );
}
