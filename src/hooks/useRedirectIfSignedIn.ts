import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useNavigate } from "@/lib/router";
import { CLIENT_PATHS } from "../lib/client/clientNav";

/** `returnTo`: the page the visitor came from to log in; without it, the client app */
export function useRedirectIfSignedIn(returnTo: string | null = null) {
  const { isSignedIn, isLoaded, user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Back to the page they came from, else the client app; its layout sends an admin on to the dashboard
      navigate(returnTo ?? CLIENT_PATHS.home, { replace: true });
    }
  }, [isLoaded, isSignedIn, user, navigate, returnTo]);

  return {  };
}
