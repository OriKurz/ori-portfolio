// =========================================
// גלריה (הפריים galery בפיגמה): לחיצה על דימוי פותחת אותו בגדול,
// מעל שכבה כחולה כהה חצי שקופה, עם X וחצים.
// משותף לכל עמודי הפרויקטים. נפתחים רק דימויים שמסומנים ב-HTML:
//   data-gallery="שם"       כל הדימויים עם אותו שם הם קבוצה אחת (דפדוף בלופ).
//                            דימוי שהשם שלו מופיע פעם אחת נפתח לבד, בלי חצים.
//   data-gallery-each="סלקטור"  (על אלמנט שמכיל כמה דימויים, כמו הפוסטרים של שונרא)
//                            כל דימוי בפנים הוא פריט נפרד, והגלריה נפתחת
//                            על זה שמוצג עכשיו (is-shown).
//   data-gallery-order="מספר"  (לא חובה) הסדר בקבוצה, כשהוא שונה מהסדר ב-HTML.
//   data-gallery-tall          (לא חובה) הדימוי תופס את כל הגובה הפנוי, פחות משבצת
//                            למעלה ולמטה (במובייל 20px), כמו הפוסטרים של שונרא.
// סגירה: X, לחיצה על השכבה מחוץ לדימוי, או Esc. בזמן שהגלריה פתוחה העמוד לא נגלל.
// דפדוף: החצים, מקשי החצים, והחלקה הצידה בטלפון.
// =========================================

