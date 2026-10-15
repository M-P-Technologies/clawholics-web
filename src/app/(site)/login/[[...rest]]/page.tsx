"use client";

import { SignIn } from "@clerk/nextjs";
import { AuthTabs } from "@/components/molecules";
import PageShell from "@/components/layout/PageShell";
import Section from "@/components/layout/Section";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { useRedirectIfSignedIn } from "@/hooks/useRedirectIfSignedIn";

export default function Login() {
  useRedirectIfSignedIn();

  return (
    <PageShell>
      <Section innerClassName="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-start gap-4 max-lg:pt-4 lg:justify-center">
        <AuthTabs current="login" />
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/signup"
          fallbackRedirectUrl="/my"
          forceRedirectUrl="/my"
          appearance={clerkAppearance}
        />
      </Section>
    </PageShell>
  );
}
