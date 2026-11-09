// =========================================
// סמן העכבר, במחשב בלבד: במצב רגיל החץ של המערכת.
// מעל אלמנט לחיץ החץ מתחלף בכדור קטן בצבע אקראי מהפלטה, מתוך הצבעים
// שלא מופיעים באלמנט ובמה שסביבו (טקסט, רקע, צבע ה-hover, רקע העמוד וקווי הגריד).
// הצבע נשאר כל עוד העכבר על אותו אלמנט, ומוגרל מחדש בכניסה הבאה.
// בטלפון ובטאבלט אין סמן, אז לא עושים כלום.
// =========================================

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const paletteNames = ["blue", "pink", "yellow", "orange", "mint", "green"];
  const rootStyle = getComputedStyle(document.documentElement);

  const cursor = document.createElement("div");
  cursor.className = "custom-cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = '<div class="custom-cursor-ball"></div>';
  const ball = cursor.firstChild;
  document.body.appendChild(cursor);

  // מה נחשב לחיץ
  const clickableSelector = 'a[href], button, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"]), label, summary, select, input';

  let mouseX = -100;
  let mouseY = -100;
  let currentElement = null;

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
    let options = palette.filter(function (color) { return !used.has(color.name); });
    if (!options.length) options = palette;
    return "var(--color-" + options[Math.floor(Math.random() * options.length)].name + ")";
  }

  // האלמנט הלחיץ שמתחת לעכבר (או null). בזכוכית המגדלת הפעילה אין כדור
  function clickableAt(target) {
    if (!target || !target.closest) return null;
    if (target.closest(".is-magnifying")) return null;
    for (let element = target; element && element !== document.body; element = element.parentElement) {
      if (element.classList.contains("has-ball-cursor")) return element;
      if (element.matches(clickableSelector) || getComputedStyle(element).cursor === "pointer") return element;
    }
    return null;
  }

  function setCurrent(element) {
    if (element === currentElement) return;
    if (currentElement) currentElement.classList.remove("has-ball-cursor");
    currentElement = element;
    if (element) {
      element.classList.add("has-ball-cursor");
      // ממתינים פריים, כדי שמעברי ה-hover כבר יתחילו ונוכל לקרוא את הצבע שלהם
      requestAnimationFrame(function () {
        if (currentElement !== element) return;
        ball.style.backgroundColor = pickColor(element);
        cursor.classList.add("is-visible");
      });
    } else {
      cursor.classList.remove("is-visible");
    }
  }

  function update() {
    setCurrent(clickableAt(document.elementFromPoint(mouseX, mouseY)));
  }

  document.addEventListener("pointermove", function (event) {
    if (event.pointerType !== "mouse") return;
    mouseX = event.clientX;
    mouseY = event.clientY;
    cursor.style.transform = "translate(" + mouseX + "px, " + mouseY + "px)";
    setCurrent(clickableAt(event.target));
  }, { passive: true });

  // הדף זז מתחת לעכבר שעומד: גלילה, או אלמנטים שזזים לבד (כדורים)
  document.addEventListener("scroll", update, { capture: true, passive: true });
  setInterval(update, 150);

  // העכבר יצא מהחלון
  document.addEventListener("mouseout", function (event) {
    if (!event.relatedTarget) {
      mouseX = mouseY = -100;
      setCurrent(null);
    }
  });

  // במסך מלא רק האלמנט שבמסך המלא נראה, אז הכדור עובר לתוכו
  function placeCursor() {
    const fullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    (fullscreen || document.body).appendChild(cursor);
  }
  document.addEventListener("fullscreenchange", placeCursor);
  document.addEventListener("webkitfullscreenchange", placeCursor);
}
