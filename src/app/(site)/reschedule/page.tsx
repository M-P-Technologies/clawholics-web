import { ClientOnly } from "@/components/guards/ClientOnly";
import { OnboardingGate } from "@/components/guards/OnboardingGate";
import Reschedule from "@/views/booking/Reschedule";

export default function Page() {
  return (
    <ClientOnly>
      <OnboardingGate>
        <Reschedule />
      </OnboardingGate>
    </ClientOnly>
  );
}
