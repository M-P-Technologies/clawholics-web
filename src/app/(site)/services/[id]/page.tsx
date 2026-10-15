import { OnboardingGate } from "@/features/auth/components/OnboardingGate";
import Appointment from "@/features/booking/screens/Appointment";

export default function Page() {
  return (
    <OnboardingGate>
      <Appointment />
    </OnboardingGate>
  );
}
