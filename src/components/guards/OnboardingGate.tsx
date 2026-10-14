"use client";

import { useAuth,useUser } from "@clerk/nextjs";
import React,{ useEffect,useState } from "react";
import { useNavigate } from "@/lib/router";
import { fetchProfile,isMissingProfile } from "../../services/userService";
import { Button, LoadingBar } from "@/components/atoms";
import { SectionHeader } from "@/components/molecules";
import PageShell from "../layout/PageShell";
import Section from "../layout/Section";

interface OnboardingGateProps {
  children: React.ReactNode;
}

// Users who already passed the check. Every gated page mounts its own gate, so without
// this each page change would show the loading screen again while the profile is re-fetched.
const verifiedUsers = new Set<string>();

export const OnboardingGate: React.FC<OnboardingGateProps> = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const alreadyVerified = !!user && verifiedUsers.has(user.id);
  const [checking, setChecking] = useState(!alreadyVerified);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!isLoaded) return;
      setFailed(false);

      if (!isSignedIn || !user) {
        setChecking(false);
        return;
      }

      // 1. Clerk-side check
      const clerkRole = String(user.publicMetadata?.role || "").toLowerCase();
      if (clerkRole === "admin") {
        verifiedUsers.add(user.id);
        setChecking(false);
        return;
      }

      try {
        const token = await getToken();
        const profile = await fetchProfile(user.id, token);

        // 2. Backend-side check (Fallback)
        if (profile && String(profile.role || "").toLowerCase() === "admin") {
          verifiedUsers.add(user.id);
          setChecking(false);
          return;
        }

        if (!profile || !profile.onboarded) {
          navigate("/onboarding", { replace: true });
        } else {
          verifiedUsers.add(user.id);
          setChecking(false);
        }
      } catch (err) {
        // Only a missing profile means onboarding (expected for a new account, so not
        // logged). Any other failure shows a retry screen instead of bouncing the user
        // into /onboarding.
        if (isMissingProfile(err)) {
          navigate("/onboarding", { replace: true });
        } else {
          console.error("Onboarding Gate Error:", err);
          setFailed(true);
          setChecking(false);
        }
      }
    };

    checkOnboarding();
  }, [isLoaded, isSignedIn, user, getToken, navigate, retry]);

  if (!alreadyVerified && (!isLoaded || checking)) {
    return <LoadingBar label="Checking your account" />;
  }

  if (failed) {
    return (
      <PageShell>
        <Section innerClassName="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <SectionHeader
            align="center"
            title="We couldn't load your profile"
            subtitle="Please check your connection and try again."
          />
          <div className="mt-8 flex gap-4">
            <Button
              type="button"
              onClick={() => {
                setChecking(true);
                setRetry((n) => n + 1);
              }}
              
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
