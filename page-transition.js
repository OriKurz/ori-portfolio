// מעבר בין עמודים: משיכת טוש.
// 1. כיסוי: קו עבה (כשליש מגובה המסך, קצוות מעוגלים) מצטייר מהפינה השמאלית התחתונה,
//    מסתלסל על פני המסך ומכסה אותו בצבע אחד.
// 2. החזקה: המסך בצבע אחד, ובזמן הזה נטען העמוד החדש.
// 3. חשיפה (בעמוד החדש): הקו נמחק מההתחלה שלו, ונסוג לעבר הקצוות העליון והימני.
// הקובץ נטען ב-head של כל עמוד, כדי שהצבע יכסה את העמוד החדש כבר מהציור הראשון.
// התזמונים במשתני --page-transition-... ב-styles.css.
(function () {
  const root = document.documentElement;
  const storageKey = "page-transition";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // הצבעים מהפלטה (משתנים ב-styles.css)
  const paletteColors = ["--color-blue", "--color-pink", "--color-yellow", "--color-orange", "--color-mint", "--color-green"];

  // צבע הרקע של כל עמוד (כמו --page-background של העמוד ב-styles.css),
  // כדי שהקו לא יהיה בצבע של העמוד שאליו עוברים
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
  // קורא משתנה של זמן (למשל 500ms) במילישניות
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

  // התנועה: מאיצה בהתחלה ומאטה בסוף
  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ----- הקו -----
  // המסלול של הטוש, ביחס לגודל המסך (0 עד 1 לרוחב ולגובה).
  // חמישה מעברים לרוחב, מלמטה למעלה, עם לולאה באמצע כל מעבר ופניות מחוץ למסך.
  // המרחק בין המעברים קטן מעובי הקו, כך שהם חופפים ומכסים את כל המסך.
  // המסלול נגמר בפינה הימנית העליונה, ולכן במחיקה הקו נסוג לשם.
  const passRows = [0.9, 0.7, 0.5, 0.3, 0.1];
  function strokePoints() {
    const points = [[-0.15, 1.1]];
    passRows.forEach(function (y, i) {
      const toRight = i % 2 === 0;
      const x = function (t) { return toRight ? t : 1 - t; };
      const loopX = 0.3 + 0.35 * ((i * 0.37) % 1); // כל לולאה במקום אחר, שייראה אורגני
      points.push([x(0.05), y + 0.02]);
      points.push([x(loopX), y - 0.02]);
      // הלולאה: עולה, מסתלסלת אחורה ויורדת דרך עצמה
      points.push([x(loopX + 0.1), y - 0.1]);
      points.push([x(loopX + 0.04), y - 0.16]);
      points.push([x(loopX - 0.02), y - 0.08]);
      points.push([x(loopX + 0.12), y + 0.02]);
      points.push([x(0.95), y - 0.03]);
      // פנייה מחוץ למסך לשורה הבאה
      points.push([x(1.18), y - 0.1]);
    });
    points.push([1.25, -0.2]);
    return points;
  }

  // מסלול חלק (Catmull-Rom) שעובר דרך כל הנקודות, בפיקסלים של המסך
  function strokePath(width, height) {
    const p = strokePoints().map(function (point) { return [point[0] * width, point[1] * height]; });
    let d = "M" + p[0][0] + " " + p[0][1];
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[Math.max(0, i - 1)];
      const p1 = p[i];
      const p2 = p[i + 1];
      const p3 = p[Math.min(p.length - 1, i + 2)];
      d += " C" + (p1[0] + (p2[0] - p0[0]) / 6) + " " + (p1[1] + (p2[1] - p0[1]) / 6) +
        " " + (p2[0] - (p3[0] - p1[0]) / 6) + " " + (p2[1] - (p3[1] - p1[1]) / 6) +
        " " + p2[0] + " " + p2[1];
    }
    return d;
  }

  // בונה את שכבת הקו (SVG בגודל המסך) בצבע הנתון
  function createOverlay(color) {
    const svgNS = "http://www.w3.org/2000/svg";
    const overlay = document.createElement("div");
    overlay.className = "page-transition";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.setProperty("--page-transition-color", color);
    document.body.appendChild(overlay);

    const box = overlay.getBoundingClientRect();
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + box.width + " " + box.height);
    svg.setAttribute("preserveAspectRatio", "none");

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", strokePath(box.width, box.height));
    path.setAttribute("stroke-width", box.height * parseFloat(cssValue("--page-transition-thickness")));
    svg.appendChild(path);
    overlay.appendChild(svg);

    const length = path.getTotalLength();
    path.style.strokeDasharray = length + " " + length;
    return { overlay: overlay, path: path, length: length };
  }

  // מריץ את התנועה של הקו: from ו-to הם כמה מהקו מוסתר (dashoffset, ביחס לאורך)
  function animate(stroke, from, to, duration, done) {
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      stroke.path.style.strokeDashoffset = (from + (to - from) * easeInOut(t)) * stroke.length;
      if (t < 1) requestAnimationFrame(frame);
      else if (done) done();
    }
    stroke.path.style.strokeDashoffset = from * stroke.length;
    requestAnimationFrame(frame);
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

    // מתחילים לטעון את העמוד הבא כבר עכשיו
    const prefetch = document.createElement("link");
    prefetch.rel = "prefetch";
    prefetch.href = url.href;
    document.head.appendChild(prefetch);

    const color = pickColor(url);
    const stroke = createOverlay(color);
    // הקו מצטייר: מוסתר כולו (1) עד גלוי כולו (0)
    animate(stroke, 1, 0, cssTime("--page-transition-cover"), function () {
      stroke.overlay.classList.add("is-covered");
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ color: color, coveredAt: Date.now() }));
      } catch (error) { /* בלי אחסון: העמוד החדש פשוט מופיע */ }
      window.location.href = url.href;
    });
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
  // ואחרי ההחזקה הקו נמחק וחושף את העמוד
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
    const stroke = createOverlay(arrival.color);
    stroke.overlay.classList.add("is-covered");
    stroke.path.style.strokeDashoffset = 0;
    root.classList.remove("is-page-transition-arriving");

    // ההחזקה: לפחות --page-transition-hold מסוף הכיסוי, ועד שהעמוד נטען (עם גבול עליון)
    const holdEnd = arrival.coveredAt + cssTime("--page-transition-hold");
    let revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      setTimeout(function () {
        stroke.overlay.classList.remove("is-covered");
        // הקו נמחק מההתחלה שלו: 0 עד 1- (החלק הגלוי נסוג לסוף המסלול, למעלה מימין)
        animate(stroke, 0, -1, cssTime("--page-transition-reveal"), function () {
          stroke.overlay.remove();
        });
      }, Math.max(0, holdEnd - Date.now()));
    }
    if (document.readyState === "complete") reveal();
    else window.addEventListener("load", reveal);
    setTimeout(reveal, cssTime("--page-transition-max-wait"));
  });
})();
