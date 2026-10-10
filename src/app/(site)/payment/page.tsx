import { ClientOnly } from "@/components/guards/ClientOnly";
import { OnboardingGate } from "@/components/guards/OnboardingGate";
import Payment from "@/views/booking/Payment";

export default function Page() {
  return (
    <ClientOnly>
      <OnboardingGate>
        <Payment />
      </OnboardingGate>
    </ClientOnly>
  );
}
