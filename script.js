// =========================================
// האתר כרגע באנגלית בלבד: אין החלפת שפות בכפתורים.
// ה-hover הוורוד של הכפתורים נעשה ב-CSS, ובטלפון נגיעה אחת מובילה ישר לעמוד.
// =========================================

// האם הלחיצה האחרונה הייתה באצבע או בעכבר (בר האינדקס משתמש בזה)
let lastPointerType = "mouse";

window.addEventListener("pointerdown", function (event) {
  lastPointerType = event.pointerType;
}, true);

// בטלפון (Safari באייפון) מצב הלחיצה (:active) מופיע רק אם יש מאזין לנגיעה בעמוד
document.addEventListener("touchstart", function () {}, { passive: true });

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

  // מודד את השם של כל כדור, כדי שהפס ייפתח בדיוק לרוחב שלו
  function measureBallNames() {
    projectBalls.forEach(function (ball) {
      const label = ball.querySelector(".index-ball-label");
      ball.style.setProperty("--label-width", Math.ceil(label.getBoundingClientRect().width) + "px");
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
  // בודקים לפי חישוב ולא לפי אירועי עכבר על התמונה, כי הכותרת ORI KURZ
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

  // is-playing מסתיר את משולש ה-Play בזמן שהסרטון רץ
  video.addEventListener("play", function () {
    videoPlayer.classList.add("is-playing");
    if (!progressFrame) followProgress();
  });
  video.addEventListener("pause", function () {
    videoPlayer.classList.remove("is-playing");
    cancelAnimationFrame(progressFrame);
    progressFrame = null;
    showProgress(currentRatio());
  });

  // לחיצה על הסרטון (אבל לא על הבר ולא על כפתור המסך המלא)
  videoPlayer.addEventListener("click", function (event) {
    if (event.target.closest(".video-progress, .video-fullscreen-button")) return;
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

  // ----- מסך מלא -----
  // במחשב (ובאנדרואיד) כל הנגן עובר למסך מלא, עם הבר המעוצב שלנו.
  // זה אותו אלמנט וידאו, אז הסרטון ממשיך מאותה נקודה ובאותו מצב.
  // באייפון אי אפשר להכניס למסך מלא אלמנט שהוא לא וידאו, אז שם
  // משתמשים במסך המלא של הנגן המובנה של הדפדפן.
  const fullscreenButton = videoPlayer.querySelector(".video-fullscreen-button");
  const controlsHideDelay = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--controls-hide-delay"));
  let hideControlsTimer = null;

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement;
  }

  function toggleFullscreen() {
    if (fullscreenElement()) {
      if (document.exitFullscreen) document.exitFullscreen();
      else document.webkitExitFullscreen();
    } else if (videoPlayer.requestFullscreen) {
      videoPlayer.requestFullscreen().catch(function () {});
    } else if (videoPlayer.webkitRequestFullscreen) {
      videoPlayer.webkitRequestFullscreen();
    } else if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen(); // אייפון
    }
  }

  fullscreenButton.addEventListener("click", toggleFullscreen);

  // נכנסים או יוצאים (גם ב-Esc): מעדכנים את המחלקה ואת התווית של הכפתור
  function onFullscreenChange() {
    const isFullscreen = fullscreenElement() === videoPlayer;
    videoPlayer.classList.toggle("is-fullscreen", isFullscreen);
    fullscreenButton.setAttribute("aria-label", isFullscreen ? "Exit full screen" : "Full screen");
    showControls();
  }
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);

  // במסך המלא הבר מופיע כשמזיזים את העכבר (או נוגעים), ונעלם אחרי כמה שניות בלי תנועה
  function showControls() {
    videoPlayer.classList.add("is-active");
    clearTimeout(hideControlsTimer);
    hideControlsTimer = setTimeout(function () {
      videoPlayer.classList.remove("is-active");
    }, controlsHideDelay);
  }
  videoPlayer.addEventListener("pointermove", showControls);
  videoPlayer.addEventListener("pointerdown", showControls);
}
// =========================================
// עמוד Say Hi: כדורי יצירת הקשר נעים בחלון כל הזמן.
// כל כדור נע בקו ישר ובמהירות קבועה, ומשנה כיוון רק בשני מקרים:
// כשהוא פוגע בקיר (המסגרת הכתומה), או כשהוא נוגע בכדור אחר.
// אין כוחות מרחוק: כדורים לא משפיעים זה על זה עד שהקצוות שלהם נוגעים,
// ואז הם נהדפים בהתנגשות אלסטית, כמו כדורי ביליארד.
// כשהעכבר מתקרב לכדור (פעם וחצי מהקוטר שלו) הכדור מאט, כדי שיהיה קל לתפוס אותו,
// וכשהעכבר מתרחק הוא חוזר בהדרגה למהירות הרגילה. ההאטה משנה רק את המהירות, לא את הכיוון.
// כדור שנבחר במקלדת (Tab) עוצר. מי שביקש פחות תנועה: הכדורים עומדים במקום.
// =========================================

const contactBalls = document.querySelectorAll(".contact-ball");

if (contactBalls.length > 0) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileScreen = window.matchMedia("(max-width: 767.98px) and (orientation: portrait)");

  // המהירות: כמה קטרים של כדור בשנייה. במובייל לאט יותר.
  // המהירות המקורית (0.4 ו-0.22), פי 2 ועוד 50% (פי 3 בסך הכול),
  // ומחולקת ב-1.15 כי הכדורים גדלו ב-15% (כדי שהמהירות בפיקסלים תהיה בדיוק פי 3)
  // ועוד 40% (פי 1.4)
  const desktopSpeed = 0.4 * 3 / 1.15 * 1.4;
  // במובייל עוד 60% (פי 1.6): כאן מגיעים לכדורים באצבע, ולא רודפים אחריהם בעכבר
  const mobileSpeed = 0.22 * 3 / 1.15 * 1.4 * 1.6;
  // ההאטה ליד העכבר: באיזה מרחק (בקטרים, ממרכז הכדור) ועד כמה (0.04 = 4% מהמהירות).
  // 4% מהמהירות המשולשת = אותה מהירות איטית כמו בהתחלה, כך שעדיין קל לתפוס את הכדור
  const slowRadius = 1.5;
  const slowSpeed = 0.04;
  // כמה מהר הכדור מאט כשהעכבר מתקרב, וכמה לאט הוא חוזר למהירות כשהעכבר מתרחק
  const slowDownRate = 6;
  const speedUpRate = 1.2;
  // בכל צעד קטן כדור זז לכל היותר פיקסל אחד, כדי שההתנגשות תיתפס בדיוק ברגע המגע
  const maxStepDistance = 1;

  // נקודות ההתחלה, ביחס לאזור הוורוד (0 עד 1), מחוץ לכותרת. גם המקום שבו הם עומדים כשאין תנועה
  const desktopStart = [[0.12, 0.45], [0.88, 0.4], [0.88, 0.85], [0.12, 0.85]];
  const mobileStart = [[0.2, 0.3], [0.8, 0.3], [0.2, 0.8], [0.8, 0.8]];
  // הקיר התחתון: הקו שבו מתחיל החלק הכתום (אם יש כזה בעמוד)
  const bottomWall = document.querySelector(".say-hi-about");
  // שכבת הכדורים, והשורה הראשונה של הגריד שמעל הכתום (רק במובייל)
  const ballsLayer = document.querySelector(".contact-balls");
  const topRow = document.querySelector(".say-hi-top-row");

  // הגובה של החלק הכתום (לפי הטקסט) נשמר ב---say-hi-about-height,
  // כדי שהגריד הוורוד יחלק את השורות העודפות לפי המקום שבאמת נשאר מעליו
  if (bottomWall && "ResizeObserver" in window) {
    new ResizeObserver(function () {
      document.documentElement.style.setProperty("--say-hi-about-height", bottomWall.offsetHeight + "px");
    }).observe(bottomWall);
  }

  // העכבר (או האצבע בזמן נגיעה). null = אין עכבר בחלון
  let pointer = null;
  let lastTime = null;
  let frame = null;

  // כיווני ההתחלה: שונים מאוד זה מזה (120 מעלות בין כדור לכדור), כך שהמסלולים נחתכים.
  // אף כיוון לא קרוב לאופקי או לאנכי, אחרת כדור "נתקע" בין שני קירות מול אותו קיר
  const firstAngle = Math.random() * Math.PI * 2;
  function startAngle(i) {
    let angle = firstAngle + (i * Math.PI * 2) / contactBalls.length;
    const fromAxis = ((angle % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2); // 0 עד 90 מעלות
    const minFromAxis = Math.PI / 9; // 20 מעלות
    if (fromAxis < minFromAxis) angle += minFromAxis;
    if (fromAxis > Math.PI / 2 - minFromAxis) angle -= minFromAxis;
    return angle;
  }

  // המצב של כל כדור: מרכז, כיוון התנועה (וקטור באורך 1), ועד כמה הוא מואט כרגע (1 = מהירות מלאה)
  const balls = Array.from(contactBalls).map(function (element, i) {
    const angle = startAngle(i);
    const ball = { element: element, x: 0, y: 0, dx: Math.cos(angle), dy: Math.sin(angle), pace: 1, focused: false };
    // עוצר רק בפוקוס מהמקלדת. נגיעה בכדור (שנותנת לו פוקוס בחלק מהדפדפנים) לא עוצרת אותו
    element.addEventListener("focus", function () { ball.focused = element.matches(":focus-visible"); });
    element.addEventListener("blur", function () { ball.focused = false; });
    // כדור שעוד לא מחובר לשום קובץ (href="#", כמו CV): הלחיצה לא עושה כלום
    element.addEventListener("click", function (event) {
      if (element.getAttribute("href") === "#") event.preventDefault();
    });
    return ball;
  });

  // הקירות: האזור הוורוד שגלוי. מהצדדים ומלמעלה החלון פחות המסגרת הכתומה,
  // ומלמטה הקו שבו מתחיל החלק הכתום. הכול ביחס למסך (שכבת הכדורים קבועה על המסך),
  // כך שבמובייל, כשהכתום עולה בגלילה, הקיר התחתון עולה איתו ודוחף את הכדורים.
  // במובייל הקיר לא עולה מעל שתי שורות של הגריד: משם הכדורים ממשיכים לנוע מתחת לכתום,
  // ושכבת הכדורים נחתכת בקצה הכתום, כך שרואים רק את מה שבחלק הוורוד הגלוי
  function getBounds() {
    const frame = getComputedStyle(document.body, "::after");
    const windowBottom = window.innerHeight - (parseFloat(frame.borderBottomWidth) || 0);
    let bottom = bottomWall
      ? Math.min(windowBottom, bottomWall.getBoundingClientRect().top)
      : windowBottom;
    const rowHeight = topRow ? topRow.offsetHeight : 0; // משבצת וקו (0 במחשב)
    if (rowHeight > 0) {
      const visibleBottom = Math.max(bottom, rowHeight);
      ballsLayer.style.clipPath = "inset(0 0 " + Math.max(0, window.innerHeight - visibleBottom) + "px 0)";
      bottom = Math.max(bottom, 2 * rowHeight);
    } else {
      ballsLayer.style.clipPath = "";
    }
    return {
      left: parseFloat(frame.borderLeftWidth) || 0,
      top: parseFloat(frame.borderTopWidth) || 0,
      right: window.innerWidth - (parseFloat(frame.borderRightWidth) || 0),
      bottom: bottom,
      // במובייל: המשבצת של ההמבורגר (בפינה השמאלית העליונה) היא מכשול, והכדורים לא נכנסים אליה
      menuCell: rowHeight > 0 ? { right: rowHeight, bottom: rowHeight } : null
    };
  }

  // הרדיוס של כל כדור, מהגודל האמיתי שלו על המסך (getBoundingClientRect לא מעגל לפיקסל שלם).
  // זה גם רדיוס ההתנגשות בפיזיקה
  function measureRadii() {
    balls.forEach(function (ball) {
      ball.radius = ball.element.getBoundingClientRect().width / 2;
    });
  }

  function draw(ball) {
    ball.element.style.transform = "translate(" + (ball.x - ball.radius) + "px, " + (ball.y - ball.radius) + "px)";
  }

  // מציב את הכדורים בנקודות ההתחלה
  function placeBalls() {
    const start = mobileScreen.matches ? mobileStart : desktopStart;
    const bounds = getBounds();
    measureRadii();
    balls.forEach(function (ball, i) {
      ball.x = bounds.left + start[i % start.length][0] * (bounds.right - bounds.left);
      ball.y = bounds.top + start[i % start.length][1] * (bounds.bottom - bounds.top);
      draw(ball);
      ball.element.classList.add("is-ready");
    });
  }

  // קיר: כשקצה הכדור מגיע לקיר, הכדור נצמד אליו והכיוון מתהפך (כמו כדור שפוגע בשולחן ביליארד)
  function bounceOffWalls(ball, bounds) {
    if (ball.x - ball.radius < bounds.left) { ball.x = bounds.left + ball.radius; ball.dx = Math.abs(ball.dx); }
    if (ball.x + ball.radius > bounds.right) { ball.x = bounds.right - ball.radius; ball.dx = -Math.abs(ball.dx); }
    if (ball.y - ball.radius < bounds.top) { ball.y = bounds.top + ball.radius; ball.dy = Math.abs(ball.dy); }
    if (ball.y + ball.radius > bounds.bottom) { ball.y = bounds.bottom - ball.radius; ball.dy = -Math.abs(ball.dy); }
  }

  // מכשול מלבני בפינה השמאלית העליונה (המשבצת של ההמבורגר): כשהכדור נוגע בו,
  // הוא נדחף החוצה מהנקודה הקרובה ביותר במלבן, וחוזר ממנו כמו מקיר
  function bounceOffCorner(ball, cell) {
    const nearestX = Math.min(ball.x, cell.right);
    const nearestY = Math.min(ball.y, cell.bottom);
    let nx = ball.x - nearestX;
    let ny = ball.y - nearestY;
    const distance = Math.hypot(nx, ny);
    if (distance >= ball.radius) return;
    if (distance < 0.001) {
      // המרכז בתוך המשבצת: יוצאים מהצלע הקרובה
      if (cell.right - ball.x < cell.bottom - ball.y) { nx = 1; ny = 0; } else { nx = 0; ny = 1; }
      ball.x = nx ? cell.right + ball.radius : ball.x;
      ball.y = ny ? cell.bottom + ball.radius : ball.y;
    } else {
      nx /= distance;
      ny /= distance;
      ball.x = nearestX + nx * ball.radius;
      ball.y = nearestY + ny * ball.radius;
    }
    const along = ball.dx * nx + ball.dy * ny;
    if (along < 0) {
      ball.dx -= 2 * along * nx;
      ball.dy -= 2 * along * ny;
    }
  }

  // שומר כיוון חדש לכדור (וקטור באורך 1). אם התנועה אחרי ההתנגשות כמעט אפס
  // (כדור שפגע בכדור עומד חזיתית), הכדור פשוט מוחזר מנקודת המגע כמו מקיר
  function setDirection(ball, x, y, nx, ny) {
    const length = Math.hypot(x, y);
    if (length > 0.001) {
      ball.dx = x / length;
      ball.dy = y / length;
    } else {
      const along = ball.dx * nx + ball.dy * ny;
      ball.dx -= 2 * along * nx;
      ball.dy -= 2 * along * ny;
    }
  }

  // התנגשות בין שני כדורים: רק כשהמרחק בין המרכזים קטן מסכום הרדיוסים, כלומר הקצוות נוגעים
  function collide(a, b) {
    const offsetX = b.x - a.x;
    const offsetY = b.y - a.y;
    const distance = Math.hypot(offsetX, offsetY);
    const touching = a.radius + b.radius;
    if (distance >= touching) return;

    // הכיוון של קו המגע, מהמרכז של a למרכז של b
    const nx = distance > 0 ? offsetX / distance : 1;
    const ny = distance > 0 ? offsetY / distance : 0;

    // לא חודרים: מרחיקים את שניהם לאורך קו המגע, עד שהם בדיוק נוגעים
    const overlap = (touching - distance) / 2;
    a.x -= nx * overlap;
    a.y -= ny * overlap;
    b.x += nx * overlap;
    b.y += ny * overlap;

    // התנועה האמיתית של כל כדור (כיוון כפול הקצב שלו)
    const ax = a.dx * a.pace, ay = a.dy * a.pace;
    const bx = b.dx * b.pace, by = b.dy * b.pace;
    const approach = (ax - bx) * nx + (ay - by) * ny;
    if (approach <= 0) return; // כבר מתרחקים זה מזה

    // התנגשות אלסטית בין שני כדורים באותו משקל: הם מחליפים ביניהם את התנועה שלאורך קו המגע.
    // מזה נקבע הכיוון החדש של כל אחד. המהירות של כל כדור נשארת קבועה
    setDirection(a, ax - approach * nx, ay - approach * ny, nx, ny);
    setDirection(b, bx + approach * nx, by + approach * ny, nx, ny);
  }

  function step(time) {
    const dt = lastTime === null ? 0 : Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;

    measureRadii();
    const bounds = getBounds();
    // המהירות בפיקסלים לשנייה (לפי הקוטר של הכדור)
    const speed = (mobileScreen.matches ? mobileSpeed : desktopSpeed) * balls[0].radius * 2;

    // 1. ההאטה: ליד העכבר הכדור מאט מהר, ורחוק ממנו הוא חוזר לאט למהירות מלאה
    balls.forEach(function (ball) {
      let targetPace = 1;
      if (ball.focused) {
        targetPace = 0;
      } else if (pointer && Math.hypot(pointer.x - ball.x, pointer.y - ball.y) < slowRadius * ball.radius * 2) {
        targetPace = slowSpeed;
      }
      const rate = targetPace < ball.pace ? slowDownRate : speedUpRate;
      ball.pace += (targetPace - ball.pace) * (1 - Math.exp(-rate * dt));
    });

    // 2. התזוזה, בצעדים קטנים: אחרי כל צעד בודקים קירות והתנגשויות
    const steps = Math.min(20, Math.max(1, Math.ceil((speed * dt) / maxStepDistance)));
    const stepTime = dt / steps;
    for (let s = 0; s < steps; s++) {
      balls.forEach(function (ball) {
        ball.x += ball.dx * speed * ball.pace * stepTime;
        ball.y += ball.dy * speed * ball.pace * stepTime;
      });
      balls.forEach(function (ball, i) {
        balls.slice(i + 1).forEach(function (other) {
          collide(ball, other);
        });
      });
      balls.forEach(function (ball) {
        bounceOffWalls(ball, bounds);
        if (bounds.menuCell) bounceOffCorner(ball, bounds.menuCell);
      });
    }

    balls.forEach(draw);
    frame = requestAnimationFrame(step);
  }

  function start() {
    cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
    placeBalls();
    if (!reducedMotion.matches) frame = requestAnimationFrame(step);
  }

  // העכבר: איפה הוא בחלון. רק עכבר: במכשירי מגע אין האטה, והכדורים תמיד נעים במהירות הרגילה
  // (נגיעה שנגמרת בגלילה לא שולחת pointerup, ומיקום שנשאר היה מקפיא את הכדורים לידו)
  window.addEventListener("pointermove", function (event) {
    if (event.pointerType === "mouse") pointer = { x: event.clientX, y: event.clientY };
  });
  window.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "mouse") pointer = { x: event.clientX, y: event.clientY };
  });
  document.documentElement.addEventListener("pointerleave", function () {
    pointer = null;
  });

  // כשמשנים את גודל החלון: בלי תנועה מציבים מחדש. עם תנועה, הקירות מחזירים את הכדורים פנימה
  window.addEventListener("resize", function () {
    if (reducedMotion.matches) placeBalls();
  });
  // במובייל הקיר התחתון זז בגלילה. בלי תנועה: מציבים מחדש באזור הוורוד שגלוי
  window.addEventListener("scroll", function () {
    if (reducedMotion.matches) placeBalls();
  }, { passive: true });
  reducedMotion.addEventListener("change", start);
  mobileScreen.addEventListener("change", start);

  document.fonts.ready.then(start);
}

