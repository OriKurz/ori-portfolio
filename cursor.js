// =========================================
// סמן העכבר, במחשב בלבד: החץ של המערכת נעלם, ובמקומו ריבוע קטן
// בצבע אקראי מהפלטה, מתוך הצבעים שלא מופיעים מתחתיו ובסביבה.
// הצבע של הריבוע מוגרל מחדש רק כשהרקע שמתחתיו מתחלף.
// מעל אלמנט לחיץ הריבוע מתעגל, בצבע שמוגרל מהצבעים שלא מופיעים באלמנט ובמה שסביבו
// (טקסט, רקע, צבע ה-hover, רקע העמוד וקווי הגריד). הצבע נשאר כל עוד העכבר על
// אותו אלמנט, ומוגרל מחדש בכניסה הבאה.
// בטלפון ובטאבלט אין סמן, אז לא עושים כלום.
// =========================================

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const paletteNames = ["blue", "pink", "orange", "mint", "dark-blue"];
  const rootStyle = getComputedStyle(document.documentElement);
  const creamPage = document.documentElement.matches(".page-shunra, .page-touch-grass");

  // החץ של המערכת נעלם בכל העמוד (styles.css)
  document.documentElement.classList.add("has-custom-cursor");

  const cursor = document.createElement("div");
  cursor.className = "custom-cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = '<div class="custom-cursor-ball"></div>';
  const ball = cursor.firstChild;
  // התווית עם שם הפרויקט (רק בעמוד שיש בו אלמנטים עם data-cursor-label, כמו האינדקס):
  // כשהעכבר על אלמנט כזה, היא מופיעה במקום הכדור
  let label = null;
  if (document.querySelector("[data-cursor-label]")) {
    label = document.createElement("div");
    label.className = "custom-cursor-label text-label";
    cursor.appendChild(label);
  }
  document.body.appendChild(cursor);

  // מה נחשב לחיץ
  const clickableSelector = 'a[href], button, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"]), label, summary, select, input';

  let mouseX = -100;
  let mouseY = -100;
  let mouseInside = false;
  let currentElement = null;
  // הריבוע: הצבע שלו, והרקע שמתחתיו כשהוגרל
  let squareColor = null;
  let squareBackground = null;
  let squareCheckPending = false;

  // צבע (בכל כתיב של הדפדפן) → מספרי RGB, או null אם הוא שקוף לגמרי
  function parseColor(text) {
    let match = text.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (match) return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
    match = text.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?/);
    if (match) {
      if (match[4] === "0") return null;
      return [match[1] * 255, match[2] * 255, match[3] * 255];
    }
    match = text.match(/rgba?\(([\d.]+),? ([\d.]+),? ([\d.]+)(?:[,/] ?([\d.]+))?/);
    if (!match || match[4] === "0") return null;
    return [+match[1], +match[2], +match[3]];
  }

  // ששת צבעי הפלטה כמספרים
  const palette = paletteNames.map(function (name) {
    const probe = document.createElement("div");
    probe.style.color = "var(--color-" + name + ")";
    document.body.appendChild(probe);
    const rgb = parseColor(getComputedStyle(probe).color);
    probe.remove();
    return { name: name, rgb: rgb };
  });

  // איזה צבע בפלטה זה (אם בכלל)
  function paletteNameOf(text) {
    const rgb = parseColor(text || "");
    if (!rgb) return null;
    for (const color of palette) {
      if (color.rgb && color.rgb.every(function (value, i) { return Math.abs(value - rgb[i]) < 3; })) return color.name;
    }
    return null;
  }

  // אוסף את צבעי הפלטה שמופיעים באלמנט, בצאצאים שלו ובשכבות ה-::before / ::after שלהם
  function collectColors(element, used) {
    const parts = [element].concat(Array.from(element.querySelectorAll("*")).slice(0, 60));
    for (const part of parts) {
      for (const pseudo of [null, "::before", "::after"]) {
        const style = getComputedStyle(part, pseudo);
        ["color", "backgroundColor", "fill", "stroke", "borderTopColor", "outlineColor"].forEach(function (property) {
          used.add(paletteNameOf(style[property]));
        });
      }
    }
    // צבע ה-hover: היעד של המעברים שרצים עכשיו (הם מתחילים ברגע שהעכבר נכנס)
    for (const animation of element.getAnimations({ subtree: true })) {
      if (!animation.effect || !animation.effect.getKeyframes) continue;
      for (const keyframe of animation.effect.getKeyframes()) {
        for (const key in keyframe) used.add(paletteNameOf(String(keyframe[key])));
      }
    }
  }

  // אוסף את צבע הרקע שמתחת לאלמנט: ההורים שלו והשכבות שמתחת לעכבר
  function collectBackground(element, used) {
    const layers = document.elementsFromPoint(mouseX, mouseY);
    for (let parent = element.parentElement; parent; parent = parent.parentElement) layers.push(parent);
    for (const layer of layers) {
      if (element.contains(layer) || cursor.contains(layer)) continue;
      used.add(paletteNameOf(getComputedStyle(layer).backgroundColor));
    }
    used.add(paletteNameOf(rootStyle.backgroundColor));
    used.add(paletteNameOf(getComputedStyle(document.body).backgroundColor));
    // קווי הגריד של העמוד
    used.add(paletteNameOf(getComputedStyle(element).getPropertyValue("--grid-line-color").trim()));
  }

  // מגריל צבע מתוך הצבעים שלא מופיעים באלמנט ובסביבה שלו
  function pickColor(element) {
    const used = new Set();
    collectColors(element, used);
    collectBackground(element, used);
    return pickFrom(used);
  }

  // צבע אקראי מהפלטה, מתוך הצבעים שלא ברשימה
  function pickFrom(used) {
    // בעמודים עם רקע קרם (Shunra ו-Touch Grass) מנטה לא נראה, אז הוא יוצא מההגרלה
    if (creamPage) used.add("mint");
    let options = palette.filter(function (color) { return !used.has(color.name); });
    if (!options.length) options = palette;
    return "var(--color-" + options[Math.floor(Math.random() * options.length)].name + ")";
  }

  // הרקע שמתחת לעכבר: השכבה העליונה שיש לה צבע רקע, תמונה או סרטון
  function backgroundAt() {
    for (const layer of document.elementsFromPoint(mouseX, mouseY)) {
      if (cursor.contains(layer)) continue;
      if (/^(IMG|VIDEO|CANVAS|PICTURE|IMAGE)$/i.test(layer.tagName)) return layer;
      const style = getComputedStyle(layer);
      if (parseColor(style.backgroundColor) || style.backgroundImage !== "none") return layer;
    }
    return document.documentElement;
  }

  // מגריל צבע לריבוע מתוך הצבעים שלא מופיעים מתחתיו ובסביבה
  function pickSquareColor() {
    const used = new Set();
    const top = document.elementsFromPoint(mouseX, mouseY).find(function (layer) {
      return !cursor.contains(layer);
    });
    if (top) {
      const style = getComputedStyle(top);
      used.add(paletteNameOf(style.backgroundColor));
      used.add(paletteNameOf(style.color));
      collectBackground(top, used);
    } else {
      used.add(paletteNameOf(rootStyle.backgroundColor));
      used.add(paletteNameOf(getComputedStyle(document.body).backgroundColor));
    }
    return pickFrom(used);
  }

  // הריבוע: מגריל צבע חדש רק כשהרקע שמתחתיו התחלף
  function refreshSquare() {
    if (currentElement) return;
    const background = backgroundAt();
    if (background !== squareBackground || !squareColor) {
      squareBackground = background;
      squareColor = pickSquareColor();
    }
    ball.style.backgroundColor = squareColor;
  }

  // בודקים את הרקע לכל היותר פעם בפריים
  function scheduleSquareCheck() {
    if (squareCheckPending) return;
    squareCheckPending = true;
    requestAnimationFrame(function () {
      squareCheckPending = false;
      if (mouseInside) refreshSquare();
    });
  }

  // האלמנט הלחיץ שמתחת לעכבר (או null)
  function clickableAt(target) {
    if (!target || !target.closest) return null;
    // אלמנט עם תווית (תמונה באינדקס): בכל נקודה בו בוחרים אותו, ולא את מה שבתוכו
    const labeled = target.closest("[data-cursor-label]");
    if (labeled) return labeled;
    for (let element = target; element && element !== document.body; element = element.parentElement) {
      if (element.classList.contains("has-ball-cursor")) return element;
      // המדבקות של שונרא (shunra-stickers.js): מוגדר עליהן cursor: grab, אבל גם הן לחיצות
      if (element.classList.contains("stk")) return element;
      if (element.matches(clickableSelector) || getComputedStyle(element).cursor === "pointer") return element;
    }
    return null;
  }

  function setCurrent(element) {
    if (element === currentElement) return;
    if (currentElement) currentElement.classList.remove("has-ball-cursor");
    currentElement = element;
    const labelText = element && label ? element.getAttribute("data-cursor-label") : null;
    if (labelText) {
      label.textContent = labelText;
      label.style.setProperty("--label-width", element.getAttribute("data-cursor-label-width"));
    }
    cursor.classList.toggle("is-label", Boolean(labelText));
    // על מדבקה העיגול פועם (styles.css)
    cursor.classList.toggle("is-sticker", Boolean(element && element.classList.contains("stk")));
    if (element) {
      element.classList.add("has-ball-cursor");
      // ממתינים פריים, כדי שמעברי ה-hover כבר יתחילו ונוכל לקרוא את הצבע שלהם
      requestAnimationFrame(function () {
        if (currentElement !== element) return;
        ball.style.backgroundColor = pickColor(element);
        cursor.classList.add("is-round");
      });
    } else {
      // חוזר לריבוע, בצבע שלו (או בצבע חדש אם הרקע התחלף)
      cursor.classList.remove("is-round");
      if (mouseInside) refreshSquare();
    }
  }

  // מה מוצג מתחת לעכבר. בזכוכית המגדלת הפעילה אין סמן
  function updateFor(target) {
    const hidden = !mouseInside || Boolean(target && target.closest && target.closest(".is-magnifying"));
    cursor.classList.toggle("is-visible", !hidden);
    setCurrent(hidden ? null : clickableAt(target));
    if (!hidden) scheduleSquareCheck();
  }

  function update() {
    updateFor(document.elementFromPoint(mouseX, mouseY));
  }

  document.addEventListener("pointermove", function (event) {
    if (event.pointerType !== "mouse") return;
    mouseX = event.clientX;
    mouseY = event.clientY;
    mouseInside = true;
    cursor.style.transform = "translate(" + mouseX + "px, " + mouseY + "px)";
    updateFor(event.target);
  }, { passive: true });

  // הדף זז מתחת לעכבר שעומד: גלילה, או אלמנטים שזזים לבד (כדורים)
  document.addEventListener("scroll", update, { capture: true, passive: true });
  setInterval(update, 150);

  // העכבר יצא מהחלון: הסמן נעלם, ומופיע שוב כשהעכבר חוזר
  document.addEventListener("mouseout", function (event) {
    if (!event.relatedTarget) {
      mouseInside = false;
      mouseX = mouseY = -100;
      updateFor(null);
    }
  });

  // במסך מלא רק האלמנט שבמסך המלא נראה, אז הסמן עובר לתוכו
  function placeCursor() {
    const fullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    (fullscreen || document.body).appendChild(cursor);
  }
  document.addEventListener("fullscreenchange", placeCursor);
  document.addEventListener("webkitfullscreenchange", placeCursor);
}
