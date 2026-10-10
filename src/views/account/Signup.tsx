"use client";

import { SignUp } from "@clerk/nextjs";
import PageShell from "../../components/layout/PageShell";
import Section from "../../components/layout/Section";
import { clerkAppearance } from "../../components/ui/clerkAppearance";
import { useRedirectIfSignedIn } from "../../hooks/useRedirectIfSignedIn";

export default function Signup() {
  useRedirectIfSignedIn();
  
  return (
    <PageShell>
      <Section innerClassName="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <SignUp
          routing="path"
          path="/signup"
          signInUrl="/login"
          fallbackRedirectUrl="/"
          forceRedirectUrl="/"
          appearance={clerkAppearance}
        />
      </Section>
    </PageShell>
  );
}
