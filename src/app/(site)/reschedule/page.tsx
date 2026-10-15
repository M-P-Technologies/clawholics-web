import { ClientOnly } from "@/components/shared/ClientOnly";
import { OnboardingGate } from "@/features/auth/components/OnboardingGate";
import Reschedule from "@/features/booking/screens/Reschedule";

export default function Page() {
  return (
    <ClientOnly>
      <OnboardingGate>
        <Reschedule />
      </OnboardingGate>
    </ClientOnly>
  );
}
