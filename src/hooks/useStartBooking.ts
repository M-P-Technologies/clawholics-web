import { useAuth, useUser } from "@clerk/nextjs";
import { useNavigate } from "@/lib/router";
import { fetchProfileIfExists } from "../services/userService";
import { bookingStateFor } from "../utils/booking";
import { CLIENT_PATHS } from "../lib/client/clientNav";

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

    const token = await getToken();
    const profile = await fetchProfileIfExists(user.id, token);

    if (!profile || !profile.onboarded) {
      showModal(
        "Onboarding Required",
        "We need a few details, like your phone number and date of birth, so our team can reach you about your appointment. It only takes a minute.",
        () => navigate("/onboarding"),
        "Go to Onboarding",
      );
      return;
    }

    navigate(CLIENT_PATHS.book, { state: bookingStateFor(service, nailistId) });
  };
}
