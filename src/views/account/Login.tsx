"use client";

import { SignIn } from "@clerk/nextjs";
import PageShell from "../../components/layout/PageShell";
import Section from "../../components/layout/Section";
import { clerkAppearance } from "../../components/ui/clerkAppearance";
import { useRedirectIfSignedIn } from "../../hooks/useRedirectIfSignedIn";

export default function Login() {
  useRedirectIfSignedIn();

  return (
    <PageShell>
      <Section innerClassName="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/signup"
          fallbackRedirectUrl="/"
          forceRedirectUrl="/"
          appearance={clerkAppearance}
        />
      </Section>
    </PageShell>
  );
}
