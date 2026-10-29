// =========================================
// כפתורי הניווט: בהובר הטקסט מתחלף בין אנגלית, עברית וערבית
// =========================================

// סדר השפות בלולאה. עברית וערבית נכתבות מימין לשמאל
const languages = [
  { code: "en", direction: "ltr" },
  { code: "he", direction: "rtl" },
  { code: "ar", direction: "rtl" },
];

// כל כמה זמן מתחלפת השפה (במילישניות)
const switchEvery = 500;

// מציג בכפתור את המילה בשפה שבמקום index ברשימה
function showLanguage(button, index) {
  const language = languages[index];
  const label = button.querySelector(".nav-button-label");
  label.textContent = button.dataset[language.code];
  button.lang = language.code;
  button.dir = language.direction;
}

document.querySelectorAll(".nav-button").forEach(function (button) {
  let timer = null;
  let currentIndex = 0;

  // העכבר נכנס: מתחילים להחליף שפה כל חצי שנייה
  function startLoop() {
    if (timer) return;
    timer = setInterval(function () {
      currentIndex = (currentIndex + 1) % languages.length;
      showLanguage(button, currentIndex);
    }, switchEvery);
  }

  // העכבר יצא: עוצרים וחוזרים לאנגלית
  function stopLoop() {
    clearInterval(timer);
    timer = null;
    currentIndex = 0;
    showLanguage(button, currentIndex);
  }

  button.addEventListener("mouseenter", startLoop);
  button.addEventListener("mouseleave", stopLoop);
  button.addEventListener("focus", startLoop);
  button.addEventListener("blur", stopLoop);
});
