// How the admin hears about a new booking besides the bell: a short chime, and a desktop
// notification when the admin tab isn't the one in front. Both are this browser's choice, kept
// in localStorage (sound on by default, desktop alerts off until the admin turns them on, since
// the browser asks for permission).

const SOUND_KEY = "clawholics.admin.alertSound";
const DESKTOP_KEY = "clawholics.admin.desktopAlerts";

function readFlag(key: string, fallback: boolean) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === "1";
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, on: boolean) {
  try {
    window.localStorage.setItem(key, on ? "1" : "0");
  } catch {
    // Private window or blocked storage: the choice lasts until the page is closed
  }
}

export const soundPreferred = () => readFlag(SOUND_KEY, true);
export const setSoundPreferred = (on: boolean) => writeFlag(SOUND_KEY, on);
export const desktopPreferred = () => readFlag(DESKTOP_KEY, false);
export const setDesktopPreferred = (on: boolean) => writeFlag(DESKTOP_KEY, on);

/** "granted", "denied", "default", or "unsupported" where the browser has no notifications */
export function desktopPermission(): NotificationPermission | "unsupported" {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

let audio: AudioContext | null = null;

/** The browser lets the page make sound (the admin has clicked on it since it opened) */
export const soundUnlocked = () => audio?.state === "running";

/**
 * Browsers only let a page make sound after the visitor has clicked or typed on it, so the audio
 * is started on the admin's first click (and again if the browser suspended it).
 */
export function unlockSound() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    audio = null;
  }
}

/** Two soft bell notes, made in the browser (no sound file to load) */
export function playChime() {
  if (!audio || audio.state !== "running") return;
  const start = audio.currentTime + 0.02;
  [
    { pitch: 880, at: 0 },
    { pitch: 1318.5, at: 0.16 },
  ].forEach(({ pitch, at }) => {
    const tone = audio!.createOscillator();
    const volume = audio!.createGain();
    tone.type = "sine";
    tone.frequency.value = pitch;
    volume.gain.setValueAtTime(0.0001, start + at);
    volume.gain.exponentialRampToValueAtTime(0.25, start + at + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.9);
    tone.connect(volume).connect(audio!.destination);
    tone.start(start + at);
    tone.stop(start + at + 1);
  });
}

/**
 * A desktop notification; clicking it brings the admin tab forward and opens `link`. Tagged, so
 * two admin tabs open in this browser show it once.
 */
export function showDesktopAlert(title: string, body: string, tag: string, onOpen: () => void) {
  if (desktopPermission() !== "granted") return;
  try {
    const alert = new Notification(title, { body, tag, icon: "/apple-touch-icon.png" });
    alert.onclick = () => {
      window.focus();
      onOpen();
      alert.close();
    };
  } catch (error) {
    // Some phone browsers only show notifications from a service worker
    console.error("Couldn't show a desktop notification:", error);
  }
}
