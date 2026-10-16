"use client";

import { useCallback, useEffect, useState } from "react";
import {
  desktopPermission,
  desktopPreferred,
  playChime,
  setDesktopPreferred,
  setSoundPreferred,
  showDesktopAlert,
  soundPreferred,
  soundUnlocked,
  unlockSound,
} from "../../lib/admin/bookingAlerts";

type Permission = NotificationPermission | "unsupported";

// The bell's sound and desktop alerts for a new booking, and the admin's choice of each (this
// browser's). The choices are read after mounting: localStorage and Notification don't exist on
// the server.
export function useBookingAlerts() {
  const [sound, setSound] = useState(true);
  const [desktopChosen, setDesktopChosen] = useState(false);
  const [permission, setPermission] = useState<Permission>("default");
  const desktop = desktopChosen && permission === "granted";

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage is read after hydration */
    setSound(soundPreferred());
    setDesktopChosen(desktopPreferred());
    setPermission(desktopPermission());
    /* eslint-enable react-hooks/set-state-in-effect */
    // The admin can allow or block notifications in the browser's settings at any time
    const recheck = () => setPermission(desktopPermission());
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, []);

  // Sound can only start after a click on the page: the first click or key starts it
  useEffect(() => {
    if (!sound || soundUnlocked()) return;
    const unlock = () => {
      unlockSound();
      if (soundUnlocked()) stop();
    };
    const stop = () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    return stop;
  }, [sound]);

  const toggleSound = () => {
    const on = !sound;
    setSound(on);
    setSoundPreferred(on);
    if (on) {
      unlockSound();
      playChime();
    }
  };

  const toggleDesktop = async () => {
    if (desktop) {
      setDesktopChosen(false);
      setDesktopPreferred(false);
      return;
    }
    let answer = desktopPermission();
    if (answer === "default") {
      try {
        // Older Safari answers through a callback instead of a promise
        answer = (await Notification.requestPermission()) ?? desktopPermission();
      } catch (error) {
        console.error("Couldn't ask for notification permission:", error);
        answer = desktopPermission();
      }
    }
    setPermission(answer);
    const on = answer === "granted";
    setDesktopChosen(on);
    setDesktopPreferred(on);
  };

  /** A chime, and a desktop notification while the admin is looking at another tab or app */
  const announce = useCallback(
    (title: string, body: string, tag: string, onOpen: () => void) => {
      if (sound) playChime();
      if (desktop && document.visibilityState !== "visible") showDesktopAlert(title, body, tag, onOpen);
    },
    [sound, desktop],
  );

  return {
    sound,
    toggleSound,
    /** On, and allowed by the browser */
    desktop,
    /** The browser has no notifications, or the admin blocked them for the site */
    desktopUnavailable: permission === "unsupported" || permission === "denied",
    desktopBlocked: permission === "denied",
    toggleDesktop,
    /** Either alert is on, so the bell keeps asking while the tab is in the background */
    any: sound || desktop,
    announce,
  };
}
