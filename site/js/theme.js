/**
 * Light/dark theme toggle with localStorage persistence.
 */

const STORAGE_KEY = "cre-site-theme";

export function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const theme = stored || (prefersLight ? "light" : "dark");
  applyTheme(theme);

  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const isLight = theme === "light";
  btn.setAttribute("aria-pressed", isLight ? "true" : "false");
  btn.textContent = isLight ? "Dark mode" : "Light mode";
  btn.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
}

/** Run before paint to avoid flash — call from inline script in index.html head. */
export function initThemeEarly() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) document.documentElement.setAttribute("data-theme", stored);
    else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (_e) {
    /* ignore */
  }
}
