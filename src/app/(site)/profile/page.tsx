import { Suspense } from "react";
import { ClientOnly } from "@/components/shared/ClientOnly";
import { OnboardingGate } from "@/features/auth/components/OnboardingGate";
import Profile from "@/features/profile/screens/Profile";

export default function Page() {
  return (
    <Suspense>
      <ClientOnly>
        <OnboardingGate>
          <Profile />
        </OnboardingGate>
      </ClientOnly>
    </Suspense>
  );
}
