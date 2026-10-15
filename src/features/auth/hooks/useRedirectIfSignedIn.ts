import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useNavigate } from "@/lib/router";

export function useRedirectIfSignedIn() {
  const { isSignedIn, isLoaded, user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Send to home page which handles role-based routing correctly
      navigate("/", { replace: true });
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  return {  };
}
