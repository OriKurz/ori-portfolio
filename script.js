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
  const label = button.querySelector(".nav-button-label, .language-button-label");
  label.textContent = button.dataset[language.code];
  button.lang = language.code;
  button.dir = language.direction;
}

// הטיימר של כל כפתור שמחליף עכשיו שפות
const languageTimers = new Map();

// מתחילים להחליף שפה כל חצי שנייה
function startLanguageLoop(button) {
  if (languageTimers.has(button)) return;
  let currentIndex = 0;
  const timer = setInterval(function () {
    currentIndex = (currentIndex + 1) % languages.length;
    showLanguage(button, currentIndex);
  }, switchEvery);
  languageTimers.set(button, timer);
}

// עוצרים וחוזרים לאנגלית
function stopLanguageLoop(button) {
  clearInterval(languageTimers.get(button));
  languageTimers.delete(button);
  showLanguage(button, 0);
}

const navButtons = document.querySelectorAll(".nav-button");

// בעמודי הפרויקטים: הכפתורים שמחליפים שפה (שם הפרויקט, View full project)
const languageButtons = document.querySelectorAll(".language-button");

// מחליף שפות כשהעכבר על הכפתור או כשמגיעים אליו במקלדת
function loopLanguagesOnHover(button) {
  // עכבר נכנס / יוצא. נגיעה באצבע מטופלת בנפרד (למטה)
  button.addEventListener("pointerenter", function (event) {
    if (event.pointerType === "mouse") startLanguageLoop(button);
  });
  button.addEventListener("pointerleave", function (event) {
    if (event.pointerType === "mouse" && !button.classList.contains("is-active")) stopLanguageLoop(button);
  });

  // ניווט במקלדת
  button.addEventListener("focus", function () {
    if (button.matches(":focus-visible")) startLanguageLoop(button);
  });
  button.addEventListener("blur", function () {
    if (!button.classList.contains("is-active")) stopLanguageLoop(button);
  });
}

navButtons.forEach(loopLanguagesOnHover);
languageButtons.forEach(loopLanguagesOnHover);

// =========================================
// עמוד הבית בטלפון: נגיעה ראשונה בכפתור מדליקה אותו (רקע ורוד והחלפת שפות),
// ונגיעה שנייה באותו כפתור עוברת לעמוד שלו.
// נגיעה בכפתור אחר או מחוץ לכפתורים מכבה אותו. רק כפתור אחד דולק בכל רגע.
// =========================================

const mobileScreen = window.matchMedia("(max-width: 767.98px)");
const isHomePage = document.documentElement.classList.contains("page-home");
let activeButton = null;      // הכפתור הדולק (null = אף אחד)
let lastPointerType = "mouse"; // האם הלחיצה האחרונה הייתה באצבע או בעכבר

// מדליק כפתור אחד ומכבה את הקודם. null מכבה הכול
function setActiveButton(button) {
  if (button === activeButton) return;
  if (activeButton) {
    activeButton.classList.remove("is-active");
    stopLanguageLoop(activeButton);
  }
  activeButton = button;
  if (button) {
    button.classList.add("is-active");
    startLanguageLoop(button);
  }
}

window.addEventListener("pointerdown", function (event) {
  lastPointerType = event.pointerType;
}, true);

if (isHomePage) {
  navButtons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      if (lastPointerType !== "touch" || !mobileScreen.matches) return;
      // נגיעה שנייה באותו כפתור: הקישור עובד כרגיל
      if (button === activeButton) return;
      // נגיעה ראשונה: רק מדליקים, בלי לעבור עמוד
      event.preventDefault();
      setActiveButton(button);
    });
  });

  // נגיעה מחוץ לכפתורים מכבה את הכפתור הדולק
  window.addEventListener("pointerup", function (event) {
    if (event.pointerType === "touch" && !event.target.closest(".nav-button")) {
      setActiveButton(null);
    }
  });

  // חוזרים לעמוד בכפתור "אחורה": מתחילים בלי כפתור דולק
  window.addEventListener("pageshow", function () {
    setActiveButton(null);
  });
}

