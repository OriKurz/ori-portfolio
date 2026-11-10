// מעבר בין עמודים, בנוי מהגריד:
// 1. כיסוי: המשבצות של הגריד מתמלאות בצבע אחת אחרי השנייה, בגל אלכסוני
//    מהפינה השמאלית התחתונה לימנית העליונה. כל משבצת גדלה ממרכזה עד שהיא ממלאת
//    בדיוק את השטח שבין הקווים.
// 2. החזקה: המסך מכוסה, רק עד שהעמוד החדש נטען.
// 3. חשיפה (בעמוד החדש): המשבצות מתכווצות למרכזן באותו גל ובאותו כיוון.
// בכיסוי המשבצות לפי הגריד של העמוד הנוכחי, ובחשיפה לפי הגריד של העמוד החדש.
// הקובץ נטען ב-head של כל עמוד, כדי שהצבע יכסה את העמוד החדש כבר מהציור הראשון.
// התזמונים במשתני --page-transition-... ב-styles.css.
(function () {
  const root = document.documentElement;
  const storageKey = "page-transition";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // הצבעים מהפלטה (משתנים ב-styles.css)
  const paletteColors = ["--color-blue", "--color-pink", "--color-yellow", "--color-orange", "--color-mint", "--color-green"];

  // צבע הרקע של כל עמוד (כמו --page-background של העמוד ב-styles.css),
  // כדי שהמשבצות לא יהיו בצבע של העמוד שאליו עוברים
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

  // ----- הגריד של העמוד -----
  // מחזיר את גודל המשבצת, עובי הקו, ונקודה שבה מתחילה משבצת (בפיקסלים של המסך).
  // הגריד שמצויר בעמוד: הגריד שנגלל בעמודי הפרויקט, או הרקע של עמוד הבית ו-Say Hi.
  // עמוד בלי קווי גריד (האינדקס): המשבצות של הגריד שלו, צמודות זו לזו
  function readGrid() {
    const lines = document.querySelector(".full-project-grid.grid-lines, body.grid-lines");
    const host = lines || document.body;
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;left:0;top:0;width:var(--cell);height:var(--line)";
    host.appendChild(probe);
    const size = probe.getBoundingClientRect();
    probe.remove();

    let cell = size.width;
    if (!(cell > 4)) cell = Math.min(window.innerWidth, window.innerHeight) / 8; // עמוד בלי גריד

    if (!lines) {
      const origin = document.createElement("div");
      origin.style.cssText = "position:fixed;visibility:hidden;left:var(--grid-left, 0px);top:var(--grid-top, 0px)";
      document.body.appendChild(origin);
      const box = origin.getBoundingClientRect();
      origin.remove();
      return { cell: cell, line: 0, x: box.left, y: box.top };
    }

    const box = lines.getBoundingClientRect();
    const position = getComputedStyle(lines).backgroundPosition.split(/[\s,]+/);
    return {
      cell: cell,
      line: size.height,
      x: box.left + (parseFloat(position[0]) || 0),
      y: box.top + (parseFloat(position[1]) || 0)
    };
  }

  // ----- שכבת המשבצות -----
  // משבצת לכל אריח של הגריד שנראה במסך. כל משבצת ממלאת את השטח שבין הקווים
  // (מימין לקו השמאלי ומתחת לקו העליון). ההשהיה של כל משבצת לפי המקום שלה באלכסון:
  // 0 בפינה השמאלית התחתונה, הכי מאוחר בימנית העליונה
  function createOverlay(color) {
    const grid = readGrid();
    const overlay = document.createElement("div");
    overlay.className = "page-transition";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.setProperty("--page-transition-color", color);
    document.body.appendChild(overlay);
    // הגודל של השכבה עצמה (בטלפון: גם מאחורי שורת הכתובת)
    const size = overlay.getBoundingClientRect();
    const width = size.width;
    const height = size.height;
    const firstX = grid.x - Math.ceil(grid.x / grid.cell) * grid.cell;
    const firstY = grid.y - Math.ceil(grid.y / grid.cell) * grid.cell;
    const columns = Math.ceil((width - firstX) / grid.cell);
    const rows = Math.ceil((height - firstY) / grid.cell);
    const wave = cssTime("--page-transition-wave") - cssTime("--page-transition-cell");
    const farthest = Math.max(1, columns - 1 + rows - 1);

    const fragment = document.createDocumentFragment();
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const cell = document.createElement("div");
        cell.className = "page-transition-cell";
        const left = firstX + column * grid.cell + grid.line;
        const top = firstY + row * grid.cell + grid.line;
        const step = column + (rows - 1 - row);
        cell.style.cssText = "left:" + left + "px;top:" + top + "px;width:" + (grid.cell - grid.line) + "px;height:" +
          (grid.cell - grid.line) + "px;animation-delay:" + Math.round(wave * step / farthest) + "ms";
        fragment.appendChild(cell);
      }
    }
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
    // כשכל המשבצות מלאות: המסך מכוסה כולו (גם הקווים), ועוברים לעמוד החדש
    setTimeout(function () {
      overlay.classList.add("is-covered");
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ color: color, coveredAt: Date.now() }));
      } catch (error) { /* בלי אחסון: העמוד החדש פשוט מופיע */ }
      window.location.href = url.href;
    }, cssTime("--page-transition-wave"));
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
  // ואחרי ההחזקה המשבצות מתרוקנות וחושפות את העמוד
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
    // המשבצות של העמוד החדש, מלאות, מתחת לכיסוי המלא
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
        // הרקע המלא יורד והמשבצות מתחילות להתכווץ באותו פריים, כדי שלא יהיה הבהוב
        requestAnimationFrame(function () {
          overlay.classList.remove("is-covered");
          overlay.classList.add("is-revealing");
          setTimeout(function () { overlay.remove(); }, cssTime("--page-transition-wave") + 50);
        });
      }, Math.max(0, holdEnd - Date.now()));
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reveal);
    else reveal();
    setTimeout(reveal, cssTime("--page-transition-max-wait"));
  });
})();
