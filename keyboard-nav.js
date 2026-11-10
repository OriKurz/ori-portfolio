// =========================================
// ניווט מרחבי במקשי החצים (בכל העמודים)
// כשיש פוקוס על רכיב לחיץ, חץ מעביר את הפוקוס לרכיב הלחיץ הקרוב ביותר בכיוון שלו,
// לפי המיקום על המסך ברגע הלחיצה (גם ברכיבים שזזים).
// כשאין פוקוס, החצים גוללים את העמוד כרגיל.
// רכיב לחיץ = כל מה שאפשר להגיע אליו ב-Tab, אז כל רכיב לחיץ חדש נכלל אוטומטית.
// =========================================

(function () {
  // כל מה שמקבל פוקוס ב-Tab
  const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select, textarea, summary';
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // מרווח מקצה המסך כשגוללים לרכיב, כדי שלא יישב צמוד לקצה
  const scrollMargin = 40;
  // הרכיב האחרון שנלחץ בעכבר (ספארי לא נותן פוקוס לכפתור בלחיצה)
  let lastClicked = null;

  document.addEventListener("pointerdown", function (event) {
    lastClicked = event.target.closest(focusableSelector);
  }, true);

  // האם הרכיב נראה עכשיו (לא מוסתר, לא בבר סגור, לא מחוץ למסך לרוחב)
  function isAvailable(element) {
    if (element.closest('[inert], [aria-hidden="true"]')) return false;
    // בר בחירה סגור (גם בזמן שהוא עוד מחליק החוצה)
    if (element.closest("#nav-bar:not(.is-open)")) return false;
    if (element.checkVisibility && !element.checkVisibility({ visibilityProperty: true })) return false;
    if (getComputedStyle(element).visibility === "hidden") return false;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return rect.right > 0 && rect.left < window.innerWidth;
  }

  // מאיפה מתחילים: הרכיב שבפוקוס, או זה שנלחץ עכשיו בעכבר
  function currentElement() {
    const active = document.activeElement;
    if (active && active !== document.body && active.matches(focusableSelector)) return active;
    if (lastClicked && document.contains(lastClicked) && isAvailable(lastClicked)) return lastClicked;
    return null;
  }

  // בין אילו רכיבים עוברים: בר הבחירה הפתוח, המסך המלא של הסרטון, או כל העמוד
  function navigationArea() {
    if (document.fullscreenElement) return document.fullscreenElement;
    // רק בר הבחירה האמיתי (#nav-bar), לא העותק לתצוגה ב-styleguide.html
    const openNavBar = document.querySelector("#nav-bar.is-open");
    if (openNavBar) return openNavBar;
    return document;
  }

  // הרכיב הקרוב ביותר בכיוון: המרחק בכיוון התנועה, ועונש על סטייה הצידה
  function findNext(from, direction) {
    const a = from.getBoundingClientRect();
    const aCenterX = a.left + a.width / 2;
    const aCenterY = a.top + a.height / 2;
    let best = null;
    let bestScore = Infinity;

    navigationArea().querySelectorAll(focusableSelector).forEach(function (element) {
      // מדלגים על מי שמכיל את הרכיב הנוכחי (למשל הסרטון, כשהפוקוס על הבר שבתוכו)
      if (element === from || element.contains(from)) return;
      if (!isAvailable(element)) return;
      const b = element.getBoundingClientRect();
      const bCenterX = b.left + b.width / 2;
      const bCenterY = b.top + b.height / 2;

      let forward;   // כמה הרכיב רחוק בכיוון התנועה
      let sideways;  // כמה הוא סוטה הצידה
      let sideGap;   // רווח בין הרכיבים בציר הצדדי (0 אם הם חופפים)
      if (direction === "left" || direction === "right") {
        forward = direction === "right" ? bCenterX - aCenterX : aCenterX - bCenterX;
        sideways = Math.abs(bCenterY - aCenterY);
        sideGap = Math.max(0, b.top - a.bottom, a.top - b.bottom);
      } else {
        forward = direction === "down" ? bCenterY - aCenterY : aCenterY - bCenterY;
        sideways = Math.abs(bCenterX - aCenterX);
        sideGap = Math.max(0, b.left - a.right, a.left - b.right);
      }
      if (forward <= 1) return;

      // רכיב שמתחיל אחרי הקצה של הרכיב הנוכחי עדיף על רכיב שחופף לו
      // (למשל ימינה מתמונה ברולר: התמונה הבאה, ולא הבאנר הרחב שמתחתיה).
      // רכיב שבתוך הרכיב הנוכחי (הבר שבתוך הסרטון) לא נחשב חופף
      let edgeGap;
      if (direction === "right") edgeGap = b.left - a.right;
      else if (direction === "left") edgeGap = a.left - b.right;
      else if (direction === "down") edgeGap = b.top - a.bottom;
      else edgeGap = a.top - b.bottom;
      const overlapPenalty = edgeGap < -2 && !from.contains(element) ? 100000 : 0;

      const score = overlapPenalty + forward + sideGap * 2 + sideways * 0.2;
      if (score < bestScore) {
        bestScore = score;
        best = element;
      }
    });
    return best;
  }

  // האם אפשר לגלול את האזור הזה לגובה
  function isScrollable(element) {
    if (element === document.scrollingElement) {
      const overflowY = getComputedStyle(document.documentElement).overflowY;
      const bodyOverflowY = getComputedStyle(document.body).overflowY;
      return overflowY !== "hidden" && bodyOverflowY !== "hidden" && element.scrollHeight > element.clientHeight;
    }
    const overflowY = getComputedStyle(element).overflowY;
    return (overflowY === "auto" || overflowY === "scroll") && element.scrollHeight > element.clientHeight;
  }

  // גלילה רכה של האזורים הנגללים עד שהרכיב נראה (רק לגובה)
  function scrollToElement(element) {
    const rect = element.getBoundingClientRect();
    if (rect.top >= scrollMargin && rect.bottom <= window.innerHeight - scrollMargin) return;

    const behavior = reduceMotion.matches ? "auto" : "smooth";
    let alreadyMoved = 0; // כמה הרכיב כבר זז בגלילות של האזורים הפנימיים
    let parent = element.parentElement;
    while (parent) {
      const container = parent === document.body || parent === document.documentElement ? document.scrollingElement : parent;
      if (isScrollable(container)) {
        let visibleTop = 0;
        let visibleBottom = window.innerHeight;
        if (container !== document.scrollingElement) {
          const box = container.getBoundingClientRect();
          visibleTop = Math.max(0, box.top + container.clientTop);
          visibleBottom = Math.min(window.innerHeight, visibleTop + container.clientHeight);
        }
        const top = rect.top - alreadyMoved;
        const bottom = rect.bottom - alreadyMoved;
        let delta = 0;
        if (top < visibleTop + scrollMargin) delta = top - visibleTop - scrollMargin;
        else if (bottom > visibleBottom - scrollMargin) delta = Math.min(bottom - visibleBottom + scrollMargin, top - visibleTop - scrollMargin);
        // לא גוללים מעבר לקצה של האזור
        const maxScroll = container.scrollHeight - container.clientHeight;
        delta = Math.max(-container.scrollTop, Math.min(maxScroll - container.scrollTop, delta));
        if (delta !== 0) {
          container.scrollBy({ top: delta, behavior: behavior });
          alreadyMoved += delta;
        }
        if (container === document.scrollingElement) break;
      }
      if (parent === document.documentElement) break;
      parent = parent.parentElement;
    }
  }

  const directions = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };

  document.addEventListener("keydown", function (event) {
    const direction = directions[event.key];
    if (!direction) return;
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

    const from = currentElement();
    if (!from) return; // אין פוקוס: גלילה רגילה

    // שדות טקסט משתמשים בחצים בעצמם
    if (from.matches("input, select, textarea, [contenteditable]")) return;
    // הבר של הסרטון: ימינה ושמאלה מזיזים את הזמן (script.js), למעלה ולמטה יוצאים ממנו
    if (from.matches('[role="slider"]') && (direction === "left" || direction === "right")) return;

    const next = findNext(from, direction);
    if (!next) return; // אין רכיב בכיוון הזה: הדפדפן עושה מה שהוא עושה תמיד

    event.preventDefault();
    lastClicked = null;
    next.focus({ preventScroll: true });
    scrollToElement(next);
  });
})();
