import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useNavigate } from "@/lib/router";
import { CLIENT_PATHS } from "../lib/client/clientNav";

export function useRedirectIfSignedIn() {
  const { isSignedIn, isLoaded, user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // The client app; its layout sends an admin on to the dashboard
      navigate(CLIENT_PATHS.home, { replace: true });
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  return {  };
}
