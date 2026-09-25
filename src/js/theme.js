/* Theme Manager Module */
const THEME_KEY = "kcal-theme";

export function applyTheme(themeName) {
  if (!themeName) return;
  document.documentElement.setAttribute("data-theme", themeName);
  localStorage.setItem(THEME_KEY, themeName);

  const themeCards = document.querySelectorAll(".theme-card");
  themeCards.forEach((card) => {
    card.classList.toggle("active", card.getAttribute("data-theme") === themeName);
  });
}

export function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "oled";
  applyTheme(savedTheme);

  const themeCards = document.querySelectorAll(".theme-card");
  themeCards.forEach((card) => {
    card.addEventListener("click", () => {
      const selectedTheme = card.getAttribute("data-theme");
      applyTheme(selectedTheme);
    });
  });
}
