import { useEffect } from "react";

/**
 * Synchronizes the app's dark/light theme with the system preference
 * (prefers-color-scheme). Toggles the `dark` class on <html>.
 */
export function useTheme() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (e) => {
      if (e.matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    apply(mq);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
}