(function () {
  const triggers = Array.from(document.querySelectorAll("[data-gallery]"));
  if (!triggers.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // האייקונים מהפיגמה (Component 2 = חץ, Component 4 = X), בצבע currentColor
  const arrowIcon = '<svg viewBox="0 0 53 53" fill="none" aria-hidden="true"><circle cx="26.5" cy="26.5" r="25" stroke-width="3" stroke="currentColor"/><path d="M20.7391 26.8841V25.3841H19.971V26.8841V28.3841H20.7391V26.8841ZM18.9104 25.8234C18.3246 26.4092 18.3246 27.3589 18.9104 27.9447L28.4563 37.4907C29.0421 38.0764 29.9918 38.0764 30.5776 37.4907C31.1634 36.9049 31.1634 35.9551 30.5776 35.3693L22.0923 26.8841L30.5776 18.3988C31.1634 17.813 31.1634 16.8632 30.5776 16.2775C29.9918 15.6917 29.0421 15.6917 28.4563 16.2775L18.9104 25.8234Z" fill="currentColor"/></svg>';
  const closeIcon = '<svg viewBox="0 0 22.5 22.9956" fill="none" aria-hidden="true"><line x1="21" y1="2.12132" x2="2.12132" y2="21" stroke-width="3" stroke-linecap="round" stroke="currentColor"/><line x1="2.12132" y1="1.99561" x2="21" y2="20.8743" stroke-width="3" stroke-linecap="round" stroke="currentColor"/></svg>';

  // ----- הקבוצות: שם → רשימת דימויים (img או video) -----
  const groups = {};
  triggers.forEach(function (trigger) {
    const name = trigger.dataset.gallery;
    groups[name] = groups[name] || [];
    const eachSelector = trigger.dataset.galleryEach;
    const media = eachSelector ? Array.from(trigger.querySelectorAll(eachSelector)) : [trigger];
    groups[name].push.apply(groups[name], media);

    // נגיש במקלדת ולחיץ, כמו כל רכיב לחיץ באתר
    trigger.setAttribute("role", "button");
    trigger.setAttribute("tabindex", "0");
    if (!trigger.hasAttribute("aria-label")) {
      trigger.setAttribute("aria-label", "Open " + (media[0].getAttribute("alt") || media[0].getAttribute("aria-label") || "image"));
    }
    trigger.classList.add("gallery-trigger");

    trigger.addEventListener("click", function () {
      let start = media[0];
      if (eachSelector) start = trigger.querySelector(eachSelector + ".is-shown") || media[0];
      // הגודל של משבצת בעמוד, לשוליים של דימוי גבוה
      gallery.style.setProperty("--gallery-cell", getComputedStyle(trigger).getPropertyValue("--cell"));
      gallery.classList.toggle("is-tall", trigger.hasAttribute("data-gallery-tall"));
      open(name, groups[name].indexOf(start));
    });
    trigger.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        trigger.click();
      }
    });
  });

  // סדר הדפדוף: לפי data-gallery-order אם יש, אחרת לפי הסדר ב-HTML
  Object.keys(groups).forEach(function (name) {
    groups[name].sort(function (a, b) {
      return (parseFloat(a.dataset.galleryOrder) || 0) - (parseFloat(b.dataset.galleryOrder) || 0);
    });
  });

  // ----- השכבה (נבנית פעם אחת) -----
  const gallery = document.createElement("div");
  gallery.className = "gallery";
  gallery.setAttribute("role", "dialog");
  gallery.setAttribute("aria-modal", "true");
  gallery.setAttribute("aria-label", "Gallery");
  gallery.hidden = true;
  gallery.innerHTML =
    '<div class="gallery-stage"></div>' +
    '<button class="gallery-button gallery-close" type="button" aria-label="Close">' + closeIcon + "</button>" +
    '<button class="gallery-button gallery-arrow gallery-arrow--prev" type="button" aria-label="Previous">' + arrowIcon + "</button>" +
    '<button class="gallery-button gallery-arrow gallery-arrow--next" type="button" aria-label="Next">' + arrowIcon + "</button>";
  document.body.appendChild(gallery);

  const stage = gallery.querySelector(".gallery-stage");
  const closeButton = gallery.querySelector(".gallery-close");
  const prevButton = gallery.querySelector(".gallery-arrow--prev");
  const nextButton = gallery.querySelector(".gallery-arrow--next");

  let items = [];
  let index = 0;
  let openedFrom = null;
  let current = null;

  // עותק של הדימוי לגלריה. סרטון: בלופ, בלי סאונד ובלי controls, מאותה נקודה
  function makeMedia(source) {
    let element;
    let width;
    let height;
    if (source.tagName === "VIDEO") {
      element = document.createElement("video");
      element.src = source.currentSrc || source.src;
      element.muted = true;
      element.loop = true;
      element.autoplay = true;
      element.playsInline = true;
      element.setAttribute("muted", "");
      element.setAttribute("playsinline", "");
      if (source.currentTime) element.currentTime = source.currentTime;
      element.setAttribute("aria-label", source.getAttribute("aria-label") || "");
      width = source.videoWidth;
      height = source.videoHeight;
      element.addEventListener("loadedmetadata", function () {
        element.style.setProperty("--gallery-aspect", element.videoWidth / element.videoHeight);
      });
      element.play().catch(function () {});
    } else {
      element = document.createElement("img");
      element.src = source.currentSrc || source.src;
      element.alt = source.alt || "";
      width = source.naturalWidth || source.getAttribute("width");
      height = source.naturalHeight || source.getAttribute("height");
    }
    element.className = "gallery-media";
    if (width && height) element.style.setProperty("--gallery-aspect", width / height);
    return element;
  }

  // מחליף את הדימוי המוצג. direction: 1 קדימה, -1 אחורה, 0 פתיחה
  // המעבר בין דימויים, כמו קרוסלה, בלי שינוי של opacity:
  // א. הנוכחי קטן ל-85% במקום. ב. בגודל הזה הוא מחליק החוצה מהמסך, והבא (גם ב-85%)
  // נכנס מהצד השני ומתמקם במרכז, שניהם יחד. ג. החדש גדל בחזרה ל-100%.
  // התזמונים ב---gallery-shrink-duration, --gallery-slide-duration ו---gallery-grow-duration
  let animating = false;
  let pendingStep = 0;

  function readDuration(name) {
    return parseFloat(getComputedStyle(gallery).getPropertyValue(name)) * 1000 || 0;
  }

  function show(newIndex, direction) {
    index = (newIndex + items.length) % items.length;
    const next = makeMedia(items[index]);
    const previous = current;
    stage.appendChild(next);
    current = next;

    if (!previous) return;
    if (reducedMotion.matches || !direction) {
      previous.remove();
      return;
    }

    next.classList.add("is-switching");
    const shrink = readDuration("--gallery-shrink-duration");
    const slide = readDuration("--gallery-slide-duration");
    const grow = readDuration("--gallery-grow-duration");
    const total = shrink + slide + grow;
    const slideStart = shrink / total;
    const slideEnd = (shrink + slide) / total;
    const scale = getComputedStyle(gallery).getPropertyValue("--gallery-switch-scale").trim() || "0.85";
    const ease = "ease-in-out";

    // כמה צריך לזוז כדי לצאת לגמרי מהמסך: חצי מסך ועוד חצי מהדימוי המוקטן
    function offscreen(element) {
      return window.innerWidth / 2 + element.getBoundingClientRect().width / 2 + 1;
    }
    const outX = -direction * offscreen(previous);
    const inX = direction * offscreen(next);

    animating = true;
    previous.animate([
      { scale: "1", translate: "0 0", offset: 0, easing: ease },
      { scale: scale, translate: "0 0", offset: slideStart, easing: ease },
      { scale: scale, translate: outX + "px 0", offset: slideEnd },
      { scale: scale, translate: outX + "px 0", offset: 1 }
    ], { duration: total, fill: "forwards" });

    const animation = next.animate([
      { scale: scale, translate: inX + "px 0", offset: 0 },
      { scale: scale, translate: inX + "px 0", offset: slideStart, easing: ease },
      { scale: scale, translate: "0 0", offset: slideEnd, easing: ease },
      { scale: "1", translate: "0 0", offset: 1 }
    ], { duration: total });

    animation.finished.then(function () {
      previous.remove();
      if (current !== next) return; // הגלריה נסגרה או נפתחה מחדש בינתיים
      animating = false;
      // לחיצה שהגיעה בזמן המעבר: המעבר הבא מתחיל עכשיו
      if (pendingStep) {
        const queued = pendingStep;
        pendingStep = 0;
        step(queued);
      }
    }).catch(function () {});
  }

  // ----- נעילת הגלילה: העמוד וכל השאר לא זזים, ואי אפשר להגיע אליהם ב-Tab -----
  const lockedElements = [];
  function lockPage(lock) {
    document.documentElement.classList.toggle("gallery-open", lock);
    if (lock) {
      Array.from(document.body.children).forEach(function (child) {
        if (child !== gallery && !child.inert) {
          child.inert = true;
          lockedElements.push(child);
        }
      });
    } else {
      lockedElements.forEach(function (child) { child.inert = false; });
      lockedElements.length = 0;
    }
  }

  function open(name, startIndex) {
    items = groups[name];
    openedFrom = document.activeElement;
    gallery.classList.toggle("is-single", items.length < 2);
    stage.innerHTML = "";
    current = null;
    animating = false;
    pendingStep = 0;
    show(Math.max(0, startIndex), 0);
    gallery.hidden = false;
    gallery.classList.remove("is-closing");
    lockPage(true);
    closeButton.focus({ preventScroll: true });
  }

  function close() {
    if (gallery.hidden || gallery.classList.contains("is-closing")) return;
    lockPage(false);
    function finish() {
      gallery.hidden = true;
      gallery.classList.remove("is-closing");
      stage.innerHTML = "";
      current = null;
      animating = false;
      pendingStep = 0;
    }
    if (reducedMotion.matches) {
      finish();
    } else {
      gallery.classList.add("is-closing");
      gallery.addEventListener("animationend", function onEnd(event) {
        if (event.target !== gallery) return;
        gallery.removeEventListener("animationend", onEnd);
        finish();
      });
    }
    if (openedFrom) openedFrom.focus({ preventScroll: true });
  }

  function step(direction) {
    if (items.length < 2) return;
    if (animating) {
      pendingStep = direction;
      return;
    }
    show(index + direction, direction);
  }

  closeButton.addEventListener("click", close);
  prevButton.addEventListener("click", function () { step(-1); });
  nextButton.addEventListener("click", function () { step(1); });

  // לחיצה על השכבה מחוץ לדימוי סוגרת. לחיצה על הדימוי עצמו לא
  gallery.addEventListener("click", function (event) {
    if (event.target === gallery || event.target === stage) close();
  });

  // מקלדת: Esc סוגר, החצים מדפדפים (לפני keyboard-nav.js, שלא יזיז את הפוקוס)
  window.addEventListener("keydown", function (event) {
    if (gallery.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      step(event.key === "ArrowRight" ? 1 : -1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  // בלי גלילה של העמוד מאחור (גלגלת ונגיעה)
  gallery.addEventListener("wheel", function (event) { event.preventDefault(); }, { passive: false });

  // החלקה הצידה בטלפון: ימינה = הקודם, שמאלה = הבא
  let touchStartX = null;
  let touchStartY = 0;
  gallery.addEventListener("touchstart", function (event) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }, { passive: true });
  gallery.addEventListener("touchmove", function (event) { event.preventDefault(); }, { passive: false });
  gallery.addEventListener("touchend", function (event) {
    if (touchStartX === null) return;
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    touchStartX = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
  });
})();