// =========================================
// בר הבחירה (התפריט): בטעינה הוא סגור.
// לחיצה על ההמבורגר פותחת אותו, והוא מחליק פנימה מלמעלה (התנועה ב-styles.css).
// הוא נסגר בלחיצה נוספת על ההמבורגר, בלחיצה בכל מקום שהוא לא הבר, או ב-Esc.
// גלילה לא סוגרת אותו.
// לחיצה על כפתור בבר: הקו מתחת למילה מצטייר, ובסוף התנועה עוברים לעמוד.
// =========================================

const navBar = document.querySelector(".nav-bar");

if (navBar) {
  // ההמבורגר של העמוד (פותח) וההמבורגר שבתוך הבר (סוגר)
  const pageMenuButtons = document.querySelectorAll('.menu-button[aria-controls="nav-bar"]:not(.nav-bar-menu)');
  const barMenuButton = navBar.querySelector(".nav-bar-menu");
  const navLinks = navBar.querySelectorAll(".nav-bar-link");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function isNavOpen() {
    return navBar.classList.contains("is-open");
  }

  // fromKeyboard: נפתח במקלדת, אז הפוקוס עובר להמבורגר שבתוך הבר
  function setNavOpen(open, fromKeyboard) {
    // אם הפוקוס היה בתוך הבר כשהוא נסגר, מחזירים אותו להמבורגר של העמוד
    const focusWasInside = navBar.contains(document.activeElement);

    navBar.classList.toggle("is-open", open);
    pageMenuButtons.forEach(function (button) {
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });

    if (open && fromKeyboard) {
      barMenuButton.focus({ preventScroll: true });
    } else if (focusWasInside && pageMenuButtons[0]) {
      pageMenuButtons[0].focus({ preventScroll: true });
    }
  }

  pageMenuButtons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      // event.detail הוא 0 כשהלחיצה הגיעה מהמקלדת (Enter או רווח)
      setNavOpen(!isNavOpen(), event.detail === 0);
    });
  });

  barMenuButton.addEventListener("click", function () {
    setNavOpen(false);
  });

  // לחיצה בכל מקום שהוא לא הבר (וגם לא ההמבורגר, שמטפל בעצמו) סוגרת
  document.addEventListener("click", function (event) {
    if (!isNavOpen()) return;
    if (navBar.contains(event.target)) return;
    if (event.target.closest('.menu-button[aria-controls="nav-bar"]')) return;
    setNavOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isNavOpen()) {
      setNavOpen(false);
    }
  });

  // האם הקו מתחת למילה כבר מצויר עד הסוף (למשל אחרי hover, או בעמוד הנוכחי)
  function isUnderlineDrawn(link) {
    const transform = getComputedStyle(link, "::after").transform;
    return transform === "none" || new DOMMatrix(transform).a === 1;
  }

  // מחכה שהקו יסיים להצטייר, ואז מריץ את הפעולה
  function afterUnderlineDrawn(link, action) {
    if (reduceMotion.matches || isUnderlineDrawn(link)) {
      action();
      return;
    }

    let done = false;
    function finish() {
      if (done) return;
      done = true;
      link.removeEventListener("transitionend", onTransitionEnd);
      action();
    }
    function onTransitionEnd(event) {
      if (event.propertyName === "transform") finish();
    }

    link.addEventListener("transitionend", onTransitionEnd);
    // גיבוי, אם האירוע לא מגיע: משך התנועה מ-styles.css ועוד קצת
    const duration = parseFloat(getComputedStyle(link, "::after").transitionDuration) * 1000;
    setTimeout(finish, duration + 100);
  }

  navLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      // Cmd/Ctrl/Shift + לחיצה (פתיחה בלשונית חדשה): כמו קישור רגיל
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      event.preventDefault();
      link.classList.add("is-pressed");

      afterUnderlineDrawn(link, function () {
        if (link.href) {
          goToPage(link.href); // מעבר בין עמודים (page-transition.js)
        } else {
          // כפתור שעוד לא מוביל לשום מקום: הקו נאסף חזרה (אלא אם העכבר עליו)
          link.classList.remove("is-pressed");
        }
      });
    });
  });

  // חזרה לעמוד בכפתור "אחורה": הבר סגור והקווים במצב הרגיל
  window.addEventListener("pageshow", function () {
    navLinks.forEach(function (link) {
      link.classList.remove("is-pressed");
    });
    navBar.classList.remove("is-open");
    pageMenuButtons.forEach(function (button) {
      button.setAttribute("aria-expanded", "false");
    });
  });
}

// =========================================
// עמוד Leftovers*: המפה.
// הקואורדינטות בפינה משתנות לפי מיקום העכבר על המפה, כאילו זו מפה אמיתית:
// - המרכז של map-area הוא הכפר (37°07′51″S 62°48′27″W).
// - הכיוון לפי שושנת הרוחות שבתמונה: מערב למעלה, מזרח למטה, צפון ימינה, דרום שמאלה.
// - קנה המידה לפי סרגל המרחק בתמונה: 0–400 מטר = 207 פיקסלים בקובץ.
// כשהעכבר יוצא מ-map-area (או נמצא על המקרא שבתחתית), הקואורדינטות חוזרות לכפר
// בתנועה מהירה של ספירה.
// העיגולים עם האותיות: hover על עיגול במפה או על הציור שלו במקרא מקפיץ את העיגול ("פופ").
// hover על ציור במקרא מקפיץ גם את הקואורדינטות למיקום של העיגול שלו.
// בטלפון: נגיעה מציגה את הקואורדינטות / הפופ לשנייה וחצי. הנגיעה לא חוסמת גלילה.
// =========================================
const leftoversMap = document.querySelector(".leftovers-map");

