// =========================================
// האתר כרגע באנגלית בלבד: אין החלפת שפות בכפתורים.
// ה-hover הוורוד של הכפתורים נעשה ב-CSS, ובטלפון נגיעה אחת מובילה ישר לעמוד.
// =========================================

// האם הלחיצה האחרונה הייתה באצבע או בעכבר (בר האינדקס משתמש בזה)
let lastPointerType = "mouse";

window.addEventListener("pointerdown", function (event) {
  lastPointerType = event.pointerType;
}, true);

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

// =========================================
// עמוד Say Hi: כדורי יצירת הקשר מסתובבים בחלון כל הזמן, לאט וברכות.
// הם נהדפים בעדינות מקצוות החלון ואחד מהשני.
// כשהעכבר מתקרב לכדור (פעם וחצי מהקוטר שלו) הכדור מאט, כדי שיהיה קל לתפוס אותו,
// וכשהעכבר מתרחק הוא חוזר בהדרגה למהירות הרגילה.
// כדור שנבחר במקלדת (Tab) עוצר. מי שביקש פחות תנועה: הכדורים עומדים במקום.
// =========================================

const contactBalls = document.querySelectorAll(".contact-ball");

if (contactBalls.length > 0) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileScreen = window.matchMedia("(max-width: 767.98px)");

  // המהירות: כמה קטרים של כדור בשנייה. במובייל לאט יותר
  const desktopSpeed = 0.4;
  const mobileSpeed = 0.22;
  // ההאטה ליד העכבר: באיזה מרחק (בקטרים, ממרכז הכדור) ועד כמה (0.12 = 12% מהמהירות)
  const slowRadius = 1.5;
  const slowSpeed = 0.12;
  // כמה מהר הכדור מאט כשהעכבר מתקרב, וכמה לאט הוא חוזר למהירות כשהעכבר מתרחק
  const slowDownRate = 6;
  const speedUpRate = 1.2;
  // הדחיפה מהקצוות ומהכדורים האחרים: מאיזה מרחק (בקטרים) ובאיזה כוח
  const edgeZone = 0.6;
  const neighborZone = 0.5;
  const pushStrength = 3;
  // כמה הכיוון "מתפתל" לאט (ברדיאנים לשנייה), כדי שהתנועה לא תהיה בקו ישר
  const wanderStrength = 0.5;

  // נקודות ההתחלה, ביחס לחלון (0 עד 1), מחוץ לטקסט. גם המקום שבו הם עומדים כשאין תנועה
  const desktopStart = [[0.15, 0.32], [0.86, 0.3], [0.83, 0.76]];
  const mobileStart = [[0.74, 0.14], [0.26, 0.84], [0.74, 0.9]];

  // העכבר (או האצבע בזמן נגיעה). null = אין עכבר בחלון
  let pointer = null;
  let lastTime = null;
  let frame = null;

  // המצב של כל כדור: מרכז, כיוון התנועה, ועד כמה הוא מואט כרגע (1 = מהירות מלאה)
  const balls = Array.from(contactBalls).map(function (element) {
    const angle = Math.random() * Math.PI * 2;
    const ball = { element: element, x: 0, y: 0, vx: Math.cos(angle), vy: Math.sin(angle), turn: 0, pace: 1, focused: false };
    element.addEventListener("focus", function () { ball.focused = true; });
    element.addEventListener("blur", function () { ball.focused = false; });
    return ball;
  });

  // הגבולות: החלון, פחות המסגרת הכתומה
  function getBounds() {
    const frame = getComputedStyle(document.body, "::after");
    return {
      left: parseFloat(frame.borderLeftWidth) || 0,
      top: parseFloat(frame.borderTopWidth) || 0,
      right: window.innerWidth - (parseFloat(frame.borderRightWidth) || 0),
      bottom: window.innerHeight - (parseFloat(frame.borderBottomWidth) || 0)
    };
  }

  function draw(ball, radius) {
    ball.element.style.transform = "translate(" + (ball.x - radius) + "px, " + (ball.y - radius) + "px)";
  }

  // מציב את הכדורים בנקודות ההתחלה
  function placeBalls() {
    const start = mobileScreen.matches ? mobileStart : desktopStart;
    const radius = contactBalls[0].offsetWidth / 2;
    balls.forEach(function (ball, i) {
      ball.x = start[i % start.length][0] * window.innerWidth;
      ball.y = start[i % start.length][1] * window.innerHeight;
      draw(ball, radius);
      ball.element.classList.add("is-ready");
    });
  }

  function step(time) {
    const dt = lastTime === null ? 0 : Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;

    const size = contactBalls[0].offsetWidth;
    const radius = size / 2;
    const bounds = getBounds();
    const speed = (mobileScreen.matches ? mobileSpeed : desktopSpeed) * size;

    balls.forEach(function (ball) {
      // 1. הכיוון מתפתל לאט
      ball.turn += (Math.random() - 0.5) * wanderStrength * dt * 4;
      ball.turn = Math.max(-wanderStrength, Math.min(wanderStrength, ball.turn));
      const turn = ball.turn * dt;
      const vx = ball.vx * Math.cos(turn) - ball.vy * Math.sin(turn);
      const vy = ball.vx * Math.sin(turn) + ball.vy * Math.cos(turn);
      ball.vx = vx;
      ball.vy = vy;

      // 2. דחיפה עדינה מהקצוות: ככל שהכדור קרוב יותר לקצה, הדחיפה חזקה יותר
      const zone = edgeZone * size;
      const gapLeft = ball.x - radius - bounds.left;
      const gapRight = bounds.right - ball.x - radius;
      const gapTop = ball.y - radius - bounds.top;
      const gapBottom = bounds.bottom - ball.y - radius;
      if (gapLeft < zone) ball.vx += pushStrength * dt * (1 - gapLeft / zone);
      if (gapRight < zone) ball.vx -= pushStrength * dt * (1 - gapRight / zone);
      if (gapTop < zone) ball.vy += pushStrength * dt * (1 - gapTop / zone);
      if (gapBottom < zone) ball.vy -= pushStrength * dt * (1 - gapBottom / zone);

      // 3. דחיפה עדינה מהכדורים האחרים
      balls.forEach(function (other) {
        if (other === ball) return;
        const dx = ball.x - other.x;
        const dy = ball.y - other.y;
        const distance = Math.hypot(dx, dy) || 1;
        const reach = size * (1 + neighborZone);
        if (distance < reach) {
          const push = pushStrength * dt * (1 - distance / reach) * 2;
          ball.vx += (dx / distance) * push;
          ball.vy += (dy / distance) * push;
        }
      });

      // 4. הכיוון תמיד באורך 1, כך שהמהירות חוזרת לאט לרגילה אחרי כל דחיפה
      const length = Math.hypot(ball.vx, ball.vy) || 1;
      ball.vx /= length;
      ball.vy /= length;

      // 5. ההאטה: ליד העכבר הכדור מאט מהר, ורחוק ממנו הוא חוזר לאט למהירות מלאה
      let targetPace = 1;
      if (ball.focused) {
        targetPace = 0;
      } else if (pointer && Math.hypot(pointer.x - ball.x, pointer.y - ball.y) < slowRadius * size) {
        targetPace = slowSpeed;
      }
      const rate = targetPace < ball.pace ? slowDownRate : speedUpRate;
      ball.pace += (targetPace - ball.pace) * (1 - Math.exp(-rate * dt));

      // 6. התזוזה
      ball.x += ball.vx * speed * ball.pace * dt;
      ball.y += ball.vy * speed * ball.pace * dt;
    });

    // 7. אף כדור לא יוצא מהחלון ולא נכנס לתוך כדור אחר
    balls.forEach(function (ball, i) {
      balls.slice(i + 1).forEach(function (other) {
        const dx = other.x - ball.x;
        const dy = other.y - ball.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance < size) {
          const overlap = (size - distance) / 2;
          ball.x -= (dx / distance) * overlap;
          ball.y -= (dy / distance) * overlap;
          other.x += (dx / distance) * overlap;
          other.y += (dy / distance) * overlap;
        }
      });
    });
    balls.forEach(function (ball) {
      ball.x = Math.max(bounds.left + radius, Math.min(bounds.right - radius, ball.x));
      ball.y = Math.max(bounds.top + radius, Math.min(bounds.bottom - radius, ball.y));
      draw(ball, radius);
    });

    frame = requestAnimationFrame(step);
  }

  function start() {
    cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
    placeBalls();
    if (!reducedMotion.matches) frame = requestAnimationFrame(step);
  }

  // העכבר: איפה הוא בחלון. באצבע: רק בזמן שנוגעים במסך
  window.addEventListener("pointermove", function (event) {
    if (event.pointerType === "touch" && event.buttons === 0) return;
    pointer = { x: event.clientX, y: event.clientY };
  });
  window.addEventListener("pointerdown", function (event) {
    pointer = { x: event.clientX, y: event.clientY };
  });
  window.addEventListener("pointerup", function (event) {
    if (event.pointerType === "touch") pointer = null;
  });
  document.documentElement.addEventListener("pointerleave", function () {
    pointer = null;
  });

  // כשמשנים את גודל החלון: בלי תנועה מציבים מחדש, ועם תנועה הכדורים נשארים בתוך החלון (שלב 7)
  window.addEventListener("resize", function () {
    if (reducedMotion.matches) placeBalls();
  });
  reducedMotion.addEventListener("change", start);
  mobileScreen.addEventListener("change", start);

  document.fonts.ready.then(start);
}
