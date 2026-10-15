import { ClientOnly } from "@/components/shared/ClientOnly";
import { OnboardingGate } from "@/features/auth/components/OnboardingGate";
import Payment from "@/features/payments/screens/Payment";

export default function Page() {
  return (
    <ClientOnly>
      <OnboardingGate>
        <Payment />
      </OnboardingGate>
    </ClientOnly>
  );
}