if (leftoversMap) {
  const latitudeText = document.querySelector(".leftovers-latitude");
  const longitudeText = document.querySelector(".leftovers-longitude");
  const markers = leftoversMap.querySelectorAll(".map-marker");
  const sketches = leftoversMap.querySelectorAll(".map-sketch");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // הכפר (במעלות עשרוניות: דרום ומערב שליליים)
  const village = { lat: -(37 + 7 / 60 + 51 / 3600), lon: -(62 + 48 / 60 + 27 / 3600) };
  const metersPerImagePixel = 400 / 207;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLon = 111320 * Math.cos(village.lat * Math.PI / 180);
  const countDuration = 450;  // משך הספירה חזרה לכפר (מילישניות)
  const touchHoldTime = 1500; // כמה זמן נגיעה בטלפון מציגה את התוצאה

  // משתנה CSS מספרי (מיקומים וגדלים בפיקסלים של קובץ התמונה)
  function cssNumber(element, name) {
    return parseFloat(getComputedStyle(element).getPropertyValue(name));
  }

  const image = { width: cssNumber(leftoversMap, "--map-image-width"), height: cssNumber(leftoversMap, "--map-image-height") };
  const area = {
    x: cssNumber(leftoversMap, "--map-area-x"),
    y: cssNumber(leftoversMap, "--map-area-y"),
    width: cssNumber(leftoversMap, "--map-area-width"),
    height: cssNumber(leftoversMap, "--map-area-height")
  };
  const areaCenter = { x: area.x + area.width / 2, y: area.y + area.height / 2 };

  let shown = { lat: village.lat, lon: village.lon }; // מה שמוצג עכשיו
  let countFrame = null;
  let touchTimer = null;
  let activeSketch = null; // הציור במקרא שהעכבר עליו (אם יש)

  // נקודה בפיקסלים של קובץ התמונה → קו רוחב ואורך
  function imagePointToCoordinates(x, y) {
    return {
      lat: village.lat + (x - areaCenter.x) * metersPerImagePixel / metersPerDegreeLat,
      lon: village.lon + (y - areaCenter.y) * metersPerImagePixel / metersPerDegreeLon
    };
  }

  // מיקום העכבר / האצבע → פיקסלים של קובץ התמונה
  function eventToImagePoint(event) {
    const box = leftoversMap.getBoundingClientRect();
    return {
      x: (event.clientX - box.left) / box.width * image.width,
      y: (event.clientY - box.top) / box.height * image.height
    };
  }

  function insideArea(point) {
    return point.x >= area.x && point.x <= area.x + area.width &&
           point.y >= area.y && point.y <= area.y + area.height;
  }

  // מעלות עשרוניות → "37°07′51″S"
  function toDms(value, positive, negative) {
    let totalSeconds = Math.round(Math.abs(value) * 3600);
    const degrees = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = function (number) { return String(number).padStart(2, "0"); };
    return pad(degrees) + "°" + pad(minutes) + "′" + pad(seconds) + "″" + (value < 0 ? negative : positive);
  }

  function showCoordinates(coordinates) {
    shown = coordinates;
    latitudeText.textContent = toDms(coordinates.lat, "N", "S");
    longitudeText.textContent = toDms(coordinates.lon, "E", "W");
  }

  function stopCounting() {
    if (countFrame) cancelAnimationFrame(countFrame);
    countFrame = null;
  }

  // מציג מיד (בזמן שהעכבר זז, או קפיצה למיקום של עיגול)
  function setCoordinates(coordinates) {
    stopCounting();
    showCoordinates(coordinates);
  }

  // ספירה מהירה חזרה לכפר
  function countBackToVillage() {
    if (countFrame) return;
    if (reducedMotion.matches) {
      showCoordinates(village);
      return;
    }
    const from = shown;
    const start = performance.now();

    function step(now) {
      const progress = Math.min(1, (now - start) / countDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      showCoordinates({
        lat: from.lat + (village.lat - from.lat) * eased,
        lon: from.lon + (village.lon - from.lon) * eased
      });
      countFrame = progress < 1 ? requestAnimationFrame(step) : null;
    }
    countFrame = requestAnimationFrame(step);
  }

  function markerFor(letter) {
    return leftoversMap.querySelector('.map-marker[data-marker="' + letter + '"]');
  }

  function markerCoordinates(marker) {
    return imagePointToCoordinates(cssNumber(marker, "--x"), cssNumber(marker, "--y"));
  }

  function popMarker(letter, popped) {
    markerFor(letter).classList.toggle("is-popped", popped);
  }

  // ----- עכבר -----
  leftoversMap.addEventListener("pointermove", function (event) {
    if (event.pointerType !== "mouse" || activeSketch) return;
    const point = eventToImagePoint(event);
    if (insideArea(point)) {
      setCoordinates(imagePointToCoordinates(point.x, point.y));
    } else {
      countBackToVillage();
    }
  });

  leftoversMap.addEventListener("pointerleave", function (event) {
    if (event.pointerType === "mouse") countBackToVillage();
  });

  markers.forEach(function (marker) {
    marker.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "mouse") marker.classList.add("is-popped");
    });
    marker.addEventListener("pointerleave", function (event) {
      if (event.pointerType === "mouse") marker.classList.remove("is-popped");
    });
  });

  sketches.forEach(function (sketch) {
    const letter = sketch.dataset.marker;
    sketch.addEventListener("pointerenter", function (event) {
      if (event.pointerType !== "mouse") return;
      activeSketch = sketch;
      popMarker(letter, true);
      setCoordinates(markerCoordinates(markerFor(letter)));
    });
    sketch.addEventListener("pointerleave", function (event) {
      if (event.pointerType !== "mouse") return;
      activeSketch = null;
      popMarker(letter, false);
      countBackToVillage();
    });
  });

  // ----- מקלדת: Focus נראה כמו hover -----
  markers.forEach(function (marker) {
    marker.addEventListener("focus", function () {
      marker.classList.add("is-popped");
      setCoordinates(markerCoordinates(marker));
    });
    marker.addEventListener("blur", function () {
      marker.classList.remove("is-popped");
      countBackToVillage();
    });
  });

  sketches.forEach(function (sketch) {
    const letter = sketch.dataset.marker;
    sketch.addEventListener("focus", function () {
      popMarker(letter, true);
      setCoordinates(markerCoordinates(markerFor(letter)));
    });
    sketch.addEventListener("blur", function () {
      popMarker(letter, false);
      countBackToVillage();
    });
  });

  // ----- טלפון: נגיעה (click מגיע רק אחרי נגיעה, לא אחרי גלילה) -----
  leftoversMap.addEventListener("click", function (event) {
    if (lastPointerType !== "touch") return;
    // אחרי נגיעה ארוכה עם הזכוכית המגדלת זו לא נגיעה רגילה
    if (lensWasShown) return;

    clearTimeout(touchTimer);
    markers.forEach(function (marker) { marker.classList.remove("is-popped"); });

    const target = event.target.closest(".map-marker, .map-sketch");
    const point = eventToImagePoint(event);

    if (target) {
      const marker = markerFor(target.dataset.marker);
      marker.classList.add("is-popped");
      setCoordinates(target.classList.contains("map-marker") && insideArea(point)
        ? imagePointToCoordinates(point.x, point.y)
        : markerCoordinates(marker));
    } else if (insideArea(point)) {
      setCoordinates(imagePointToCoordinates(point.x, point.y));
    } else {
      return;
    }

    touchTimer = setTimeout(function () {
      markers.forEach(function (marker) { marker.classList.remove("is-popped"); });
      countBackToVillage();
    }, touchHoldTime);
  });

  // ----- הזכוכית המגדלת -----
  // פעילה כבר בטעינה. לחיצה על האייקון (או Esc) מכבה ומפעילה. כשהמצב פעיל, עיגול סביב העכבר
  // מציג את הפוסטר מוגדל, מהקובץ המקורי. הקואורדינטות ממשיכות להתעדכן (pointermove למעלה).
  // בטלפון: החלקה מהירה גוללת כרגיל. נגיעה ארוכה (lensHoldTime) מציגה את העיגול מעט מעל האצבע,
  // גרירה מזיזה אותו, ובשחרור הוא נעלם.
  const magnifierButton = document.querySelector(".magnifier-button");
  const lens = leftoversMap.querySelector(".magnifier-lens");
  const lensHoldTime = 300;     // כמה זמן מחזיקים את האצבע לפני שהעיגול מופיע
  const lensMoveTolerance = 10; // כמה פיקסלים האצבע יכולה לזוז בזמן ההחזקה (יותר מזה = גלילה)
  let magnifying = true;
  let lensHeld = false;         // בטלפון: העיגול מוצג אחרי נגיעה ארוכה
  let lensHoldTimer = null;
  let lensStart = null;         // איפה האצבע נגעה
  let lastLensEvent = null;     // המיקום האחרון של האצבע
  let lensWasShown = false;     // הנגיעה הנוכחית הציגה את העיגול (אז היא לא נחשבת לחיצה)

  function setMagnifying(on) {
    magnifying = on;
    magnifierButton.setAttribute("aria-pressed", String(on));
    leftoversMap.classList.toggle("is-magnifying", on);
    if (!on) hideLens();
  }

  function hideLens() {
    clearTimeout(lensHoldTimer);
    lensHeld = false;
    lens.classList.remove("is-visible");
  }

  // מזיז את העיגול ומציג בו את הנקודה שמתחת לעכבר / לאצבע
  function moveLens(event) {
    const box = leftoversMap.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    if (x < 0 || y < 0 || x > box.width || y > box.height) {
      lens.classList.remove("is-visible");
      return;
    }
    const zoom = cssNumber(leftoversMap, "--magnifier-zoom");
    const size = lens.offsetWidth;
    const border = lens.clientLeft;
    // בטלפון העיגול עולה מעל האצבע: חצי עיגול ועוד רבע עיגול
    const lift = event.pointerType === "mouse" ? 0 : size * 0.75;
    lens.style.setProperty("--lens-x", x + "px");
    lens.style.setProperty("--lens-y", (y - lift) + "px");
    lens.style.setProperty("--lens-bg-width", box.width * zoom + "px");
    lens.style.setProperty("--lens-bg-x", (size / 2 - border - x * zoom) + "px");
    lens.style.setProperty("--lens-bg-y", (size / 2 - border - y * zoom) + "px");
    lens.classList.add("is-visible");
  }

  magnifierButton.addEventListener("click", function () {
    setMagnifying(!magnifying);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && magnifying) setMagnifying(false);
  });

  leftoversMap.addEventListener("pointermove", function (event) {
    if (!magnifying) return;
    if (event.pointerType === "mouse") {
      moveLens(event);
      return;
    }
    lastLensEvent = event;
    if (!lensHeld) {
      // האצבע זזה לפני סוף ההחזקה: זו גלילה, אז העיגול לא יופיע
      if (lensStart && Math.hypot(event.clientX - lensStart.x, event.clientY - lensStart.y) > lensMoveTolerance) {
        clearTimeout(lensHoldTimer);
        lensStart = null;
      }
      return;
    }
    // גרירה בטלפון: העיגול והקואורדינטות זזים עם האצבע
    moveLens(event);
    const point = eventToImagePoint(event);
    if (insideArea(point)) setCoordinates(imagePointToCoordinates(point.x, point.y));
  });

  leftoversMap.addEventListener("pointerdown", function (event) {
    if (!magnifying || event.pointerType === "mouse") return;
    lensStart = { x: event.clientX, y: event.clientY };
    lastLensEvent = event;
    lensWasShown = false;
    clearTimeout(lensHoldTimer);
    lensHoldTimer = setTimeout(function () {
      lensHeld = true;
      lensWasShown = true;
      moveLens(lastLensEvent);
    }, lensHoldTime);
  });

  // אחרי נגיעה ארוכה: גרירת האצבע מזיזה את העיגול ולא גוללת את העמוד
  leftoversMap.addEventListener("touchmove", function (event) {
    if (lensHeld) event.preventDefault();
  }, { passive: false });

  // נגיעה ארוכה לא פותחת את התפריט של הדפדפן
  leftoversMap.addEventListener("contextmenu", function (event) {
    if (magnifying && lastPointerType !== "mouse") event.preventDefault();
  });

  leftoversMap.addEventListener("pointerleave", function (event) {
    if (event.pointerType === "mouse") lens.classList.remove("is-visible");
  });

  leftoversMap.addEventListener("pointerup", function (event) {
    if (event.pointerType !== "mouse") hideLens();
  });

  leftoversMap.addEventListener("pointercancel", hideLens);

  // בטעינה: הקואורדינטות של הכפר
  showCoordinates(village);
}

// =========================================
// עמוד Leftovers*: גלריית הלוקיישנים.
// כל לוקיישן הוא איור, ומעליו תמונה מוסתרת (בגודל ובמיקום שלה מהפיגמה).
// כשהעכבר על התמונה, היא נחשפת כמו סורק: מהצד (ימין או שמאל) הקרוב לנקודה
// שבה העכבר נכנס, ועד העכבר, בקו אנכי.
// כשהעכבר יוצא, התמונה נסגרת בתנועה רכה (ב-CSS) לצד הקרוב לנקודה שבה הוא יצא.
// בטלפון: גרירה לרוחב חושפת באותה צורה, ובשחרור היא נסגרת. גרירה למעלה ולמטה גוללת.
// =========================================
const locationPhotos = document.querySelectorAll(".location-photo");
const dragThreshold = 8; // כמה פיקסלים לרוחב האצבע צריכה לזוז לפני שהחשיפה מתחילה

locationPhotos.forEach(function (photo) {
  let side = "left";     // הצד שממנו התמונה נפתחת
  let hideLeft = 0;      // כמה מוסתר משמאל ומימין (באחוזים)
  let hideRight = 100;
  let touchStartX = null;
  let dragging = false;

  // מיקום העכבר / האצבע לרוחב התמונה, מ-0 (שמאל) עד 1 (ימין)
  function horizontalPosition(event) {
    const box = photo.getBoundingClientRect();
    return Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
  }

  function setHidden(left, right) {
    hideLeft = left;
    hideRight = right;
    photo.style.setProperty("--hide-left", left + "%");
    photo.style.setProperty("--hide-right", right + "%");
  }

  // חושף מהצד שנבחר ועד המיקום, בלי אנימציה
  function revealTo(event) {
    const position = horizontalPosition(event) * 100;
    photo.classList.add("is-revealing");
    if (side === "left") {
      setHidden(0, 100 - position);
    } else {
      setHidden(position, 0);
    }
  }

  // התחלה: הצד הקרוב יותר לנקודת הכניסה
  function start(event) {
    side = horizontalPosition(event) < 0.5 ? "left" : "right";
    revealTo(event);
  }

  // סגירה רכה לצד הקרוב יותר לנקודת היציאה:
  // הקצה של הצד הזה נשאר במקום, והקצה השני נאסף אליו
  function close(event) {
    photo.classList.remove("is-revealing");
    if (horizontalPosition(event) < 0.5) {
      setHidden(hideLeft, 100 - hideLeft);
    } else {
      setHidden(100 - hideRight, hideRight);
    }
  }

  // ----- עכבר -----
  photo.addEventListener("pointerenter", function (event) {
    if (event.pointerType === "mouse") start(event);
  });
  photo.addEventListener("pointermove", function (event) {
    if (event.pointerType === "mouse") revealTo(event);
  });
  photo.addEventListener("pointerleave", function (event) {
    if (event.pointerType === "mouse") close(event);
  });

  // ----- טלפון: גרירה לרוחב -----
  photo.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "mouse") return;
    touchStartX = event.clientX;
    dragging = false;
  });
  photo.addEventListener("pointermove", function (event) {
    if (event.pointerType === "mouse" || touchStartX === null) return;
    if (!dragging) {
      if (Math.abs(event.clientX - touchStartX) < dragThreshold) return;
      dragging = true;
      side = horizontalPosition({ clientX: touchStartX }) < 0.5 ? "left" : "right";
    }
    revealTo(event);
  });
  // שחרור, או שהדפדפן התחיל לגלול: נסגרת לצד הקרוב לאצבע
  function endTouch(event) {
    if (event.pointerType === "mouse") return;
    touchStartX = null;
    if (dragging) close(event);
    dragging = false;
  }
  photo.addEventListener("pointerup", endTouch);
  photo.addEventListener("pointercancel", endTouch);
});

