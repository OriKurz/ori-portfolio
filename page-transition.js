// מעבר בין עמודים, בקוביות:
// 1. כיסוי: רשת של קוביות ריבועיות מעל העמוד. הקוביות מופיעות אחת אחת בסדר אקראי,
//    כל אחת בבת אחת ומלאה. בהתחלה בודדות, אחר כך הרבה יחד, ובסוף האחרונות לאט.
// 2. החזקה: המסך מכוסה, רק עד שהעמוד החדש נטען.
// 3. חשיפה (בעמוד החדש): אותן קוביות נעלמות אחת אחת, בסדר אקראי חדש ובאותו קצב.
// הקובץ נטען ב-head של כל עמוד, כדי שהצבע יכסה את העמוד החדש כבר מהציור הראשון.
// התזמונים במשתני --page-transition-... ב-styles.css.
(function () {
  const root = document.documentElement;
  const storageKey = "page-transition";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // הצבעים מהפלטה (משתנים ב-styles.css)
  const paletteColors = ["--color-blue", "--color-pink", "--color-yellow", "--color-orange", "--color-mint", "--color-green"];

  // צבע הרקע של כל עמוד (כמו --page-background של העמוד ב-styles.css),
  // כדי שהקוביות לא יהיו בצבע של העמוד שאליו עוברים
  const pageBackgrounds = {
    "index.html": "--color-blue",
    "projects.html": "--color-green",
    "say-hi.html": "--color-pink",
    "the-perfect-crime-project.html": "--color-mint",
    "leftovers-project.html": "--leftovers-navy"
  };

  // קורא משתנה מ-styles.css
  function cssValue(name) {
    return getComputedStyle(root).getPropertyValue(name).trim().toLowerCase();
  }
  // קורא משתנה של זמן (למשל 250ms) במילישניות
  function cssTime(name) {
    const value = cssValue(name);
    return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
  }

  function pageName(url) {
    const name = url.pathname.split("/").pop();
    return name === "" ? "index.html" : name;
  }

  // צבע אקראי מהפלטה, אבל לא צבע הרקע של העמוד הנוכחי ולא של העמוד הבא
  function pickColor(targetUrl) {
    const avoid = [cssValue("--page-background")];
    const targetBackground = pageBackgrounds[pageName(targetUrl)];
    if (targetBackground) avoid.push(cssValue(targetBackground));
    const options = paletteColors.filter(function (name) {
      return avoid.indexOf(cssValue(name)) === -1;
    });
    return "var(" + options[Math.floor(Math.random() * options.length)] + ")";
  }

  // ----- שכבת הקוביות -----
  // רשת של קוביות ריבועיות על כל המסך, בגודל הממוצע של משבצת באתר:
  // במחשב 16 לרוחב (90 פיקסלים במסך של 1440), במובייל 8. השורה האחרונה נחתכת בתחתית.
  // כל קובייה מקבלת זמן הופעה אקראי. כמה קוביות כבר הופיעו לאורך הזמן הולך לפי
  // עקומה רכה: בהתחלה בודדות, באמצע הרבה יחד, ובסוף האחרונות לאט
  const mobileQuery = window.matchMedia("(max-width: 767.98px)");

  // ההפוך של ease-in-out (קובי): בהינתן איזה חלק מהקוביות כבר הופיע, באיזה חלק מהזמן
  function easeInOutInverse(progress) {
    return progress < 0.5
      ? Math.cbrt(progress / 4)
      : 1 - Math.cbrt(2 * (1 - progress)) / 2;
  }

  // ערבוב אקראי של רשימה (Fisher–Yates)
  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
    return list;
  }

  function createOverlay(color) {
    const overlay = document.createElement("div");
    overlay.className = "page-transition";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.setProperty("--page-transition-color", color);
    document.body.appendChild(overlay);
    // הגודל של השכבה עצמה (בטלפון: גם מאחורי שורת הכתובת)
    const size = overlay.getBoundingClientRect();
    const columns = mobileQuery.matches ? 8 : 16;
    const cube = size.width / columns;
    const rows = Math.ceil(size.height / cube);
    const total = columns * rows;
    const duration = cssTime("--page-transition-duration");

    // סדר אקראי: הקובייה ה-n בסדר מופיעה בזמן לפי העקומה
    const order = shuffle(Array.from({ length: total }, function (_, index) { return index; }));
    const fragment = document.createDocumentFragment();
    order.forEach(function (index, turn) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      // קצוות בפיקסלים שלמים, כדי שהקוביות ייצמדו בלי חריצים
      const left = Math.round(column * cube);
      const top = Math.round(row * cube);
      const cell = document.createElement("div");
      cell.className = "page-transition-cube";
      cell.style.cssText = "left:" + left + "px;top:" + top + "px;width:" + (Math.round((column + 1) * cube) - left) +
        "px;height:" + (Math.round((row + 1) * cube) - top) + "px;animation-delay:" +
        Math.round(duration * easeInOutInverse((turn + 1) / total)) + "ms";
      fragment.appendChild(cell);
    });
    overlay.appendChild(fragment);
    return overlay;
  }

  // ----- יציאה מהעמוד -----
  let leaving = false;
  function goToPage(href) {
    const url = new URL(href, window.location.href);
    if (reducedMotion.matches || leaving) {
      window.location.href = url.href;
      return;
    }
    leaving = true;
    prefetch(url.href);

    const color = pickColor(url);
    const overlay = createOverlay(color);
    overlay.classList.add("is-covering");
    // כשכל הקוביות הופיעו: המסך מכוסה כולו, ועוברים לעמוד החדש
    setTimeout(function () {
      overlay.classList.add("is-covered");
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ color: color, coveredAt: Date.now() }));
      } catch (error) { /* בלי אחסון: העמוד החדש פשוט מופיע */ }
      window.location.href = url.href;
    }, cssTime("--page-transition-duration"));
  }
  window.goToPage = goToPage;

  // קישור לעמוד אחר באתר (לא מייל, לא אתר חיצוני, לא קובץ כמו קורות החיים)
  function isPageLink(link) {
    if (!link.href || link.target === "_blank" || link.hasAttribute("download")) return false;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin) return false;
    if (!/(\.html|\/)$/.test(url.pathname)) return false;
    // קישור לאותו עמוד עם # בלבד
    if (url.hash && url.pathname === window.location.pathname) return false;
    return true;
  }

  // טעינה מראש של עמוד, כדי שיהיה מוכן כשהמסך מכוסה (פעם אחת לכל עמוד)
  const prefetched = new Set();
  function prefetch(href) {
    const url = new URL(href, window.location.href);
    url.hash = "";
    if (prefetched.has(url.href)) return;
    prefetched.add(url.href);
    const link = document.createElement("link");
    if (link.relList && link.relList.supports && link.relList.supports("prefetch")) {
      link.rel = "prefetch";
      link.href = url.href;
      document.head.appendChild(link);
    } else if (window.fetch) {
      // ספארי (אין prefetch): טוענים את העמוד ברקע למטמון של הדפדפן
      fetch(url.href, { credentials: "same-origin" }).catch(function () {});
    }
  }

  // העכבר מתקרב לקישור, פוקוס במקלדת או נגיעה: טוענים מראש את העמוד שלו
  function prefetchFromEvent(event) {
    const link = event.target.closest && event.target.closest("a[href]");
    if (link && isPageLink(link)) prefetch(link.href);
  }
  document.addEventListener("pointerover", prefetchFromEvent, { passive: true });
  document.addEventListener("pointerdown", prefetchFromEvent, { passive: true });
  document.addEventListener("focusin", prefetchFromEvent);

  // כל לחיצה על קישור בין עמודים. רץ אחרי כל הסקריפטים האחרים,
  // כך שקישור שסקריפט כבר טיפל בו (preventDefault) לא מושפע
  window.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest && event.target.closest("a[href]");
    if (!link || !isPageLink(link)) return;
    event.preventDefault();
    goToPage(link.href);
  });

  // חזרה לעמוד בכפתור "אחורה" (מהזיכרון של הדפדפן): בלי הכיסוי
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    leaving = false;
    document.querySelectorAll(".page-transition").forEach(function (overlay) { overlay.remove(); });
    root.classList.remove("is-page-transition-arriving");
  });

  // ----- כניסה לעמוד -----
  // אם הגענו מקישור עם מעבר: הצבע מכסה את העמוד מיד (html::after ב-styles.css),
  // ואחרי ההחזקה הקוביות נעלמות וחושפות את העמוד
  let arrival = null;
  try {
    arrival = JSON.parse(sessionStorage.getItem(storageKey));
    sessionStorage.removeItem(storageKey);
  } catch (error) { arrival = null; }

  const navigationEntry = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  const isBackOrReload = navigationEntry && navigationEntry.type !== "navigate";
  // מעבר ישן (למשל עמוד שנטען לאט מאוד) או חזרה אחורה: בלי כיסוי
  if (!arrival || isBackOrReload || reducedMotion.matches || Date.now() - arrival.coveredAt > 5000) return;

  root.style.setProperty("--page-transition-color", arrival.color);
  root.classList.add("is-page-transition-arriving");

  document.addEventListener("DOMContentLoaded", function () {
    // הקוביות של העמוד החדש, כולן גלויות, מתחת לכיסוי המלא
    const overlay = createOverlay(arrival.color);
    overlay.classList.add("is-covered");
    root.classList.remove("is-page-transition-arriving");

    // ההחזקה: --page-transition-hold מסוף הכיסוי. מתארכת רק אם העמוד עוד לא מוכן
    // (הפונטים עוד נטענים), ולא יותר מ---page-transition-max-wait
    const holdEnd = arrival.coveredAt + cssTime("--page-transition-hold");
    let revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      setTimeout(function () {
        // הרקע המלא יורד והקוביות מתחילות להיעלם באותו פריים, כדי שלא יהיה הבהוב.
        // סדר אקראי חדש: השכבה של העמוד החדש נבנתה עם ערבוב משלה
        requestAnimationFrame(function () {
          overlay.classList.remove("is-covered");
          overlay.classList.add("is-revealing");
          setTimeout(function () { overlay.remove(); }, cssTime("--page-transition-duration") + 50);
        });
      }, Math.max(0, holdEnd - Date.now()));
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reveal);
    else reveal();
    setTimeout(reveal, cssTime("--page-transition-max-wait"));
  });
})();
