import { useEffect, useState } from "react";

const STORAGE_KEY = "mindly:auth-email-send-cooldown-until";
const COOLDOWN_SECONDS = 60;

function readCooldownUntil(storageKey = STORAGE_KEY) {
  try {
    const value = Number(window.sessionStorage.getItem(storageKey));
    return Number.isFinite(value) && value > Date.now() ? value : 0;
  } catch {
    return 0;
  }
}

export function useAuthEmailCooldown(storageKey = STORAGE_KEY) {
  const read = () => readCooldownUntil(storageKey);
  const [cooldownUntil, setCooldownUntil] = useState(read);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((read() - Date.now()) / 1000)));

  useEffect(() => {
    if (!cooldownUntil) {
      setSecondsLeft(0);
      return undefined;
    }

    const update = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        try { window.sessionStorage.removeItem(storageKey); } catch { /* Storage can be unavailable in private contexts. */ }
      }
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil, storageKey]);

  function startCooldown() {
    const until = Date.now() + COOLDOWN_SECONDS * 1000;
    setCooldownUntil(until);
    setSecondsLeft(COOLDOWN_SECONDS);
    try { window.sessionStorage.setItem(storageKey, String(until)); } catch { /* Cooldown remains active until this page closes. */ }
  }

  return { secondsLeft, startCooldown };
}

export function formatCooldown(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}
