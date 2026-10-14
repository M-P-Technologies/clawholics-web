import { useAuth, useUser } from "@clerk/nextjs";
import { useNavigate } from "@/lib/router";
import { useQueryClient } from "@tanstack/react-query";
import { accountQueries } from "@/lib/accountQueries";
import { bookingStateFor } from "../utils/booking";

type ShowModal = (title: string, message: string, action?: () => void, buttonText?: string) => void;

/**
 * Starts a booking for a service, optionally with an artist already chosen. Booking needs a
 * signed-in customer with a finished profile; if either is missing, `showModal` explains and
 * points to the right page instead.
 */
export function useStartBooking(showModal: ShowModal) {
  const navigate = useNavigate();
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return async (service: Parameters<typeof bookingStateFor>[0], nailistId?: number) => {
    if (!isSignedIn || !user) {
      showModal(
        "Login Required",
        "Please log in to book. Once you are signed in, you can pick your artist, date and time.",
        () => navigate("/login"),
        "Go to Login",
      );
      return;
    }

    // The cached profile, asked for again only when it's no longer fresh
    const profile = await queryClient.fetchQuery(accountQueries.profile(user.id, getToken));

    if (!profile || !profile.onboarded) {
      showModal(
        "Onboarding Required",
        "We need a few details, like your phone number and date of birth, so our team can reach you about your appointment. It only takes a minute.",
        () => navigate("/onboarding"),
        "Go to Onboarding",
      );
      return;
    }

    navigate("/booking", { state: bookingStateFor(service, nailistId) });
  };
}