// =========================================
// עמודי הפרויקטים בטלפון: נגיעה בכפתור שמחליף שפה מתחילה את ההחלפה,
// ונגיעה נוספת בו (או מחוץ לו) עוצרת אותה. רק כפתור אחד מחליף בכל רגע.
// =========================================

if (languageButtons.length > 0) {
  languageButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (lastPointerType !== "touch") return;
      setActiveButton(button === activeButton ? null : button);
    });
  });

  window.addEventListener("pointerup", function (event) {
    if (event.pointerType === "touch" && !event.target.closest(".language-button")) {
      setActiveButton(null);
    }
  });
}

// =========================================
// עמוד מבואה לפרויקט: שלושת ריבועי השם מחליפים את שפת הטקסט במלבן.
// hover על ריבוע מציג את הטקסט בשפה שלו, ויציאה מחזירה לשפה שנבחרה.
// לחיצה על ריבוע נועלת את השפה שלו. בטעינה: אנגלית.
// =========================================

const nameSquares = document.querySelectorAll(".project-name");
const projectTexts = document.querySelectorAll(".project-text");
let chosenLanguage = "en";

// מציג רק את הטקסט בשפה code (en / he / ar)
function showProjectText(code) {
  projectTexts.forEach(function (text) {
    text.hidden = text.lang !== code;
  });
}

nameSquares.forEach(function (square) {
  square.addEventListener("pointerenter", function (event) {
    if (event.pointerType === "mouse") showProjectText(square.lang);
  });
  square.addEventListener("pointerleave", function (event) {
    if (event.pointerType === "mouse") showProjectText(chosenLanguage);
  });

  square.addEventListener("click", function () {
    chosenLanguage = square.lang;
    showProjectText(chosenLanguage);
    // לקוראי מסך: איזה ריבוע נבחר
    nameSquares.forEach(function (other) {
      other.setAttribute("aria-pressed", other === square ? "true" : "false");
    });
  });
});

// =========================================
// בר האינדקס בעמוד מבואה לפרויקט: כל כדור הוא פרויקט.
// בכל רגע רק כדור אחד פתוח ומורחב לפס עם שם הפרויקט.
// בטעינה The Perfect Crime נפתח אחרי השהיה קצרה. hover על כדור אחר פותח אותו,
// וכשהעכבר יוצא מהבר חוזרים ל-The Perfect Crime. בטלפון: נגיעה בכדור פותחת אותו.
// =========================================

const indexBar = document.querySelector(".index-bar");

if (indexBar) {
  const projectBalls = indexBar.querySelectorAll("button.index-ball");
  const defaultBall = indexBar.querySelector("[data-default]");
  const openDelay = 600; // כמה זמן (מילישניות) מחכים בטעינה לפני שהפס נפתח

  // פותח כדור אחד וסוגר את כל השאר
  function openBall(ball) {
    projectBalls.forEach(function (other) {
      other.classList.toggle("is-open", other === ball);
    });
  }

  // מודד את השם הארוך מבין שלוש השפות של כל כדור, כדי שרוחב הפס יהיה קבוע
  function measureBallNames() {
    projectBalls.forEach(function (ball) {
      const label = ball.querySelector(".index-ball-label");
      const shownLanguage = Math.max(0, languages.findIndex(function (language) {
        return language.code === ball.lang;
      }));
      let widest = 0;
      languages.forEach(function (language, index) {
        showLanguage(ball, index);
        widest = Math.max(widest, label.getBoundingClientRect().width);
      });
      showLanguage(ball, shownLanguage);
      ball.style.setProperty("--label-width", Math.ceil(widest) + "px");
    });
  }

  projectBalls.forEach(function (ball) {
    // עכבר או מקלדת: הכדור שעליו עומדים נפתח
    ball.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "mouse") openBall(ball);
    });
    ball.addEventListener("focus", function () {
      openBall(ball);
    });
    // טלפון: נגיעה פותחת את הכדור
    ball.addEventListener("click", function () {
      if (lastPointerType === "touch") openBall(ball);
    });
  });

  // העכבר יצא מהבר: חוזרים לפרויקט של העמוד
  indexBar.addEventListener("pointerleave", function (event) {
    if (event.pointerType === "mouse") openBall(defaultBall);
  });

  // אחרי שהפונטים נטענו (אחרת המדידה לא מדויקת): מודדים, ואז הפס של העמוד נפתח
  document.fonts.ready.then(function () {
    measureBallNames();
    setTimeout(function () {
      if (!indexBar.querySelector(".is-open")) openBall(defaultBall);
    }, openDelay);
  });

  // גודל המשבצת משתנה עם החלון, אז מודדים מחדש
  window.addEventListener("resize", measureBallNames);
}

