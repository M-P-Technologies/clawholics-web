"use client";

import { useAuth,useUser } from "@clerk/nextjs";
import React,{ useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { accountQueries, isAdminProfile } from "@/lib/accountQueries";
import Button from "../ui/Button";
import { LoadingBar } from "../ui/LoadingBar";
import PageHeader from "../layout/PageHeader";
import PageShell from "../layout/PageShell";
import Section from "../layout/Section";

interface OnboardingGateProps {
  children: React.ReactNode;
}

// Every gated page mounts its own gate. The profile is one cached query (lib/accountQueries), so
// after the first check a page change shows the page at once, while the profile is refreshed
// behind it when it's no longer fresh.
export const OnboardingGate: React.FC<OnboardingGateProps> = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  // An admin in Clerk is let through without asking the directory
  const clerkAdmin = String(user?.publicMetadata?.role || "").toLowerCase() === "admin";
  const profileQuery = useQuery({
    ...accountQueries.profile(user?.id ?? "", getToken),
    enabled: isLoaded && !!isSignedIn && !!user && !clerkAdmin,
  });
  const profile = profileQuery.data;
  // Only a missing or unfinished profile means onboarding. Any other failure shows a retry
  // screen instead of bouncing the user into /onboarding.
  const needsOnboarding = profile !== undefined && !isAdminProfile(profile) && !profile?.onboarded;

  useEffect(() => {
    if (needsOnboarding) navigate("/onboarding", { replace: true });
  }, [needsOnboarding, navigate]);

  useEffect(() => {
    if (profileQuery.isError && profile === undefined) console.error("Onboarding Gate Error:", profileQuery.error);
  }, [profileQuery.isError, profileQuery.error, profile]);

  // "Try again" shows the loading screen while it asks
  const failed = profileQuery.isError && profile === undefined && !profileQuery.isFetching;
  const checking = isSignedIn && !!user && !clerkAdmin && (profile === undefined || needsOnboarding);

  if (!isLoaded || (checking && !failed)) {
    return <LoadingBar label="Checking your account" />;
  }

  if (failed) {
    return (
      <PageShell>
        <Section innerClassName="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <PageHeader
            align="center"
            title="We couldn't load your profile"
            subtitle="Please check your connection and try again."
          />
          <div className="mt-8 flex gap-4">
            <Button
              type="button"
              onClick={() => void profileQuery.refetch()}
            >
              Try again
            </Button>
            <Button variant="secondary" to="/" >
              Back to home
            </Button>
          </div>
        </Section>
      </PageShell>
    );
  }

  return <>{children}</>;
};
