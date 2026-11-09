// =========================================
// סמן העכבר: עיגול צהוב שעוקב אחרי העכבר בדיוק, במחשב בלבד.
// כשמרכז העיגול מעל משהו צהוב (טקסט, רקע או צורה) הוא הופך לכחול.
// בטלפון ובטאבלט אין סמן, אז לא עושים כלום.
// =========================================

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const cursor = document.createElement("div");
  cursor.className = "custom-cursor is-hidden";
  cursor.setAttribute("aria-hidden", "true");
  document.body.appendChild(cursor);
  document.documentElement.classList.add("has-custom-cursor");

  // הצהוב כפי שהדפדפן כותב אותו (למשל "rgb(255, 255, 5)"), נלקח מהעיגול עצמו
  const yellow = getComputedStyle(cursor).backgroundColor;

  let mouseX = 0;
  let mouseY = 0;
  let checkPending = false;

  // האם הנקודה נמצאת על טקסט (ולא סתם בתוך הקופסה של האלמנט)
  function isOverText(element, x, y) {
    const range = document.createRange();
    for (const node of element.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
      }
    }
    return false;
  }

  // עוברים על השכבות מתחת לנקודה מלמעלה למטה, עד שמגיעים למשהו אטום
  function isYellowAt(x, y) {
    for (const element of document.elementsFromPoint(x, y)) {
      const style = getComputedStyle(element);
      if (element instanceof SVGElement && element.tagName !== "svg") {
        if (style.fill === yellow || style.stroke === yellow) return true;
        continue;
      }
      if (style.color === yellow && isOverText(element, x, y)) return true;
      if (style.backgroundColor === yellow) return true;
      // רקע אטום, תמונה או וידאו: מה שמתחת לא נראה
      if (style.backgroundColor !== "rgba(0, 0, 0, 0)" || style.backgroundImage !== "none" ||
          /^(IMG|VIDEO|CANVAS|IFRAME)$/.test(element.tagName)) return false;
    }
    return false;
  }

  // בודקים את הצבע פעם אחת בפריים, גם כשהעכבר עומד והדף זז מתחתיו
  function checkColor() {
    checkPending = false;
    cursor.classList.toggle("is-on-yellow", isYellowAt(mouseX, mouseY));
  }

  function requestCheck() {
    if (!checkPending) {
      checkPending = true;
      requestAnimationFrame(checkColor);
    }
  }

  document.addEventListener("pointermove", function (event) {
    if (event.pointerType !== "mouse") return;
    mouseX = event.clientX;
    mouseY = event.clientY;
    cursor.style.transform = "translate(" + mouseX + "px, " + mouseY + "px)";
    cursor.classList.remove("is-hidden");
    requestCheck();
  }, { passive: true });

  document.addEventListener("scroll", requestCheck, { capture: true, passive: true });
  setInterval(requestCheck, 150); // דברים שזזים לבד (כדורים, באנר) מתחת לעכבר שעומד

  document.addEventListener("mouseout", function (event) {
    if (!event.relatedTarget) cursor.classList.add("is-hidden");
  });

  // במסך מלא רק האלמנט שבמסך המלא נראה, אז העיגול עובר לתוכו
  function placeCursor() {
    const fullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    (fullscreen || document.body).appendChild(cursor);
  }
  document.addEventListener("fullscreenchange", placeCursor);
  document.addEventListener("webkitfullscreenchange", placeCursor);
}