// =========================================
// עמוד Leftovers*: Source Material, ציר הזמן של תצלומי הלוויין.
// כל שנה בציר מציגה את התצלום שלה. בטעינה אף שנה לא מוצגת (הווריאנט Default בפיגמה).
// במחשב: hover על שנה מציג את התצלום שלה, ולחיצה נועלת אותה. כשהעכבר יוצא
// משנה, חוזרים לשנה הנעולה.
// בטלפון: נגיעה בשנה מציגה ונועלת אותה, ונגיעה בשנה אחרת מחליפה.
// במקלדת: Focus עובד כמו hover, ו-Enter נועל.
// התצלום מתחלף במקום, בלי תנועה.
// כל תצלום מתחיל בגרסה קלה. בפעם הראשונה שהוא מוצג, נטען הקובץ המקורי (data-full)
// ומחליף אותה ברגע שהוא מוכן, כך שגם בחיבור איטי רואים תצלום מיד.
// =========================================
const sourceTimeline = document.querySelector(".source-timeline");

if (sourceTimeline) {
  const timelineYears = sourceTimeline.querySelectorAll(".timeline-year");
  const timelinePhotos = sourceTimeline.querySelectorAll(".timeline-photo");
  let lockedYear = null;   // השנה שנבחרה בלחיצה
  let hoveredYear = null;  // השנה שהעכבר (או הפוקוס) עליה
  let shownYear = null;    // השנה שהתצלום שלה מוצג עכשיו

  // טוען את הקובץ המקורי של התצלום ברקע, ומחליף אליו כשהוא מוכן (פעם אחת לכל תצלום)
  function loadFullPhoto(photo) {
    const image = photo.querySelector(".timeline-photo-image");
    if (!image.dataset.full) return;
    const full = new Image();
    full.src = image.dataset.full;
    delete image.dataset.full;
    full.decode().then(function () {
      image.src = full.src;
    }).catch(function () {});
  }

  // מציג את התצלום של השנה שעליה העכבר, ואם אין כזו, של השנה הנעולה
  function updateTimeline() {
    const nextYear = hoveredYear !== null ? hoveredYear : lockedYear;

    timelineYears.forEach(function (year, index) {
      year.classList.toggle("is-shown", index === nextYear);
      year.setAttribute("aria-pressed", String(index === lockedYear));
    });

    if (nextYear === shownYear) return;
    shownYear = nextYear;

    timelinePhotos.forEach(function (photo, index) {
      photo.classList.toggle("is-shown", index === shownYear);
      if (index === shownYear) {
        loadFullPhoto(photo);
      }
    });
  }

  timelineYears.forEach(function (year, index) {
    year.addEventListener("pointerenter", function (event) {
      if (event.pointerType !== "mouse") return;
      hoveredYear = index;
      updateTimeline();
    });
    year.addEventListener("pointerleave", function (event) {
      if (event.pointerType !== "mouse" || hoveredYear !== index) return;
      hoveredYear = null;
      updateTimeline();
    });

    // לחיצה, נגיעה או Enter: נועלים את השנה
    year.addEventListener("click", function () {
      lockedYear = index;
      updateTimeline();
    });

    // מקלדת: Focus כמו hover
    year.addEventListener("focus", function () {
      if (!year.matches(":focus-visible")) return;
      hoveredYear = index;
      updateTimeline();
    });
    year.addEventListener("blur", function () {
      if (hoveredYear !== index || year.matches(":hover")) return;
      hoveredYear = null;
      updateTimeline();
    });
  });
}

// =========================================
// עמודי הפרויקטים: רצועת What's Next (פרויקטים נוספים), רולר שזז כל הזמן.
//
// הרשימה של הפרויקטים ברצועה: מקום אחד לכל עמודי הפרויקט.
// כדי להוסיף פרויקט, מוסיפים אותו לרשימה:
//   image: התמונה | alt: תיאור התמונה | href: העמוד שלו (בלי href: עוד לא מוביל לשום מקום)
//   name: השם שמופיע ב-hover (\n = שורה חדשה, כמו בפיגמה)
//   width: הרוחב בפיגמה, אם הוא לא 258 | fit: "cover" או "fill"
//   crop: גודל ומיקום התמונה בתוך הריבוע, כמו בפיגמה (width, height, left, top באחוזים)
// =========================================
const nextProjectsList = [
  { image: "Images/next-projects/project-1.png", alt: "The Perfect Crime", name: "The\nPerfect\nCrime", href: "the-perfect-crime-project.html", fit: "fill" },
  { image: "Images/next-projects/project-2.png", alt: "Hora", name: "Hora", width: 259, fit: "cover" },
  { image: "Images/next-projects/project-3.png", alt: "Leftovers*", name: "Leftovers*", href: "leftovers-project.html", crop: { width: "123.11%", height: "153.68%", left: "-11.36%", top: "-12.98%" } },
  { image: "Images/next-projects/project-4.png", alt: "Shunra", name: "Shunra", crop: { width: "102.56%", height: "152.87%", left: "-1.07%", top: "-36.22%" } },
  { image: "Images/next-projects/project-5.png", alt: "Touch Grass", name: "Touch\nGrass", crop: { width: "100%", height: "178.2%", left: "-0.01%", top: "-46.37%" } },
];

// התנועה: הרצועה זזה לאט מימין לשמאל, בלופ בלי קפיצה (הרשימה חוזרת על עצמה ברצף).
// העכבר דוחף: ככל שהוא קרוב יותר לקצה השמאלי של הרצועה, היא מהירה יותר,
// וכל שינוי מהירות רך. פוקוס במקלדת על תמונה עוצר את הרצועה עד שהפוקוס יוצא.
// ב-prefers-reduced-motion הרצועה לא זזה.
const nextProjectsStrip = document.querySelector(".next-projects");

if (nextProjectsStrip) {
  const track = nextProjectsStrip.querySelector(".next-projects-track");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const secondsPerProject = 7;  // המהירות הרגילה: כמה שניות לוקח לפרויקט אחד לעבור
  const mobileSpeedUp = 2.25;   // במובייל הרצועה מהירה פי 2.25
  const mobileScreen = window.matchMedia("(max-width: 767.98px) and (orientation: portrait)");
  const maxPush = 5;            // כמה מהר יותר (פי) כשהעכבר צמוד לקצה השמאלי
  const pushArea = 0.5;         // החלק השמאלי של הרצועה שבו העכבר דוחף (חצי מהרוחב)
  const easeTime = 0.6;         // כמה רך שינוי המהירות (בשניות)

  let setWidth = 0;    // הרוחב של סבב אחד של הרשימה
  let offset = 0;      // כמה הרצועה זזה שמאלה (בתוך סבב אחד)
  let speed = 0;       // המהירות עכשיו (פיקסלים לשנייה)
  let push = 0;        // כמה העכבר דוחף (0 עד 1)
  let paused = false;  // פוקוס במקלדת על אחת התמונות
  let lastTime = null;

  // דימוי אחד: קישור עם התמונה, חתוכה כמו בפיגמה
  function createProject(project) {
    const link = document.createElement("a");
    link.className = "next-project";
    if (project.href) link.href = project.href;
    if (project.width) link.style.setProperty("--w", project.width);
    if (project.fit) link.style.setProperty("--fit", project.fit);
    if (project.crop) {
      link.style.setProperty("--crop-width", project.crop.width);
      link.style.setProperty("--crop-height", project.crop.height);
      link.style.setProperty("--crop-left", project.crop.left);
      link.style.setProperty("--crop-top", project.crop.top);
    }
    const image = document.createElement("img");
    image.src = project.image;
    image.alt = project.alt;
    image.draggable = false;
    link.appendChild(image);
    // הכיסוי עם שם הפרויקט, מופיע ב-hover ובפוקוס (CSS)
    if (project.name) {
      const overlay = document.createElement("span");
      overlay.className = "next-project-overlay text-timeline-year";
      overlay.setAttribute("aria-hidden", "true");
      overlay.textContent = project.name;
      link.appendChild(overlay);
    }
    return link;
  }

  // בונה את הרצועה: הרשימה חוזרת כמה פעמים שצריך כדי למלא את החלון, ועוד סבב זהה אחריה,
  // כך שכשסבב אחד יוצא משמאל, הסבב הבא כבר נמצא בדיוק במקומו
  function buildStrip() {
    track.textContent = "";
    let copies = 0;
    do {
      nextProjectsList.forEach(function (project) { track.appendChild(createProject(project)); });
      copies += 1;
    } while (track.scrollWidth < nextProjectsStrip.clientWidth && copies < 20);

    const firstRound = Array.from(track.children);
    setWidth = track.scrollWidth;
    firstRound.forEach(function (link) { track.appendChild(link.cloneNode(true)); });

    // בהתחלה הסבב הראשון ממורכז בחלון, כמו הפס הקבוע בפיגמה
    const usedWidth = setWidth - parseFloat(getComputedStyle(firstRound[0]).marginRight);
    offset = wrap((usedWidth - nextProjectsStrip.clientWidth) / 2);
    track.style.transform = "translateX(" + (-offset) + "px)";
  }

  // שומר את ההזזה בתוך סבב אחד (לופ)
  function wrap(value) {
    return ((value % setWidth) + setWidth) % setWidth;
  }

  function baseSpeed() {
    const firstProject = track.firstElementChild;
    const step = firstProject.offsetWidth + parseFloat(getComputedStyle(firstProject).marginRight);
    return step / secondsPerProject * (mobileScreen.matches ? mobileSpeedUp : 1);
  }

  function moveStrip(time) {
    if (lastTime === null) lastTime = time;
    const seconds = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    const targetSpeed = paused || reducedMotion.matches ? 0 : baseSpeed() * (1 + (maxPush - 1) * push * push);
    // המהירות מתקרבת בהדרגה למהירות היעד, בלי קפיצות
    speed += (targetSpeed - speed) * (1 - Math.exp(-seconds / easeTime));
    if (paused || reducedMotion.matches) speed = 0;

    offset = wrap(offset + speed * seconds);
    track.style.transform = "translateX(" + (-offset) + "px)";
    requestAnimationFrame(moveStrip);
  }

  // העכבר דוחף: 1 בקצה השמאלי, 0 מאמצע הרצועה והלאה
  nextProjectsStrip.addEventListener("pointermove", function (event) {
    if (event.pointerType !== "mouse") return;
    const box = nextProjectsStrip.getBoundingClientRect();
    const fromLeft = (event.clientX - box.left) / box.width;
    push = Math.max(0, 1 - fromLeft / pushArea);
  });
  nextProjectsStrip.addEventListener("pointerleave", function () {
    push = 0;
  });

  // מקלדת: פוקוס על תמונה עוצר את הרצועה. אם התמונה חתוכה בקצה, מזיזים אותה פנימה
  nextProjectsStrip.addEventListener("focusin", function (event) {
    paused = true;
    speed = 0;
    const box = nextProjectsStrip.getBoundingClientRect();
    const linkBox = event.target.getBoundingClientRect();
    if (linkBox.left < box.left) offset = wrap(offset - (box.left - linkBox.left));
    else if (linkBox.right > box.right) offset = wrap(offset + (linkBox.right - box.right));
    track.style.transform = "translateX(" + (-offset) + "px)";
  });
  nextProjectsStrip.addEventListener("focusout", function (event) {
    if (!nextProjectsStrip.contains(event.relatedTarget)) paused = false;
  });

  buildStrip();
  speed = reducedMotion.matches ? 0 : baseSpeed();
  requestAnimationFrame(moveStrip);

  // כשרוחב החלון משתנה, בונים מחדש כדי שתמיד יהיו מספיק תמונות למלא אותו
  let lastStripWidth = nextProjectsStrip.clientWidth;
  window.addEventListener("resize", function () {
    if (nextProjectsStrip.clientWidth === lastStripWidth) return;
    lastStripWidth = nextProjectsStrip.clientWidth;
    buildStrip();
  });
}

// =========================================
// עמודי הפרויקטים במובייל: כותרות הסעיפים בגריד (Main Scenes, Color palette וכו').
// כל אחת יושבת בתוך המשבצת שלה (לשמאל וממורכזת לגובה), ואף פעם לא חורגת ממנה.
// אם היא לא נכנסת במשבצת אחת, היא תופסת שתי משבצות שלמות ברוחב (או יותר), שמתאחדות למשבצת אחת.
// הסדר שבו מנסים: שבירת השורות של הפיגמה ב-1 ואז 2 משבצות. אם עדיין לא נכנס:
// בלי השבירות של הפיגמה (is-reflowed), ומוסיפים משבצות לרוחב עד שנכנס.
// במחשב: בלי שינוי (CSS)
// =========================================
const gridSectionTitles = document.querySelectorAll(".full-project-grid .section-title");

