import { Suspense } from "react";
import { ClientOnly } from "@/components/guards/ClientOnly";
import { OnboardingGate } from "@/components/guards/OnboardingGate";
import Profile from "@/views/account/Profile";

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
