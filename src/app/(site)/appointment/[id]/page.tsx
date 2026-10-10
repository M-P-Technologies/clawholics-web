import { OnboardingGate } from "@/components/guards/OnboardingGate";
import Appointment from "@/views/booking/Appointment";

export default function Page() {
  return (
    <OnboardingGate>
      <Appointment />
    </OnboardingGate>
  );
}