if (gridSectionTitles.length) {
  const mobileScreen = window.matchMedia("(max-width: 767.98px) and (orientation: portrait)");

  // האם הטקסט נכנס בתוך המלבן (בלי המסגרת והריווח הפנימי)
  function titleFits(title) {
    const style = getComputedStyle(title);
    const box = title.getBoundingClientRect();
    const innerRight = box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
    const innerHeight = title.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const range = document.createRange();
    range.selectNodeContents(title);
    const lineRects = Array.from(range.getClientRects()).filter(function (rect) { return rect.width > 0; });
    const lineTops = new Set(lineRects.map(function (rect) { return Math.round(rect.top); }));
    const textRight = Math.max.apply(null, lineRects.map(function (rect) { return rect.right; }));
    const textHeight = lineTops.size * parseFloat(style.lineHeight || style.fontSize);
    // סובלנות קטנה: בראש כל שורה יש רווח ריק מעל האותיות (בערך 15% מגודל הפונט)
    return textRight <= innerRight + 0.5 && textHeight <= innerHeight + parseFloat(style.fontSize) * 0.15;
  }

  function fitSectionTitles() {
    gridSectionTitles.forEach(function (title) {
      title.classList.remove("is-reflowed");
      title.style.removeProperty("--title-columns");
      if (!mobileScreen.matches) return;

      const style = getComputedStyle(title);
      const gridColumns = parseFloat(style.getPropertyValue("--grid-columns"));
      const startColumn = Math.floor(parseFloat(style.getPropertyValue("--column")));
      const maxColumns = Math.max(1, gridColumns - startColumn);

      const tries = [];
      for (let columns = 1; columns <= Math.min(2, maxColumns); columns++) tries.push({ reflow: false, columns: columns });
      for (let columns = 1; columns <= maxColumns; columns++) tries.push({ reflow: true, columns: columns });

      for (const attempt of tries) {
        title.classList.toggle("is-reflowed", attempt.reflow);
        title.style.setProperty("--title-columns", attempt.columns);
        if (titleFits(title)) break;
      }
    });
  }

  // הגריד מתחיל בדיוק על פיקסל שלם של המסך (מתחת לטקסט, שגובהו לא תמיד שלם),
  // כדי שקווי הגריד והמשבצות המאוחדות ייפלו בדיוק על אותם פיקסלים
  const gridPanel = document.querySelector(".full-project-panel");
  function snapGridToPixels() {
    gridPanel.style.paddingTop = "";
    if (!mobileScreen.matches) return;
    const pixel = 1 / window.devicePixelRatio;
    const top = gridPanel.getBoundingClientRect().top + window.scrollY;
    const extra = Math.ceil(top / pixel - 0.01) * pixel - top;
    if (extra > 0.001) gridPanel.style.paddingTop = extra + "px";
  }

  // The Perfect Crime במובייל: החפצים המאוירים ארוכים מהשורות שהיו להם במחשב,
  // אז כל מה שמתחתם יורד במספר השורות השלמות שחסרות (--elements-shift), והגריד מתארך באותו מספר
  const elementsBoard = document.querySelector(".elements-board");
  function shiftBelowElements() {
    if (!elementsBoard) return;
    document.documentElement.style.removeProperty("--elements-shift");
    if (!mobileScreen.matches) return;
    const cellProbe = document.createElement("div");
    cellProbe.style.width = "var(--cell)";
    elementsBoard.parentNode.appendChild(cellProbe);
    const cell = cellProbe.getBoundingClientRect().width;
    cellProbe.remove();
    const boardRows = elementsBoard.getBoundingClientRect().height / cell;
    const desktopRows = parseFloat(getComputedStyle(elementsBoard).getPropertyValue("--elements-board-rows"));
    const shift = Math.max(0, Math.ceil(boardRows - desktopRows - 0.01));
    document.documentElement.style.setProperty("--elements-shift", shift);
  }

  function layoutGrid() {
    shiftBelowElements();
    snapGridToPixels();
    fitSectionTitles();
  }

  layoutGrid();
  document.fonts.ready.then(layoutGrid);
  window.addEventListener("resize", layoutGrid);
}

// =========================================
// עמודי הפרויקטים: הבאנר הרץ (SAY HI / LET’S MAKE THINGS TOGETHER).
// Hover: הטקסט ורוד (CSS), והאותיות והכוכבים קופצים בגל סביב העכבר: מה שמתחת לעכבר
// קופץ ראשון, והקפיצה מתפשטת לשני הצדדים עם השהיה קלה בין אות לאות, ונחלשת
// ככל שהיא מתרחקת. כל עוד העכבר על הבאנר נשלח גל חדש מהמקום שלו, כך שהגל עוקב
// אחריו וממשיך לפעום כשהוא עוצר. כשהעכבר יוצא, הגלים שכבר יצאו מסתיימים והאותיות נוחתות.
// הבאנר ממשיך לרוץ כל הזמן (CSS). בטלפון: נגיעה מריצה גל אחד מהיר ואז עוברים לעמוד.
// Focus במקלדת: גל ממרכז הבאנר. ב-prefers-reduced-motion: בלי גל.
// =========================================
const contactBanners = document.querySelectorAll(".contact-banner");

contactBanners.forEach(function (banner) {
  const track = banner.querySelector(".contact-banner-track");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // התזמונים כמו בגל של LET’S PLAY בעמוד הבית
  const waveDuration = 900;     // משך קפיצה של אות אחת (מילישניות)
  const waveStagger = 60;       // ההשהיה בין אות לאות
  const fastDuration = 420;     // בנגיעה בטלפון: גל אחד מהיר
  const fastStagger = 30;
  const waveHeight = 0.45;      // כמה גבוה קופצים (חלק מגודל הטקסט)
  const waveReach = 5;          // כמה אותיות לכל צד הגל עדיין חזק (אחר כך הוא נחלש)
  const followDistance = 2;     // כמה אותיות העכבר צריך לזוז כדי שגל חדש ייצא מהמקום החדש
  const followGap = 150;        // הזמן המינימלי בין שני גלים כשהעכבר זז

  // מפצלים כל טקסט לאותיות, כדי שכל אות תקפוץ לבד
  banner.querySelectorAll(".contact-banner-text").forEach(function (text) {
    const letters = Array.from(text.textContent);
    text.textContent = "";
    letters.forEach(function (letter) {
      const span = document.createElement("span");
      span.className = "contact-banner-letter";
      span.textContent = letter;
      text.appendChild(span);
    });
  });

  // כל מה שקופץ: האותיות והכוכבים
  const items = Array.from(banner.querySelectorAll(".contact-banner-letter, .contact-banner-star"));
  let centers = [];   // מרכז כל פריט, ביחס לתחילת הפס שזז
  let letterStep = 0; // הרוחב הממוצע של אות (לחישוב ההשהיה בין אות לאות)

  function measure() {
    const trackLeft = track.getBoundingClientRect().left;
    centers = items.map(function (item) {
      const box = item.getBoundingClientRect();
      return box.left - trackLeft + box.width / 2;
    });
    const fontSize = parseFloat(getComputedStyle(banner.querySelector(".contact-banner-text")).fontSize);
    letterStep = fontSize * 0.65;
  }

  // צורת הקפיצה של אות (0 = במקום, 1 = למעלה), כמו ב-@keyframes toggle-wave:
  // קופצת, נוחתת, קפיצה קטנה, ונחה
  function bounce(progress) {
    const easeOut = function (t) { return 1 - (1 - t) * (1 - t); };
    const easeIn = function (t) { return t * t; };
    if (progress <= 0 || progress >= 0.58) return 0;
    if (progress < 0.22) return easeOut(progress / 0.22);
    if (progress < 0.42) return 1 - easeIn((progress - 0.22) / 0.2);
    if (progress < 0.5) return 0.15 * easeOut((progress - 0.42) / 0.08);
    return 0.15 * (1 - easeIn((progress - 0.5) / 0.08));
  }

  let waves = [];          // הגלים שיצאו: { x: איפה (ביחס לבאנר), start, duration, stagger }
  let source = null;       // מאיפה יוצאים הגלים עכשיו (העכבר או מרכז הבאנר), או null
  let lastWave = null;     // הגל האחרון שיצא מ-source
  let running = false;

  function sendWave(x, duration, stagger) {
    const wave = { x: x, start: performance.now(), duration: duration, stagger: stagger };
    waves.push(wave);
    return wave;
  }

  function animate() {
    const now = performance.now();
    // כל עוד יש source: גל חדש בכל סבב, או כשהעכבר זז מספיק
    if (source !== null) {
      const sinceLast = lastWave ? now - lastWave.start : Infinity;
      const moved = lastWave ? Math.abs(source - lastWave.x) / letterStep : Infinity;
      if (sinceLast >= waveDuration || (moved >= followDistance && sinceLast >= followGap)) {
        lastWave = sendWave(source, waveDuration, waveStagger);
      }
    }

    const bannerLeft = banner.getBoundingClientRect().left;
    const trackShift = track.getBoundingClientRect().left - bannerLeft;
    const fontSize = letterStep / 0.65;
    const reachPx = waveReach * letterStep;

    // גל נגמר כשהקפיצה הגיעה לאותיות הרחוקות וגם הן סיימו
    waves = waves.filter(function (wave) {
      return now - wave.start < wave.duration + (3 * reachPx / letterStep) * wave.stagger;
    });

    items.forEach(function (item, index) {
      const x = centers[index] + trackShift;
      let lift = 0;
      waves.forEach(function (wave) {
        const distance = Math.abs(x - wave.x);
        if (distance > 3 * reachPx) return;
        const delay = (distance / letterStep) * wave.stagger;
        const strength = Math.exp(-Math.pow(distance / reachPx, 2));
        lift = Math.max(lift, strength * bounce((now - wave.start - delay) / wave.duration));
      });
      item.style.translate = lift > 0.001 ? "0 " + (-lift * waveHeight * fontSize).toFixed(2) + "px" : "";
    });

    if (source !== null || waves.length > 0) {
      requestAnimationFrame(animate);
    } else {
      running = false;
    }
  }

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(animate);
  }

  function pointerX(event) {
    return event.clientX - banner.getBoundingClientRect().left;
  }

  // העכבר על הבאנר: הגל עוקב אחריו
  banner.addEventListener("pointermove", function (event) {
    if (event.pointerType !== "mouse" || reducedMotion.matches) return;
    source = pointerX(event);
    start();
  });
  banner.addEventListener("pointerleave", function (event) {
    if (event.pointerType !== "mouse") return;
    source = null;
    lastWave = null;
  });

  // מקלדת: גל ממרכז הבאנר, כל עוד יש עליו פוקוס
  banner.addEventListener("focus", function () {
    if (!banner.matches(":focus-visible") || reducedMotion.matches) return;
    source = banner.clientWidth / 2;
    lastWave = null;
    start();
  });
  banner.addEventListener("blur", function () {
    if (banner.matches(":hover")) return;
    source = null;
    lastWave = null;
  });

  // בטלפון: נגיעה מריצה גל אחד מהיר מנקודת הנגיעה, ורק אחריו עוברים לעמוד
  let touchX = null;
  banner.addEventListener("pointerdown", function (event) {
    touchX = event.pointerType === "mouse" ? null : pointerX(event);
  });
  banner.addEventListener("click", function (event) {
    if (touchX === null || reducedMotion.matches || event.detail === 0) return;
    event.preventDefault();
    sendWave(touchX, fastDuration, fastStagger);
    start();
    const href = banner.href;
    touchX = null;
    setTimeout(function () { goToPage(href); }, fastDuration + 4 * fastStagger);
  });

  measure();
  if (document.fonts) document.fonts.ready.then(measure);
  window.addEventListener("resize", measure);
});

// =========================================
// עמודי פרויקט שבהם לתיאור יש גלילה משלו (כמו Leftovers):
// כשהגלילה של העמוד מתקרבת ל-What's Next, התיאור נגלל בעצמו עד השורה האחרונה,
// יחד עם הגלילה של העמוד, כך שכשהאזור התחתון מגיע כל הטקסט כבר גלוי
// והשורה האחרונה יושבת מעל What's Next. כשגוללים חזרה למעלה, התיאור חוזר
// למקום שבו הוא היה, והגלילה שלו פועלת כרגיל.
// =========================================
const descriptionScroll = document.querySelector(".full-project-description-scroll");
const projectPageScroll = document.querySelector(".full-project-scroll");
const bottomArea = document.querySelector(".next-projects");

if (descriptionScroll && projectPageScroll && bottomArea) {
  const minimumZone = 200;  // לפחות כמה פיקסלים של גלילת העמוד התיאור נגלל לאורכם
  let savedPosition = descriptionScroll.scrollTop;  // איפה התיאור היה לפני שהתחיל לרדת בעצמו
  let following = false;    // האם התיאור עכשיו נגלל יחד עם העמוד

  // גלילה רגילה של התיאור (לא בזמן שהוא נגלל בעצמו): זוכרים איפה הוא
  descriptionScroll.addEventListener("scroll", function () {
    if (!following) savedPosition = descriptionScroll.scrollTop;
  });

  function followPageScroll() {
    const maxPosition = descriptionScroll.scrollHeight - descriptionScroll.clientHeight;
    const remaining = maxPosition - savedPosition;
    if (maxPosition <= 0 || remaining <= 0) {
      following = false;
      return;
    }

    // האזור: מרגע שהרצועה נמצאת במרחק הזה מתחתית החלון, ועד שהיא מגיעה אליה
    const zone = Math.min(Math.max(remaining, minimumZone), window.innerHeight);
    const distance = bottomArea.getBoundingClientRect().top - window.innerHeight;
    const progress = Math.min(Math.max(1 - distance / zone, 0), 1);

    if (progress > 0) {
      following = true;
      // התחלה וסוף רכים
      const eased = progress * progress * (3 - 2 * progress);
      descriptionScroll.scrollTop = savedPosition + remaining * eased;
    } else if (following) {
      following = false;
      descriptionScroll.scrollTop = savedPosition;
    }
  }

  projectPageScroll.addEventListener("scroll", followPageScroll, { passive: true });
  window.addEventListener("resize", followPageScroll);
  followPageScroll();
}