// =========================================
// הפולרויד בעמוד הבית: נדחף כמו דף נייר כבד שנעוץ בנקודה אחת.
// נקודת הציר היא מרכז הקצה העליון של התמונה (ראו .photo ב-styles.css).
// אין קפיץ: התמונה נשארת בזווית שאליה נדחפה, ורק דחיפה נוספת מזיזה אותה.
// =========================================

const photo = document.querySelector(".photo");

if (photo) {
  // הגדרות כלליות
  const maxAngle = 18;       // זווית מקסימלית (במעלות) לכל כיוון מהזווית בעיצוב
  const edgeSlowdown = 3;    // ליד הקצה של הטווח התמונה מאטה בהדרגה (גדול יותר = עוצרת קרוב יותר לקצה)
  const pushDuration = 60;   // כמה זמן (מילישניות) כל תנועת עכבר ממשיכה לדחוף
  const newPushAfter = 250;  // הפסקה (מילישניות) שאחריה תנועת עכבר נחשבת דחיפה חדשה
  const softStopSpeed = 6;   // מתחת למהירות הזאת החיכוך נחלש (עד שליש), כדי שהעצירה תהיה רכה
  const tapPush = 12;        // דחיפה קטנה מנגיעה בטלפון (מעלות לשנייה)
  const touchSensitivity = 9; // בטלפון החלקת אצבע דוחפת פי כמה יותר חזק מהעכבר
  const tempo = 1.3;         // קצב התנועה: 1 = הקצב המקורי, 1.3 = מהיר ב-30% (אותן זוויות, בפחות זמן)

  // סוגי דחיפה. כל דחיפה חדשה מקבלת סוג אחר, כדי שהתנועה לא תרגיש חוזרת.
  // strength: כמה חזק תנועת העכבר דוחפת
  // buildUp:  כמה זמן (שניות) לוקח לנייר "להיגרר" אחרי היד. גדול = כבד ואיטי
  // glide:    כמה זמן (שניות) הנייר ממשיך לגלוש אחרי שהיד עוזבת
  // friction: חיכוך קבוע (מעלות לשנייה בשנייה) שעוצר את הגלישה
  const pushTypes = [
    { name: "heavy-slide", strength: 0.38, buildUp: 0.30, glide: 0.80, friction: 5 },
    { name: "firm-shove",  strength: 0.50, buildUp: 0.16, glide: 0.45, friction: 9 },
    { name: "soft-nudge",  strength: 0.26, buildUp: 0.38, glide: 0.35, friction: 4 },
    { name: "lazy-drift",  strength: 0.32, buildUp: 0.50, glide: 1.10, friction: 2.5 },
  ];

  // הדחיפה בטלפון: עדינה, עם גלישה קצרה
  const tapType = pushTypes[2];

  // מי שביקש במחשב צמצום תנועה: לא מזיזים את התמונה
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let angle = 0;          // הזווית הנוספת עכשיו (מעלות). נשמרת בין דחיפות
  let speed = 0;          // מהירות הסיבוב (מעלות לשנייה)
  let handSpeed = 0;      // המהירות שהיד "רוצה" לתת לנייר
  let pushUntil = 0;      // עד מתי היד עדיין דוחפת
  let lastPushTime = -Infinity;
  let pushType = pushTypes[0];
  let typeBag = [];       // הסוגים שעוד לא השתמשנו בהם בסבב הנוכחי
  let lastPointer = null; // המיקום והזמן האחרונים של העכבר
  let frame = null;       // מספר הפריים של האנימציה (null = האנימציה עצרה)
  let lastFrameTime = 0;

  // בוחר את סוג הדחיפה הבא: כל הסוגים בסדר אקראי, ואף פעם לא אותו סוג פעמיים ברצף
  function nextPushType() {
    if (typeBag.length === 0) {
      typeBag = pushTypes.slice().sort(function () { return Math.random() - 0.5; });
      if (typeBag[0] === pushType) {
        typeBag.push(typeBag.shift());
      }
    }
    return typeBag.shift();
  }

  // מחשב איפה נמצאת התמונה במסך: נקודת הציר, הגודל וההטיה
  function getPhotoGeometry() {
    const home = photo.offsetParent.getBoundingClientRect();
    const width = photo.offsetWidth;
    const height = photo.offsetHeight;
    const tilt = parseFloat(getComputedStyle(photo).getPropertyValue("--photo-rotation"));
    const tiltRadians = (tilt * Math.PI) / 180;
    // מרכז התמונה, ומשם חצי גובה "למעלה" בכיוון של ההטיה
    const centerX = home.left + photo.offsetLeft;
    const centerY = home.top + photo.offsetTop;
    return {
      pivotX: centerX + (height / 2) * Math.sin(tiltRadians),
      pivotY: centerY - (height / 2) * Math.cos(tiltRadians),
      width: width,
      height: height,
      tilt: tilt,
    };
  }

  // בודק אם נקודה במסך נמצאת על התמונה (כולל ההטיה והזווית הנוכחית).
  // בודקים לפי חישוב ולא לפי אירועי עכבר על התמונה, כי הכותרת portfolio
  // נמצאת מעל החלק העליון של התמונה
  function pointOnPhoto(x, y) {
    const photoBox = getPhotoGeometry();
    const radians = (-(photoBox.tilt + angle) * Math.PI) / 180;
    const dx = x - photoBox.pivotX;
    const dy = y - photoBox.pivotY;
    // מסובבים את הנקודה בחזרה, כאילו התמונה ישרה
    const across = dx * Math.cos(radians) - dy * Math.sin(radians);
    const down = dx * Math.sin(radians) + dy * Math.cos(radians);
    return {
      inside: Math.abs(across) <= photoBox.width / 2 && down >= 0 && down <= photoBox.height,
      across: across,
    };
  }

  // בעמוד הבית יש בריכת כדורים (ball-pit.js). במקום שבו כדור מכסה את התמונה,
  // היד דוחפת את הכדור ולא את התמונה. בעמודים בלי כדורים זה תמיד false
  function coveredByBall(x, y) {
    return typeof isUnderBall === "function" && isUnderBall(x, y);
  }

  // צעד אחד של האנימציה. הזמן מוכפל ב-tempo, כך שכל התנועה רצה מהר יותר
  function step(time) {
    const seconds = tempo * Math.min((time - lastFrameTime) / 1000, 1 / 30);
    lastFrameTime = time;
    const handIsPushing = time < pushUntil;

    if (handIsPushing) {
      // היד דוחפת: הנייר הכבד מגיע בהדרגה למהירות של היד
      speed += (handSpeed - speed) * (1 - Math.exp(-seconds / pushType.buildUp));
    } else {
      // היד עזבה: הנייר גולש ומאט בהדרגה (התנגדות האוויר + חיכוך)
      speed *= Math.exp(-seconds / pushType.glide);
      const friction = pushType.friction * seconds * Math.max(0.3, Math.min(1, Math.abs(speed) / softStopSpeed));
      speed = Math.sign(speed) * Math.max(0, Math.abs(speed) - friction);
    }

    // ליד הקצה של הטווח: ככל שמתקרבים לקצה, המהירות לכיוונו קטנה, בלי קפיצה
    const room = maxAngle - Math.sign(speed) * angle;
    speed = Math.sign(speed) * Math.min(Math.abs(speed), Math.max(0, room) * edgeSlowdown);
    angle += speed * seconds;
    angle = Math.max(-maxAngle, Math.min(maxAngle, angle));

    // הנייר נעצר: עוצרים את האנימציה, והזווית נשארת כמו שהיא
    if (!handIsPushing && Math.abs(speed) < 0.05) {
      speed = 0;
      frame = null;
    } else {
      frame = requestAnimationFrame(step);
    }

    photo.style.setProperty("--photo-swing", angle + "deg");
  }

  function startAnimation() {
    if (frame) return;
    lastFrameTime = performance.now();
    frame = requestAnimationFrame(step);
  }

  // דוחף את התמונה. turn היא מהירות הסיבוב שהיד נותנת (מעלות לשנייה).
  // אם עברה הפסקה מאז הדחיפה הקודמת, זו דחיפה חדשה עם סוג חדש
  function pushPhoto(turn, now) {
    if (now - lastPushTime > newPushAfter) {
      pushType = nextPushType();
      photo.dataset.push = pushType.name;
    }
    lastPushTime = now;
    // מחלקים ב-tempo כדי שהתנועה המהירה יותר תגיע לאותן זוויות כמו קודם
    handSpeed = (pushType.strength * turn) / tempo;
    pushUntil = now + pushDuration;
    startAnimation();
  }

  // דוחף את התמונה לפי תנועה של היד מהנקודה from אל (x, y).
  // הדחיפה תלויה במהירות ובכיוון התנועה, ובמרחק מנקודת הציר.
  // sensitivity מכפיל את הדחיפה (באצבע היא חזקה יותר)
  function pushFromMovement(from, x, y, now, sensitivity) {
    const seconds = (now - from.time) / 1000;
    if (seconds <= 0) return;
    const photoBox = getPhotoGeometry();
    const speedX = (x - from.x) / seconds;
    const speedY = (y - from.y) / seconds;
    const fromPivotX = x - photoBox.pivotX;
    const fromPivotY = y - photoBox.pivotY;
    // מהירות הסיבוב שהיד נותנת (במעלות לשנייה).
    // תנועה ימינה מתחת לציר מסובבת נגד כיוון השעון, כך שהתחתית זזה ימינה
    const turn = (fromPivotX * speedY - fromPivotY * speedX) / (photoBox.height * photoBox.height);
    pushPhoto(sensitivity * turn * (180 / Math.PI), now);
  }

  // עכבר
  window.addEventListener("pointermove", function (event) {
    if (event.pointerType === "touch" || reducedMotion.matches) return;

    const now = performance.now();
    if (lastPointer && pointOnPhoto(event.clientX, event.clientY).inside && !coveredByBall(event.clientX, event.clientY)) {
      pushFromMovement(lastPointer, event.clientX, event.clientY, now, 1);
    }
    lastPointer = { x: event.clientX, y: event.clientY, time: now };
  });

  // טלפון: החלקת אצבע על התמונה דוחפת אותה, כמו העכבר במחשב, אבל ברגישות גבוהה.
  // האירועים "פסיביים" (passive): הם רק מקשיבים ולא משנים את התנהגות הדפדפן
  let lastTouch = null;

  window.addEventListener("touchstart", function (event) {
    const touch = event.touches[0];
    lastTouch = { x: touch.clientX, y: touch.clientY, time: performance.now() };
  }, { passive: true });

  window.addEventListener("touchmove", function (event) {
    const touch = event.touches[0];
    const now = performance.now();
    if (lastTouch && !reducedMotion.matches && pointOnPhoto(touch.clientX, touch.clientY).inside && !coveredByBall(touch.clientX, touch.clientY)) {
      pushFromMovement(lastTouch, touch.clientX, touch.clientY, now, touchSensitivity);
    }
    lastTouch = { x: touch.clientX, y: touch.clientY, time: now };
  }, { passive: true });

  // טלפון: נגיעה בתמונה נותנת דחיפה קטנה אחת, הרחק מהאצבע
  window.addEventListener("pointerdown", function (event) {
    if (event.pointerType !== "touch" || reducedMotion.matches) return;

    const touch = pointOnPhoto(event.clientX, event.clientY);
    if (!touch.inside || coveredByBall(event.clientX, event.clientY)) return;
    pushType = tapType;
    lastPushTime = performance.now();
    speed += touch.across > 0 ? tapPush : -tapPush;
    startAnimation();
  });
}

