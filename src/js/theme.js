/* Theme Manager Module */
const THEME_KEY = "kcal-theme";

export function applyTheme(themeName) {
  if (!themeName) return;
  document.documentElement.setAttribute("data-theme", themeName);
  localStorage.setItem(THEME_KEY, themeName);

  const checkboxes = document.querySelectorAll('input[name="theme-toggle"]');
  checkboxes.forEach((cb) => {
    cb.checked = cb.getAttribute("data-theme-id") === themeName;
  });
}

export function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "neumorphic";
  applyTheme(savedTheme);

  const checkboxes = document.querySelectorAll('input[name="theme-toggle"]');
  checkboxes.forEach((cb) => {
    cb.addEventListener("change", (e) => {
      if (e.target.checked) {
        const selectedTheme = cb.getAttribute("data-theme-id");
        applyTheme(selectedTheme);
      } else {
        // Prevent unchecking the currently active theme without picking another
        cb.checked = true;
      }
    });
  });
}