// =========================================
// אינדקס הפרויקטים (projects.html): לחיצה על עיגול ממרכזת אותו
// במצב הרגיל העיגולים בשתי שורות. לחיצה על עיגול: הוא גדל וזז למרכז,
// וכל השאר קטנים ומסתדרים סביבו במעגל (היחסים מהפיגמה). המעגל גדל כמה שאפשר
// בשטח הפנוי: בתוך השוליים של 50, בלי לעלות על הכותרת.
// לחיצה על העיגול הממורכז מובילה לעמוד שלו (אם יש לו).
// לחיצה מחוץ לעיגולים, או Esc: חוזרים לשתי השורות.
// התנועה: כמו בועות במים. כל עיגול נע לאט, עם האצה והאטה רכות, ומתנודד כשהוא מתייצב.
// בכל שינוי כל העיגולים מגיבים: גל יוצא מהעיגול שנלחץ ודוחף את כולם,
// והעיגולים הקטנים במעגל מסתובבים מקום אחד בכיוון השעון.
// העיגולים לא נוגעים זה בזה: ביניהם פועל כוח דחייה רך, כמו מגנטים הפוכים.
// ב-prefers-reduced-motion המעבר מיידי.
// =========================================

const projectsList = document.querySelector(".projects-list");

if (projectsList) {
  const items = Array.from(projectsList.querySelectorAll("li")).map(function (li) {
    const circle = li.querySelector(".project-circle");
    return {
      circle: circle,
      frame: circle.querySelector(".project-circle-frame"),
      image: circle.querySelector(".project-circle-image"),
      text: li.querySelector(".project-circle-text"),
      // המיקום בשתי השורות בפיגמה (הפינה השמאלית העליונה)
      figmaX: parseFloat(circle.style.getPropertyValue("--x")),
      figmaY: parseFloat(circle.style.getPropertyValue("--y")),
      // המצב בתנועה: מרכז, רדיוס ומהירויות (בפיקסלים של המסך, ביחס למבנה העיגולים)
      x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0,
      // מאיפה יצא ולאן הוא הולך
      fromX: 0, fromY: 0, fromR: 0,
      tx: 0, ty: 0, tr: 0,
      // הגל: לאיזה כיוון הוא נדחף, כמה, ומתי הגל מגיע אליו
      bumpX: 0, bumpY: 0, delay: 0,
      // עיגול קטן שעובר ממקום למקום במעגל: נע בקשת סביב העיגול הגדול, ולא בקו ישר דרכו
      arc: null
    };
  });
  const title = document.querySelector(".projects-title");
  const subtitle = document.querySelector(".projects-subtitle");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileScreen = window.matchMedia("(max-width: 767.98px) and (orientation: portrait)");

  // ----- המידות מהפיגמה (פיקסלים בפריים של 1440) -----
  const design = {
    // שתי השורות: הפינה של המבנה, הרוחב שלו וגודל עיגול
    listX: 596, listY: 252, listWidth: 781,
    size: 238,
    // הסידור סביב עיגול ממורכז: העיגול הגדול, העיגולים הקטנים והטקסט
    bigX: 932, bigY: 279, bigSize: 256.5,
    smallSize: 151.25,
    // העיגולים הקטנים: 88% מהפיגמה (80%, ועוד 10%)
    smallScale: 0.88,
    smallSlots: [[781, 128], [1188, 128], [781, 530], [1188, 530]],
    // הקומפוזיציה הסגורה: המרווח בין העיגול הגדול לכל עיגול קטן
    ringGap: 40,
    textTop: 553,
    // הגבולות של הסידור הממורכז
    groupX: 781, groupY: 128, groupWidth: 558.5, groupHeight: 553.25,
    margin: 50,
    gap: 33
  };

  // ----- התנועה -----
  const duration = 1.6;      // כמה זמן לוקח המעבר (שניות)
  const spring = 45;         // כמה חזק כל עיגול נמשך אחרי המסלול הרך שלו
  const damping = 5.5;       // כמה מהר ההתנודדות נרגעת (פחות = יותר מתנודד)
  const sizeSpring = 50;
  const sizeDamping = 6.5;
  const bumpSize = 34;       // כמה רחוק הגל דוחף כל עיגול (פיקסלים בפיגמה)
  const bumpGrow = 0.06;     // כמה העיגולים "נושמים" (גדלים מעט) כשהגל עובר
  const waveDelay = 0.22;    // כמה זמן לוקח לגל להגיע לעיגול הכי רחוק (שניות)
  // הדחייה בין העיגולים (פיקסלים בפיגמה)
  // (בכל זוג לא יותר מהמרווח שלהם במנוחה, כדי שבמנוחה אין כוח והם יושבים בדיוק במקום)
  const repelRange = 90;     // מאיזה מרחק בין הקצוות עיגול מתחיל להידחף מהשכן
  const minGap = 24;         // המרווח הקטן ביותר: קרוב מזה הם אף פעם לא מגיעים
  const repelStrength = 9000; // כמה חזק הכוח (גדל ככל שהם מתקרבים)
  const lookAhead = 0.25;    // כמה זמן קדימה (שניות) הדחייה צופה את ההתקרבות
  const sidePush = 1.2;      // כמה עיגולים שנעים זה מול זה מתגלגלים הצידה (ביחס לדחייה)
  const step = 1 / 120;      // צעד החישוב (שניות)

  let centered = null;       // העיגול הממורכז, או null במצב של שתי השורות
  let ring = [];             // העיגולים הקטנים במעגל, לפי הסדר בכיוון השעון (מתחילים משמאל למעלה)
  let pixel = 1;             // פיקסל בפיגמה במסך (לכוח הדחייה)
  let running = false;
  let lastTime = 0;
  let startTime = 0;
  // החזרה לשתי השורות: הדחייה כבויה עד שכולם במקום, והעיגולים נעים בגודל הקטן של המעגל
  let returning = false;
  let returnSize = 0;        // הרדיוס של עיגול קטן במעגל, שבו נעים בחזרה
  const returnGrowAt = 0.9;  // באיזה חלק מהדרך עיגול גדל חזרה לגודל שלו בשורות
  let startGaps = [];        // המרווח בין כל שני עיגולים בתחילת המעבר
  let textPosition = null;   // איפה הטקסט מתחת לעיגול הממורכז
  let textShown = false;
  let frameSize = 0;         // הגודל הקבוע של התמונה בכל עיגול (הכי גדול שהעיגול מגיע אליו)
  let line = 0;              // עובי המסגרת הצהובה
  // במובייל, כשיש עיגול ממורכז: האליפסה של העיגולים הקטנים, האזור הפנוי מתחת לעיגול
  // הממורכז (בגודל הטקסט), וגבולות המסך. במחשב: null
  let ellipse = null;
  let clearZone = null;
  let screenBounds = null;

  // פיקסל בפיגמה במסך (במחשב: --u של העמוד)
  function unit() {
    return parseFloat(getComputedStyle(projectsList).width) / design.listWidth;
  }

  // ----- היעדים של כל עיגול, לפי הסידור הנוכחי -----
  // מחזיר את המיקום של הטקסט מתחת לעיגול הממורכז (או null)
  function computeTargets() {
    const listBox = projectsList.getBoundingClientRect();
    let groupScale, groupLeft, groupTop;

    if (mobileScreen.matches) {
      // במובייל (אין עיצוב): שני טורים עם רווח של 33 ושוליים של 20 (--projects-margin),
      // והסידור הממורכז מוקטן לרוחב המסך
      const width = projectsList.clientWidth;
      const gap = design.gap * width / 508;
      const margin = parseFloat(getComputedStyle(projectsList).getPropertyValue("--projects-margin")) || gap;
      const size = (width - 2 * margin - gap) / 2;
      const rows = Math.ceil(items.length / 2);
      const rowsHeight = rows * size + (rows - 1) * gap;
      groupScale = (width - 2 * gap) / design.groupWidth;
      groupLeft = gap;
      groupTop = 0;
      projectsList.style.height = Math.max(rowsHeight, design.groupHeight * groupScale) + "px";

      if (!centered) {
        ellipse = null;
        clearZone = null;
        // שני הטורים יכולים להיות גבוהים מהמסך, אז שומרים רק על הצדדים
        screenBounds = { left: 0, right: width, top: -Infinity, bottom: Infinity };
        items.forEach(function (item, index) {
          item.tx = margin + (index % 2) * (size + gap) + size / 2;
          item.ty = Math.floor(index / 2) * (size + gap) + size / 2;
          item.tr = size / 2;
        });
        return null;
      }
      return mobileEllipse(listBox, width, gap, margin, groupScale);
    } else {
      ellipse = null;
      clearZone = null;
      screenBounds = null;
      projectsList.style.height = "";
      const u = unit();

      if (!centered) {
        // שתי השורות: ביחס לפינה של המבנה (שצמוד לשוליים הימניים והתחתונים)
        items.forEach(function (item) {
          item.tx = (item.figmaX - design.listX + design.size / 2) * u;
          item.ty = (item.figmaY - design.listY + design.size / 2) * u;
          item.tr = design.size / 2 * u;
        });
        return null;
      }

      // המעגל: הכי גדול שנכנס בתוך השוליים, צמוד לשוליים הימניים והתחתונים
      const margin = design.margin * u;
      const right = window.innerWidth - margin;
      const bottom = window.innerHeight - margin;
      groupScale = Math.min((bottom - margin) / design.groupHeight, (right - margin) / design.groupWidth);
      // אם הוא עולה על הכותרת: הגדול ביותר שנכנס מימין לה או מתחתיה
      const titleBox = title.getBoundingClientRect();
      const subtitleBox = subtitle.getBoundingClientRect();
      const titleRight = Math.max(titleBox.right, subtitleBox.right) + margin;
      const titleBottom = subtitleBox.bottom + margin;
      const overlapsTitle = right - design.groupWidth * groupScale < titleRight && bottom - design.groupHeight * groupScale < titleBottom;
      if (overlapsTitle) {
        const besideTitle = Math.min((right - titleRight) / design.groupWidth, (bottom - margin) / design.groupHeight);
        const belowTitle = Math.min((bottom - titleBottom) / design.groupHeight, (right - margin) / design.groupWidth);
        groupScale = Math.max(besideTitle, belowTitle);
      }
      groupLeft = right - design.groupWidth * groupScale - listBox.left;
      groupTop = bottom - design.groupHeight * groupScale - listBox.top;
    }

    // מפיגמה לפיקסלים במסך, ביחס למבנה העיגולים
    function toX(figmaX) { return groupLeft + (figmaX - design.groupX) * groupScale; }
    function toY(figmaY) { return groupTop + (figmaY - design.groupY) * groupScale; }

    // הסידור הממורכז: הנבחר גדול במרכז, השאר קטנים במעגל סביבו
    const bigCenterX = design.bigX + design.bigSize / 2;
    const bigCenterY = design.bigY + design.bigSize / 2;
    centered.tx = toX(bigCenterX);
    centered.ty = toY(bigCenterY);
    centered.tr = design.bigSize / 2 * groupScale;

    ringSlots(ring.length, bigCenterX, bigCenterY).forEach(function (slot, index) {
      const item = ring[index];
      item.tx = toX(slot[0]);
      item.ty = toY(slot[1]);
      item.tr = design.smallSize * design.smallScale / 2 * groupScale;
    });

    // הטקסט: מתחת לעיגול הגדול, באותו מרחק כמו בפיגמה
    return { x: toX(bigCenterX), y: toY(design.textTop) };
  }

  // ----- הסידור הממורכז במובייל: אליפסה אנכית -----
  // העיגול הממורכז והטקסט שמתחתיו באמצע, והעיגולים הקטנים על אליפסה אנכית סביבם,
  // שמתפרסת על רוב הגובה שבין הכותרת לתחתית המסך (בתוך השוליים). הכול ממורכז בחלל הזה.
  // מתחת לעיגול הממורכז, לכל הרוחב והגובה של הטקסט, יש אזור פנוי (clearZone)
  // שאף עיגול קטן לא נכנס אליו, ואף עיגול לא יוצא מהמסך (screenBounds), גם בזמן התנועה
  function mobileEllipse(listBox, width, gap, margin, groupScale) {
    const bigR = design.bigSize / 2 * groupScale;
    const smallR = design.smallSize * design.smallScale / 2 * groupScale;
    const bigCenterY = design.bigY + design.bigSize / 2;
    // הטקסט: באותו מרחק מהעיגול הגדול כמו במחשב
    const textOffset = (design.textTop - bigCenterY) * groupScale;
    const textWidth = centered.text.offsetWidth;
    const textHeight = centered.text.offsetHeight;

    // החלל: מתחת לכותרת ועד תחתית המסך, בתוך השוליים (ביחס למבנה העיגולים)
    const top = subtitle.getBoundingClientRect().bottom + gap - listBox.top;
    const bottom = window.innerHeight - margin - listBox.top;
    const left = margin;
    const right = width - margin;

    // האליפסה: ממורכזת בחלל, והעיגולים הקטנים נוגעים בשוליים שלו
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const radiusX = (right - left) / 2 - smallR;
    const radiusY = (bottom - top) / 2 - smallR;
    ellipse = { x: centerX, y: centerY, a: radiusX, b: radiusY };

    // העיגול הממורכז והטקסט יחד ממורכזים באליפסה
    const coreTop = -bigR;
    const coreBottom = textOffset + textHeight;
    const bigY = centerY - (coreTop + coreBottom) / 2;
    centered.tx = centerX;
    centered.ty = bigY;
    centered.tr = bigR;

    // ארבעה עיגולים: שניים למעלה ושניים למטה, 30 מעלות מהציר האנכי (בכיוון השעון,
    // מתחילים משמאל למעלה), כדי שהאליפסה תתפרס על רוב הגובה. מספר אחר: במרווחים שווים
    const count = ring.length;
    const tilt = Math.PI / 6;
    const fourAngles = [-Math.PI / 2 - tilt, -Math.PI / 2 + tilt, Math.PI / 2 - tilt, Math.PI / 2 + tilt];
    ring.forEach(function (item, index) {
      const angle = count === 4 ? fourAngles[index] : -3 * Math.PI / 4 + (index / count) * Math.PI * 2;
      item.tx = centerX + radiusX * Math.cos(angle);
      item.ty = centerY + radiusY * Math.sin(angle);
      item.tr = smallR;
    });

    clearZone = {
      left: centerX - textWidth / 2,
      right: centerX + textWidth / 2,
      top: bigY + textOffset,
      bottom: bigY + textOffset + textHeight,
      gap: gap / 2
    };
    screenBounds = {
      left: 0,
      right: width,
      top: -listBox.top,
      bottom: window.innerHeight - listBox.top
    };
    projectsList.style.height = Math.max(parseFloat(projectsList.style.height) || 0, bottom + margin) + "px";

    return { x: centerX, y: bigY + textOffset };
  }

  // המקומות של העיגולים הקטנים (מרכזים), בכיוון השעון, מתחילים משמאל למעלה.
  // קומפוזיציה סגורה ומהודקת: כל עיגול קטן במרחק ringGap מהעיגול הגדול,
  // בכיוון של הפינה שלו בפיגמה. ארבעה: הפינות. מספר אחר: במעגל באותו מרחק מהמרכז
  function ringSlots(count, centerX, centerY) {
    const half = design.smallSize / 2;
    const bigCenterX = design.bigX + design.bigSize / 2;
    const bigCenterY = design.bigY + design.bigSize / 2;
    const reach = design.bigSize / 2 + design.ringGap + half * design.smallScale;
    const corners = design.smallSlots.map(function (slot) {
      const dx = slot[0] + half - bigCenterX;
      const dy = slot[1] + half - bigCenterY;
      const length = Math.hypot(dx, dy);
      return [centerX + dx / length * reach, centerY + dy / length * reach];
    });
    if (count === corners.length) {
      // בפיגמה: שמאל למעלה, ימין למעלה, שמאל למטה, ימין למטה. בכיוון השעון:
      return [corners[0], corners[1], corners[3], corners[2]];
    }
    const radius = Math.hypot(corners[0][0] - centerX, corners[0][1] - centerY);
    const slots = [];
    for (let i = 0; i < count; i++) {
      const angle = -3 * Math.PI / 4 + (i / count) * Math.PI * 2;
      slots.push([centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)]);
    }
    return slots;
  }

  // המעגל בפעם הראשונה (משתי השורות): העיגולים לפי סדר הקריאה, כמו בפיגמה
  function firstRing() {
    const others = items.filter(function (item) { return item !== centered; });
    const slots = ringSlots(others.length, 0, 0);
    const readingOrder = slots.map(function (slot, index) { return index; }).sort(function (a, b) {
      return Math.round(slots[a][1] - slots[b][1]) || slots[a][0] - slots[b][0];
    });
    const result = [];
    readingOrder.forEach(function (slotIndex, k) { result[slotIndex] = others[k]; });
    return result;
  }

  // עיגול חדש ממורכז כשכבר יש מעגל: הממורכז הקודם נכנס למקום של החדש,
  // וכל העיגולים במעגל מסתובבים מקום אחד בכיוון השעון (הסדר ביניהם נשמר)
  function turnRing(previous) {
    const swapped = ring.map(function (item) { return item === centered ? previous : item; });
    return swapped.map(function (item, index) { return swapped[(index - 1 + swapped.length) % swapped.length]; });
  }

  // ----- הכנה מראש (בטעינה ובשינוי גודל החלון) -----
  // התמונה בכל עיגול מצוירת פעם אחת בגודל הכי גדול שהעיגול מגיע אליו (הממורכז),
  // ובתנועה רק מוקטנת ב-transform. כך הדפדפן לא מצייר מחדש תמונות גדולות בכל פריים,
  // וגם המעבר הראשון חלק כמו הבאים
  function prepareFrames() {
    line = parseFloat(getComputedStyle(items[0].circle).borderLeftWidth) || 0;
    // היעדים של סידור ממורכז לדוגמה, רק כדי למדוד את העיגול הגדול
    const savedCentered = centered;
    const savedRing = ring;
    centered = items[0];
    ring = firstRing();
    computeTargets();
    let largest = centered.tr * 2;
    centered = savedCentered;
    ring = savedRing;
    computeTargets();
    items.forEach(function (item) { largest = Math.max(largest, item.tr * 2); });
    frameSize = Math.ceil(largest - 2 * line);
    items.forEach(function (item) {
      item.frame.style.width = frameSize + "px";
      item.frame.style.height = frameSize + "px";
    });
  }

  // ----- ציור -----
  function draw() {
    items.forEach(function (item) {
      const size = Math.max(0, item.r * 2);
      item.circle.style.left = (item.x - item.r) + "px";
      item.circle.style.top = (item.y - item.r) + "px";
      item.circle.style.width = size + "px";
      item.circle.style.height = size + "px";
      item.frame.style.transform = "scale(" + Math.max(0, size - 2 * line) / frameSize + ")";
    });
  }

  // הטקסט של הממורכז הקודם נעלם מיד, והעיגול הממורכז מקבל את הכיסוי עם השם
  function placeText(position) {
    textPosition = position;
    textShown = false;
    items.forEach(function (item) {
      item.text.classList.remove("is-visible");
      item.circle.classList.toggle("is-centered", item === centered);
    });
  }

  // הטקסט מופיע כשהעיגול הממורכז כמעט הגיע (tick), או מיד כשאין תנועה
  function showText() {
    if (!centered || !textPosition || textShown) return;
    textShown = true;
    centered.text.style.left = textPosition.x + "px";
    centered.text.style.top = textPosition.y + "px";
    centered.text.classList.add("is-visible");
  }

  // קופץ ישר ליעד, בלי תנועה (בטעינה, בשינוי גודל החלון, ובצמצום תנועה)
  function snap() {
    items.forEach(function (item) {
      item.x = item.tx; item.y = item.ty; item.r = item.tr;
      item.vx = 0; item.vy = 0; item.vr = 0;
    });
    draw();
    showText();
  }

  // האצה והאטה רכות ומודגשות
  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ----- הפיזיקה -----
  // כל עיגול נמשך בקפיץ רך אחרי נקודה שנעה לאט מהמקום הקודם שלו ליעד (עם האצה והאטה),
  // ועוד דחיפה קטנה של הגל שעולה ויורדת. הקפיץ מוסיף את ההתנודדות העדינה בסוף
  // טווח הדחייה והמרווח הקטן ביותר של שני עיגולים: לפי ההגדרות,
  // אבל לא יותר מהמרווח שלהם במנוחה (בשתי השורות הם קרובים יותר מאשר במעגל),
  // וגם לא יותר מהמרווח שלהם בתחילת המעבר. אחרת, ביציאה משתי השורות הצפופות
  // הכוח פועל כבר מהפריים הראשון, נדלק ונכבה בכל צעד, והעיגולים רועדים
  function pairLimits(i, j) {
    const a = items[i];
    const b = items[j];
    const restGap = Math.min(startGaps[i][j], Math.hypot(b.tx - a.tx, b.ty - a.ty) - a.tr - b.tr);
    return {
      range: Math.min(repelRange * pixel, restGap * 0.9),
      smallest: Math.min(minGap * pixel, restGap * 0.6)
    };
  }

  function simulate(dt, time) {
    items.forEach(function (item) {
      const progress = Math.min(1, Math.max(0, (time - item.delay) / duration));
      const eased = easeInOut(progress);
      const wave = Math.sin(Math.PI * eased);
      let goalX = item.fromX + (item.tx - item.fromX) * eased + item.bumpX * wave;
      let goalY = item.fromY + (item.ty - item.fromY) * eased + item.bumpY * wave;
      if (item.arc) {
        const angle = item.arc.fromAngle + item.arc.turn * eased;
        const reach = item.arc.fromReach + (item.arc.toReach - item.arc.fromReach) * eased;
        goalX = item.arc.x + Math.cos(angle) * reach * item.arc.scaleX + item.bumpX * wave;
        goalY = item.arc.y + Math.sin(angle) * reach * item.arc.scaleY + item.bumpY * wave;
      }
      let goalR = (item.fromR + (item.tr - item.fromR) * eased) * (1 + bumpGrow * wave);
      // בחזרה: כל העיגולים (גם הממורכז, מיד) בגודל הקטן של המעגל,
      // ורק כשעיגול עבר 90% מהדרך הוא גדל לגודל שלו בשורות
      if (returning) {
        const grow = Math.max(0, (eased - returnGrowAt) / (1 - returnGrowAt));
        goalR = returnSize + (item.tr - returnSize) * grow;
      }
      item.vx += (spring * (goalX - item.x) - damping * item.vx) * dt;
      item.vy += (spring * (goalY - item.y) - damping * item.vy) * dt;
      item.vr += (sizeSpring * (goalR - item.r) - sizeDamping * item.vr) * dt;
    });

    // דחייה רכה, כמו מגנטים הפוכים: כשעיגול מתקרב לשכן (פחות מ-repelRange בין הקצוות)
    // שניהם נדחפים זה מזה, וככל שהם קרובים יותר הכוח חזק יותר. עיגול קטן זז יותר מגדול.
    // עיגולים שנעים זה מול זה גם מתגלגלים הצידה, במקום להיתקע ראש בראש.
    // בחזרה לשתי השורות הדחייה כבויה, כדי שלא תחסום אותם בדרך
    if (!returning) applyRepel(dt);

    items.forEach(function (item) {
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.r += item.vr * dt;
    });

    if (!returning) keepMinGap();

    // במובייל: אף עיגול קטן לא נכנס לאזור הטקסט שמתחת לעיגול הממורכז
    if (centered && clearZone) {
      items.forEach(function (item) {
        if (item === centered) return;
        keepOutOfZone(item, clearZone);
      });
    }

    // במובייל: כל העיגולים נשארים שלמים בתוך המסך
    if (screenBounds) {
      items.forEach(function (item) {
        const r = Math.max(0, item.r);
        if (item.x - r < screenBounds.left) { item.x = screenBounds.left + r; item.vx = Math.max(0, item.vx); }
        if (item.x + r > screenBounds.right) { item.x = screenBounds.right - r; item.vx = Math.min(0, item.vx); }
        if (item.y - r < screenBounds.top) { item.y = screenBounds.top + r; item.vy = Math.max(0, item.vy); }
        if (item.y + r > screenBounds.bottom) { item.y = screenBounds.bottom - r; item.vy = Math.min(0, item.vy); }
      });
    }
  }

  // הדחייה בין כל שני עיגולים (משנה את המהירויות)
  function applyRepel(dt) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const gap = distance - a.r - b.r;
        const limits = pairLimits(i, j);
        const range = limits.range;
        const smallest = limits.smallest;
        if (distance < 0.001) { dx = 1; dy = 0; distance = 1; }
        const nx = dx / distance;
        const ny = dy / distance;
        const weightA = b.r / (a.r + b.r);
        const weightB = a.r / (a.r + b.r);
        // מסתכלים קצת קדימה: עיגולים שמתקרבים מהר (או גדלים) נדחפים מוקדם יותר, כדי שיאטו ברכות
        const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny - a.vr - b.vr;
        const aheadGap = gap + Math.min(0, closing) * lookAhead;
        if (aheadGap >= range) continue;
        const closeness = Math.min(1.5, (range - aheadGap) / (range - smallest));
        const force = repelStrength * pixel * closeness * closeness * dt;
        const side = Math.sign(nx * (b.ty - a.ty) - ny * (b.tx - a.tx)) || 1;
        const fx = nx * force - ny * side * force * sidePush;
        const fy = ny * force + nx * side * force * sidePush;
        a.vx -= fx * weightA;
        a.vy -= fy * weightA;
        b.vx += fx * weightB;
        b.vy += fy * weightB;
      }
    }
  }

  // ביטחון: אף פעם לא קרובים יותר מהמרווח הקטן ביותר (וגם לא ממשיכים להתקרב)
  function keepMinGap() {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const distance = Math.hypot(b.x - a.x, b.y - a.y) || 0.001;
        const gap = distance - a.r - b.r;
        const smallest = pairLimits(i, j).smallest;
        if (gap >= smallest) continue;
        const nx = (b.x - a.x) / distance;
        const ny = (b.y - a.y) / distance;
        const weightA = b.r / (a.r + b.r);
        const weightB = a.r / (a.r + b.r);
        const fix = smallest - gap;
        a.x -= nx * fix * weightA;
        a.y -= ny * fix * weightA;
        b.x += nx * fix * weightB;
        b.y += ny * fix * weightB;
        const approaching = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (approaching < 0) {
          a.vx += nx * approaching * weightA;
          a.vy += ny * approaching * weightA;
          b.vx -= nx * approaching * weightB;
          b.vy -= ny * approaching * weightB;
        }
      }
    }
  }

  // דוחף עיגול אל מחוץ למלבן (ועוד מרווח), לצד הקרוב, ועוצר את התנועה שלו פנימה
  function keepOutOfZone(item, zone) {
    const r = Math.max(0, item.r) + zone.gap;
    const nearestX = Math.min(Math.max(item.x, zone.left), zone.right);
    const nearestY = Math.min(Math.max(item.y, zone.top), zone.bottom);
    let dx = item.x - nearestX;
    let dy = item.y - nearestY;
    let distance = Math.hypot(dx, dy);
    if (distance >= r) return;
    if (distance < 0.001) {
      // המרכז בתוך המלבן: יוצאים מהצלע הקרובה
      const exits = [
        [item.x - zone.left, -1, 0], [zone.right - item.x, 1, 0],
        [item.y - zone.top, 0, -1], [zone.bottom - item.y, 0, 1]
      ].sort(function (p, q) { return p[0] - q[0]; });
      dx = exits[0][1]; dy = exits[0][2];
      item.x += dx * (exits[0][0] + r);
      item.y += dy * (exits[0][0] + r);
    } else {
      dx /= distance; dy /= distance;
      item.x += dx * (r - distance);
      item.y += dy * (r - distance);
    }
    const inward = item.vx * dx + item.vy * dy;
    if (inward < 0) {
      item.vx -= dx * inward;
      item.vy -= dy * inward;
    }
  }

  function isSettled(time) {
    return time > duration + waveDelay && items.every(function (item) {
      return Math.abs(item.tx - item.x) < 0.2 && Math.abs(item.ty - item.y) < 0.2 && Math.abs(item.tr - item.r) < 0.2 &&
        Math.abs(item.vx) < 0.5 && Math.abs(item.vy) < 0.5 && Math.abs(item.vr) < 0.5;
    });
  }

  function tick(now) {
    let elapsed = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    while (elapsed > 0) {
      const dt = Math.min(step, elapsed);
      simulate(dt, (now - startTime) / 1000 - elapsed + dt);
      elapsed -= step;
    }
    // הטקסט: רק כשהעיגול הממורכז עבר 90% מהדרך שלו למקום (גם אם הוא עוד מתנודד מעט)
    if (centered && !textShown) {
      const path = Math.hypot(centered.tx - centered.fromX, centered.ty - centered.fromY);
      const left = Math.hypot(centered.tx - centered.x, centered.ty - centered.y);
      if (left <= path * 0.1) showText();
    }
    if (isSettled((now - startTime) / 1000)) {
      running = false;
      returning = false;
      snap();
      return;
    }
    draw();
    requestAnimationFrame(tick);
  }

  // ----- מעבר לסידור חדש -----
  // source: העיגול שממנו יוצא הגל (זה שנלחץ, או הממורכז כשחוזרים לשתי השורות)
  function arrange(newCentered, source) {
    const previous = centered;
    // חוזרים לשתי השורות: נעים בגודל של עיגול קטן במעגל, בלי דחייה
    returning = !newCentered;
    if (returning && ring.length) returnSize = ring[0].tr;
    centered = newCentered;
    if (!centered) ring = [];
    else if (!previous) ring = firstRing();
    else ring = turnRing(previous);
    placeText(computeTargets());
    if (reducedMotion.matches) {
      returning = false;
      snap();
      return;
    }

    // הגל: כל עיגול נדחף מעט הרחק מהעיגול שנלחץ (גם מי שהיעד שלו כמעט לא משתנה),
    // ומי שרחוק יותר מקבל את הגל קצת אחר כך
    const u = mobileScreen.matches ? projectsList.clientWidth / 508 : unit();
    pixel = u;
    const farthest = Math.max.apply(null, items.map(function (item) {
      return Math.hypot(item.x - source.x, item.y - source.y);
    })) || 1;
    items.forEach(function (item) {
      item.fromX = item.x; item.fromY = item.y; item.fromR = item.r;
      // במעגל שמסתובב: מי שהיה קטן ונשאר קטן נע בקשת סביב המרכז (בכיוון השעון)
      item.arc = null;
      // (במחשב סביב העיגול הממורכז. במובייל לאורך האליפסה, כדי לא לצאת מהמסך)
      if (previous && centered && item !== previous && item !== centered) {
        const arcX = ellipse ? ellipse.x : centered.tx;
        const arcY = ellipse ? ellipse.y : centered.ty;
        const scaleX = ellipse ? ellipse.a : 1;
        const scaleY = ellipse ? ellipse.b : 1;
        const fromAngle = Math.atan2((item.y - arcY) / scaleY, (item.x - arcX) / scaleX);
        const toAngle = Math.atan2((item.ty - arcY) / scaleY, (item.tx - arcX) / scaleX);
        item.arc = {
          x: arcX, y: arcY, scaleX: scaleX, scaleY: scaleY,
          fromAngle: fromAngle,
          turn: ((toAngle - fromAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI),
          fromReach: Math.hypot((item.x - arcX) / scaleX, (item.y - arcY) / scaleY),
          toReach: Math.hypot((item.tx - arcX) / scaleX, (item.ty - arcY) / scaleY)
        };
      }
      let dx = item.x - source.x;
      let dy = item.y - source.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 1) { dx = 0; dy = -1; } else { dx /= distance; dy /= distance; }
      const strength = bumpSize * u * (item === source ? 0.4 : 1 - 0.4 * distance / farthest);
      item.bumpX = dx * strength;
      item.bumpY = dy * strength;
      item.delay = waveDelay * distance / farthest;
    });
    startGaps = items.map(function (a) {
      return items.map(function (b) { return Math.hypot(b.x - a.x, b.y - a.y) - a.r - b.r; });
    });

    startTime = performance.now();
    if (!running) {
      running = true;
      lastTime = startTime;
      requestAnimationFrame(tick);
    }
  }

  // לחיצה (וגם Enter, וגם נגיעה בטלפון): עיגול שלא ממורכז מתמרכז.
  // העיגול הממורכז: הקישור עובד כרגיל (בלי עמוד: לא קורה כלום)
  function activate(item, event) {
    if (item === centered) return;
    event.preventDefault();
    arrange(item, item);
  }

  items.forEach(function (item) {
    item.circle.addEventListener("click", function (event) {
      activate(item, event);
    });
    // קישור בלי href לא מקבל click מ-Enter, אז מטפלים בו כאן
    item.circle.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !item.circle.hasAttribute("href")) activate(item, event);
    });
  });

  // לחיצה מחוץ לעיגולים, או Esc: חוזרים לשתי השורות
  document.addEventListener("click", function (event) {
    if (centered && !event.target.closest(".project-circle")) arrange(null, centered);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && centered) arrange(null, centered);
  });

  // שינוי גודל החלון: הכול במקום, בלי תנועה
  window.addEventListener("resize", function () {
    prepareFrames();
    placeText(computeTargets());
    items.forEach(function (item) { item.bumpX = 0; item.bumpY = 0; item.fromX = item.tx; item.fromY = item.ty; item.fromR = item.tr; });
    snap();
  });

  prepareFrames();
  placeText(computeTargets());
  snap();
  // מפענחים את התמונות מראש, כדי שלא יפוענחו באמצע התנועה הראשונה
  items.forEach(function (item) {
    if (item.image && item.image.decode) item.image.decode().catch(function () {});
  });
}