// =========================================
// עמוד פרויקט מלא: הסרטון בראש החלק הנגלל.
// בטעינה הוא עומד על הפריים הראשון. לחיצה מפעילה אותו עם סאונד,
// לחיצה נוספת עוצרת, ולחיצה אחרי זה ממשיכה מאותה נקודה. הוא רץ בלופ.
// בר ההתקדמות בתחתית מראה איפה אנחנו בסרטון, ואפשר לגרור אותו.
// =========================================

const videoPlayer = document.querySelector(".video-player");

if (videoPlayer) {
  const video = videoPlayer.querySelector("video");
  const progressBar = videoPlayer.querySelector(".video-progress");
  const keyboardStep = 5; // כמה שניות זזים בחץ ימינה / שמאלה על הבר
  let isSeeking = false;  // האם גוררים עכשיו את הבר
  let progressFrame = null;

  // מפעיל (עם סאונד) או עוצר
  function togglePlay() {
    if (video.paused) {
      video.muted = false;
      video.play().catch(function () {});
    } else {
      video.pause();
    }
  }

  // מעדכן את הבר לפי המיקום בסרטון (ratio: מ-0 עד 1)
  function showProgress(ratio) {
    progressBar.style.setProperty("--progress", ratio);
    progressBar.setAttribute("aria-valuenow", Math.round(ratio * 100));
  }

  function currentRatio() {
    return video.duration ? video.currentTime / video.duration : 0;
  }

  // בזמן שהסרטון רץ: מעדכנים את הבר בכל פריים, כדי שהתנועה תהיה חלקה
  function followProgress() {
    if (!isSeeking) showProgress(currentRatio());
    progressFrame = requestAnimationFrame(followProgress);
  }

  video.addEventListener("play", function () {
    if (!progressFrame) followProgress();
  });
  video.addEventListener("pause", function () {
    cancelAnimationFrame(progressFrame);
    progressFrame = null;
    showProgress(currentRatio());
  });

  // לחיצה על הסרטון (אבל לא על הבר)
  videoPlayer.addEventListener("click", function (event) {
    if (event.target.closest(".video-progress")) return;
    togglePlay();
  });

  // מקלדת: Enter או רווח על הסרטון
  videoPlayer.addEventListener("keydown", function (event) {
    if (event.target !== videoPlayer) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      togglePlay();
    }
  });

  // קופץ לנקודה בסרטון לפי מיקום העכבר / האצבע על הבר
  function seekToPointer(event) {
    const box = progressBar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    if (video.duration) video.currentTime = ratio * video.duration;
    showProgress(ratio);
  }

  // גרירה: לוחצים על הבר, וכל עוד לא עוזבים הסרטון זז עם העכבר
  progressBar.addEventListener("pointerdown", function (event) {
    isSeeking = true;
    progressBar.setPointerCapture(event.pointerId);
    videoPlayer.classList.add("is-seeking");
    seekToPointer(event);
  });
  progressBar.addEventListener("pointermove", function (event) {
    if (isSeeking) seekToPointer(event);
  });
  function stopSeeking() {
    isSeeking = false;
    videoPlayer.classList.remove("is-seeking");
  }
  progressBar.addEventListener("pointerup", stopSeeking);
  progressBar.addEventListener("pointercancel", stopSeeking);

  // מקלדת על הבר: חיצים קדימה ואחורה
  progressBar.addEventListener("keydown", function (event) {
    if (!video.duration) return;
    if (event.key === "ArrowRight") video.currentTime = Math.min(video.duration, video.currentTime + keyboardStep);
    else if (event.key === "ArrowLeft") video.currentTime = Math.max(0, video.currentTime - keyboardStep);
    else return;
    event.preventDefault();
    showProgress(currentRatio());
  });
}