// =========================================
// לשונית הטקסט (The Perfect Crime, רק במובייל)
// הטקסט של הפרויקט בלשונית בצד שמאל. הידית תמיד גלויה.
// פתיחה וסגירה: נגיעה בידית, או גרירה לרוחב (הלשונית עוקבת אחרי האצבע,
// ובשחרור נפתחת או נסגרת לפי המרחק והמהירות). נגיעה מחוץ ללשונית או Esc סוגרות.
// בכניסה לעמוד: רמז אחד, הלשונית נפתחת שליש ונסגרת.
// במחשב: בלי שינוי (CSS)
// =========================================
const textTab = document.querySelector(".text-tab");

if (textTab) {
  const textTabHandle = textTab.querySelector(".text-tab-handle");
  const textTabContent = textTab.querySelector(".text-tab-content");
  const mobileScreen = window.matchMedia("(max-width: 767.98px) and (orientation: portrait)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;

  // מהירות גרירה (פיקסלים למילישנייה) שמספיקה כדי לפתוח או לסגור, גם במרחק קצר
  const flickSpeed = 0.3;
  // תזוזה מינימלית לפני שמחליטים אם זו גרירה לרוחב או גלילה לגובה
  const dragThreshold = 8;

  let isOpen = false;
  let userInteracted = false;
  let drag = null;
  // אחרי גרירה, או נגיעה מחוץ ללשונית הפתוחה: הלחיצה שבאה אחריה לא מפעילה כלום
  let swallowNextClick = false;

  // 0 = סגורה, 1 = פתוחה
  function setProgress(progress) {
    textTab.style.setProperty("--text-tab-progress", progress);
  }

  function setOpen(open) {
    isOpen = open;
    textTab.classList.remove("is-hinting");
    setProgress(open ? 1 : 0);
    textTabHandle.setAttribute("aria-expanded", open ? "true" : "false");
    root.classList.toggle("is-text-tab-open", open);
  }

  // ----- נגיעה בידית (וגם Enter במקלדת) -----
  textTabHandle.addEventListener("click", function () {
    userInteracted = true;
    setOpen(!isOpen);
  });

  document.addEventListener("keydown", function (event) {
    swallowNextClick = false;
    if (event.key === "Escape" && isOpen) setOpen(false);
  });

  // ----- גרירה: על הידית או על הלשונית הפתוחה -----
  textTab.addEventListener("pointerdown", function (event) {
    if (!mobileScreen.matches || (event.pointerType === "mouse" && event.button !== 0)) return;
    drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startProgress: isOpen ? 1 : 0,
      progress: isOpen ? 1 : 0,
      active: false,
      // הנקודות האחרונות, לחישוב המהירות בשחרור
      samples: [{ x: event.clientX, time: event.timeStamp }]
    };
  });

  // התנועה והשחרור נבדקים בכל העמוד, כי האצבע יוצאת מהידית מיד
  document.addEventListener("pointermove", function (event) {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.active) {
      // תנועה לגובה קודם: זו גלילה של הטקסט, לא גרירה
      if (Math.abs(dy) > dragThreshold && Math.abs(dy) > Math.abs(dx)) {
        drag = null;
        return;
      }
      if (Math.abs(dx) < dragThreshold) return;
      drag.active = true;
      userInteracted = true;
      textTab.classList.remove("is-hinting");
      textTab.classList.add("is-dragging");
    }

    drag.progress = Math.min(1, Math.max(0, drag.startProgress + dx / textTab.offsetWidth));
    setProgress(drag.progress);
    drag.samples.push({ x: event.clientX, time: event.timeStamp });
    if (drag.samples.length > 5) drag.samples.shift();
  });

  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const ended = drag;
    drag = null;
    if (!ended.active) return;

    // המהירות ב-5 הנקודות האחרונות: הנפה מהירה מכריעה גם במרחק קצר
    const first = ended.samples[0];
    const last = ended.samples[ended.samples.length - 1];
    const speed = last.time > first.time ? (last.x - first.x) / (last.time - first.time) : 0;
    let open = ended.progress > 0.5;
    if (speed > flickSpeed) open = true;
    if (speed < -flickSpeed) open = false;

    textTab.classList.remove("is-dragging");
    // הגרירה לא נחשבת לחיצה (על הידית או על מה שמתחת לאצבע)
    swallowNextClick = true;
    setOpen(open);
  }

  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);

  // ----- נגיעה מחוץ ללשונית: סוגרת, ולא מפעילה את מה שמתחתיה
  // (חוץ מההמבורגר ובר הבחירה, שנשארים לחיצים) -----
  document.addEventListener("pointerdown", function (event) {
    swallowNextClick = false;
    if (!isOpen || textTab.contains(event.target)) return;
    setOpen(false);
    if (!event.target.closest(".menu-button, .nav-bar")) swallowNextClick = true;
  }, true);

  document.addEventListener("click", function (event) {
    if (!swallowNextClick) return;
    swallowNextClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  // ----- כשהלשונית פתוחה העמוד שמאחוריה לא נגלל (גם בספארי בטלפון).
  // רק הטקסט שבתוך הלשונית נגלל -----
  document.addEventListener("touchmove", function (event) {
    if (isOpen && !textTabContent.contains(event.target)) event.preventDefault();
  }, { passive: false });

  // ----- מעבר למחשב (סיבוב הטלפון לרוחב): הלשונית נסגרת -----
  mobileScreen.addEventListener("change", function () {
    if (!mobileScreen.matches && isOpen) setOpen(false);
  });

  // ----- הרמז בכניסה: חצי שנייה אחרי שהעמוד גלוי (אחרי המעבר בקוביות, אם יש),
  // הלשונית נפתחת שליש ונסגרת. פעם אחת בכל כניסה, ולא ב-prefers-reduced-motion -----
  function playHint() {
    if (!mobileScreen.matches || reducedMotion.matches || userInteracted || isOpen) return;
    textTab.classList.add("is-hinting");
    setProgress(1 / 3);
    textTab.addEventListener("transitionend", function back(event) {
      if (event.target !== textTab) return;
      textTab.removeEventListener("transitionend", back);
      if (!textTab.classList.contains("is-hinting")) return;
      setProgress(0);
      textTab.addEventListener("transitionend", function done(event) {
        if (event.target !== textTab) return;
        textTab.removeEventListener("transitionend", done);
        textTab.classList.remove("is-hinting");
      });
    });
  }

  function whenPageVisible(callback) {
    const overlay = document.querySelector(".page-transition");
    if (!overlay) {
      callback();
      return;
    }
    // המעבר בקוביות עוד מכסה את העמוד: מחכים שהשכבה שלו תוסר
    const observer = new MutationObserver(function () {
      if (overlay.isConnected) return;
      observer.disconnect();
      callback();
    });
    observer.observe(overlay.parentNode, { childList: true });
  }

  function startHint() {
    whenPageVisible(function () { setTimeout(playHint, 500); });
  }

  if (document.readyState === "complete") startHint();
  else window.addEventListener("load", startHint, { once: true });
}
