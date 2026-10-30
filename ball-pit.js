// =========================================
// בריכת כדורים בעמוד הבית
// מבט מלמעלה: אין כוח משיכה, הכדורים נעצרים בגלל חיכוך.
// העכבר או האצבע הם "יד" שדוחפת את הכדורים הצידה ופותחת תעלה.
// הכדורים מצוירים על קנבס אחד (.ball-pit) שמכסה את כל החלון.
//
// איך הפיזיקה עובדת (בכל פריים, בכמה צעדים קטנים):
// 1. כל כדור זז לפי המהירות שלו, והחיכוך מאט אותו.
// 2. מתקנים מיקומים: היד דוחפת כדורים החוצה, כדורים שנכנסו זה בזה
//    נדחפים זה מזה, וכדורים שיצאו מהמסך חוזרים פנימה.
// 3. המהירות החדשה של כל כדור = כמה הוא זז בפועל בצעד הזה.
//    כך דחיפה של כדור אחד עוברת לשכנים שלו, בתגובת שרשרת.
// =========================================

// כל הכדורים. כל כדור: מיקום (x, y), מהירות (vx, vy), צבע, ויעד (target) כשהוא מתגלגל למקום מסוים
let balls = [];
let ballRadius = 0;

// האם יש כדור בנקודה הזאת במסך. script.js משתמש בזה כדי לדעת אם התמונה חשופה
function isUnderBall(x, y) {
  for (const ball of balls) {
    const dx = x - ball.x;
    const dy = y - ball.y;
    if (dx * dx + dy * dy < ballRadius * ballRadius) return true;
  }
  return false;
}

const ballCanvas = document.querySelector(".ball-pit");

if (ballCanvas) {
  // ----- הגדרות -----
  const coverage = 0.78;          // איזה חלק מהמסך הכדורים מכסים כשהם מפוזרים
  const handWidth = 1.5;          // רוחב התעלה שהיד פותחת (במשבצות)
  const handGrowTime = 0.12;      // היד "נכנסת" לבריכה בהדרגה (שניות), כדי שהכדורים לא יעופו בבת אחת
  const mouseStrength = 1;        // כמה מהר כדור שנדחף בעכבר עף ביחס ליד
  const touchStrength = 1.5;       // באצבע הדחיפה חזקה יותר, כדי שלא ירגיש כבד
  const pileUp = 0.18;            // כדורים יכולים לטפס זה על זה עד החלק הזה מהקוטר (כמו בבריכה אמיתית), וכך יש מקום לתעלה
  const bumpEnergy = 0.4;         // איזה חלק מהדחיפה בהתנגשות הופך לתנועה (1 = הכול)
  const friction = 2.2;           // התנגדות שמאטה את הכדורים (גדול = עוצרים מהר יותר)
  const rollingStop = 1.2;        // חיכוך קבוע שעוצר אותם לגמרי (משבצות לשנייה בשנייה)
  const maxSpeed = 20;            // מהירות מקסימלית (משבצות לשנייה)
  const wallBounce = 0.3;         // כדור שפוגע בקצה המסך נהדף בעדינות
  const substeps = 3;             // כמה צעדים קטנים בכל פריים (יותר = יציב יותר)
  const rollSpring = 14;          // כמה חזק כדור נמשך ליעד שלו (במעבר בין PEEK ל-PLAY)
  const maxRollSpeed = 12;        // מהירות מקסימלית בזמן המעבר (משבצות לשנייה)
  const slideThrough = 0.15;      // כמה חזק מתנגשים שני כדורים שמתגלגלים ליעד (1 = רגיל)
  const passThroughAfter = 1;     // אחרי כמה שניות כדור שעוד לא יצא מהמסך עובר דרך הכדורים האחרים
  const handJump = 4;             // קפיצה של העכבר ביותר מזה (במשבצות) בבת אחת = נכנס מחדש, לא דוחף לאורך הדרך
  const frameShare = 0.7;        // במצב PEEK: לכל היותר החלק הזה מהכדורים נשאר במסגרת, והשאר יוצאים מהמסך
  const keepOutMargin = 0.25;    // מרווח (במשבצות) בין המסגרת לכפתורים, לטקסטים ולתמונה
  const loadHeadStart = 3.1;      // בטעינה: כמה שניות מתנועת ה-PLAY רצות מאחורי הקלעים לפני שרואים משהו
  const restSpeed = 0.05;         // מתחת למהירות הזאת (משבצות לשנייה) כדור נחשב עומד

  const context = ballCanvas.getContext("2d");
  const page = document.documentElement;
  const toggleButton = document.querySelector(".balls-toggle");
  const sizeProbe = document.querySelector(".ball-size-probe");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let width = 0;           // גודל המסך (פיקסלים)
  let height = 0;
  let cell = 0;            // גודל משבצת (פיקסלים)
  let colors = [];         // 4 הצבעים מ-styles.css
  let ballsAtEdges = false; // true = הכדורים בשוליים (הכפתור כתוב PLAY)
  let transitionTime = 0;   // כמה זמן עבר מאז הלחיצה האחרונה על הכפתור
  const hands = new Map();  // כל יד (עכבר או אצבע) שנמצאת עכשיו בבריכה
  let focusedRect = null;   // כפתור שנבחר במקלדת: הכדורים זזים ממנו כדי שיראו אותו
  let running = false;      // האם האנימציה רצה עכשיו
  let lastFrameTime = 0;

  // ----- רשת עזר למציאת כדורים קרובים -----
  // במקום לבדוק כל כדור מול כל כדור, מחלקים את המסך לתאים בגודל כדור,
  // ובודקים רק כדורים בתאים הסמוכים
  let gridSize = 1;
  let gridMargin = 0;
  let gridColumns = 1;
  let gridRows = 1;
  let gridFirst = new Int32Array(1); // הכדור הראשון בכל תא (-1 = ריק)
  let gridNext = new Int32Array(1);  // הכדור הבא באותו תא

  // =========================================
  // מדידה: גודל המסך, גודל הכדור והצבעים (מ-styles.css)
  // =========================================
  function measure() {
    const styles = getComputedStyle(page);
    width = ballCanvas.clientWidth;
    height = ballCanvas.clientHeight;
    ballRadius = sizeProbe.getBoundingClientRect().width / 2;
    cell = (2 * ballRadius) / parseFloat(styles.getPropertyValue("--ball-size"));
    colors = [1, 2, 3, 4].map(function (number) {
      return styles.getPropertyValue("--ball-color-" + number).trim();
    });

    // הקנבס מצויר ברזולוציה של המסך (עד פי 2), כדי שהעיגולים יהיו חדים
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    ballCanvas.width = Math.round(width * pixelRatio);
    ballCanvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  // =========================================
  // מקומות לכדורים
  // =========================================

  // שורות של נקודות במרחקים שווים (כמו חלת דבש), בתוך מלבן.
  // jitter מזיז כל נקודה קצת באקראי, כדי שזה לא ייראה כמו רשת
  function honeycomb(left, top, right, bottom, spacing, jitter) {
    const points = [];
    const rowHeight = spacing * Math.sqrt(3) / 2;
    const rowCount = Math.floor((bottom - top) / rowHeight) + 1;
    const startY = top + (bottom - top - (rowCount - 1) * rowHeight) / 2;
    for (let row = 0; row < rowCount; row++) {
      const shift = row % 2 === 0 ? 0 : spacing / 2;
      const columnCount = Math.floor((right - left - shift) / spacing) + 1;
      const startX = left + shift + (right - left - shift - (columnCount - 1) * spacing) / 2;
      for (let column = 0; column < columnCount; column++) {
        points.push({
          x: startX + column * spacing + (Math.random() - 0.5) * 2 * jitter,
          y: startY + row * rowHeight + (Math.random() - 0.5) * 2 * jitter,
        });
      }
    }
    return points;
  }

  // מקומות שמפזרים את הכדורים על כל המסך (מצב PEEK)
  function coverSpots() {
    // כמה כדורים צריך כדי לכסות את החלק שרצינו מהמסך
    const wanted = (coverage * width * height) / (Math.PI * ballRadius * ballRadius);
    // מתחילים ממרחק גדול בין הכדורים, ומקרבים אותם עד שיש מספיק מקומות
    let spacing = ballRadius * 2.6;
    let spots = [];
    do {
      spacing *= 0.99;
      const jitter = (spacing - 2 * ballRadius) / 2;
      spots = honeycomb(ballRadius, ballRadius, width - ballRadius, height - ballRadius, spacing, jitter);
    } while (spots.length < wanted && spacing > ballRadius * 2.04);
    return spots;
  }

  // האזורים שהמסגרת לא מכסה: הכפתורים, הטקסטים, התמונה והכפתור PEEK / PLAY.
  // כל מלבן מוגדל ברדיוס של כדור, כך שמספיק לבדוק את מרכז הכדור
  function keepOutAreas() {
    const elements = document.querySelectorAll(".nav-button, .name-box, .year-box, .photo, .balls-toggle");
    const rects = Array.from(elements, function (element) {
      return element.getBoundingClientRect();
    });
    // הכותרת portfolio: מודדים את הטקסט עצמו, ולא את כל השורה
    const title = document.querySelector(".title");
    if (title) {
      const range = document.createRange();
      range.selectNodeContents(title);
      rects.push(range.getBoundingClientRect());
    }
    const grow = ballRadius + keepOutMargin * cell;
    return rects.map(function (rect) {
      return { left: rect.left - grow, top: rect.top - grow, right: rect.right + grow, bottom: rect.bottom + grow };
    });
  }

  function insideArea(point, area) {
    return point.x > area.left && point.x < area.right && point.y > area.top && point.y < area.bottom;
  }

  // מקומות לכדורים במצב PLAY: מסגרת אורגנית בשוליים, ומקומות מחוץ למסך לכל השאר
  function edgeSpots(ballCount) {
    // רווח קטן בין הכדורים במסגרת, כדי שכל כדור ייכנס בקלות למקום שלו
    const spacing = ballRadius * 2.35;
    // כמה רחוק מחוץ למסך צריך מקום, כדי שכל הכדורים ייכנסו שם אם צריך
    const outside = (ballCount * spacing * spacing * 0.87) / (2 * (width + height)) + 2 * spacing;
    const points = honeycomb(-outside, -outside, width + outside, height + outside, spacing, 0);
    const keepOut = keepOutAreas();

    // עובי המסגרת משתנה סביב המסך: גלים בזוויות אקראיות (בין חצי משבצת ל-2.4 משבצות)
    const phases = [0, 1, 2].map(function () { return Math.random() * Math.PI * 2; });
    function frameThickness(point) {
      const angle = Math.atan2(point.y - height / 2, point.x - width / 2);
      const wave = 0.5 * Math.sin(2 * angle + phases[0]) + 0.3 * Math.sin(3 * angle + phases[1]) + 0.2 * Math.sin(7 * angle + phases[2]);
      return cell * (1.45 + 0.95 * wave);
    }

    const frame = [];
    const offScreen = [];
    points.forEach(function (point) {
      const hidden = point.x < -ballRadius || point.x > width + ballRadius || point.y < -ballRadius || point.y > height + ballRadius;
      if (hidden) {
        point.hidden = true;
        offScreen.push(point);
        return;
      }
      // המרחק מהקצה הקרוב של המסך, ביחס לעובי המסגרת במקום הזה
      point.depth = Math.min(point.x, point.y, width - point.x, height - point.y) / frameThickness(point);
      const blocked = keepOut.some(function (area) { return insideArea(point, area); });
      if (point.depth <= 1 && !blocked) frame.push(point);
    });

    // הקרובים לקצה קודם. אם יש יותר מקומות מדי, השאר יוצאים מהמסך
    frame.sort(function (a, b) { return a.depth - b.depth; });
    frame.length = Math.min(frame.length, Math.round(ballCount * frameShare));
    return { frame: frame, offScreen: offScreen };
  }

  // מחלק מקומות לכדורים: כל מקום (לפי הסדר) מקבל את הכדור הפנוי הקרוב אליו.
  // כך כל כדור מתגלגל למקום קרוב, והתנועה נראית טבעית
  function giveSpotsToNearestBalls(spots, freeBalls) {
    spots.forEach(function (spot) {
      if (freeBalls.length === 0) return;
      let nearest = 0;
      let nearestDistance = Infinity;
      freeBalls.forEach(function (ball, index) {
        const distance = (ball.x - spot.x) ** 2 + (ball.y - spot.y) ** 2;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = index;
        }
      });
      freeBalls[nearest].target = spot;
      freeBalls.splice(nearest, 1);
      spot.taken = true;
    });
  }

  // נותן צבע לכל מקום שעוד אין לו צבע (color = -1), כך שלמקומות סמוכים יהיו
  // כמה שפחות צבעים זהים (בלי מקבצים). מכל צבע יוצא בערך אותו מספר מקומות
  function colorSpots(spots) {
    const neighborDistance = ballRadius * 3; // מקומות קרובים יותר מזה נחשבים שכנים
    // כמה מקומות עוד צריכים לקבל כל צבע, כדי שכל הצבעים יהיו בכמות שווה
    const left = colors.map(function (color, colorIndex) {
      const share = Math.floor(spots.length / colors.length) + (colorIndex < spots.length % colors.length ? 1 : 0);
      const alreadyColored = spots.filter(function (spot) { return spot.color === colorIndex; }).length;
      return share - alreadyColored;
    });
    spots.forEach(function (spot) {
      if (spot.color >= 0) return;
      // הצבעים שכבר יש לשכנים
      const nearby = new Set();
      spots.forEach(function (other) {
        if (other !== spot && other.color >= 0 && Math.hypot(other.x - spot.x, other.y - spot.y) < neighborDistance) nearby.add(other.color);
      });
      let options = colors.map(function (color, colorIndex) { return colorIndex; }).filter(function (colorIndex) {
        return !nearby.has(colorIndex);
      });
      if (options.length === 0) options = colors.map(function (color, colorIndex) { return colorIndex; });
      // מבין הצבעים האפשריים: זה שנשארו ממנו הכי הרבה כדורים (בשוויון: אקראי)
      options.sort(function (a, b) { return left[b] - left[a] || Math.random() - 0.5; });
      spot.color = options[0];
      left[spot.color]--;
    });
  }

  // =========================================
  // יצירת הכדורים
  // =========================================
  function createBalls() {
    const spots = coverSpots();
    // 4 הצבעים בכמויות שוות, בסדר אקראי
    const colorOrder = spots.map(function (spot, index) { return index % colors.length; });
    colorOrder.sort(function () { return Math.random() - 0.5; });
    balls = spots.map(function (spot, index) {
      return { x: spot.x, y: spot.y, vx: 0, vy: 0, startX: 0, startY: 0, color: colorOrder[index], target: null, insideScreen: true, pushedBy: null, passThrough: false, onTheWay: false };
    });
    prepareGrid();
  }

  // שם כל כדור מיד במקום שלו (בלי אנימציה): בטעינה, בשינוי גודל חלון ולמי שביקש צמצום תנועה
  function placeBallsNow() {
    balls.forEach(function (ball) {
      if (ball.target) {
        ball.x = ball.target.x;
        ball.y = ball.target.y;
      }
      ball.vx = 0;
      ball.vy = 0;
      ball.insideScreen = isFullyInsideScreen(ball);
      // במצב PEEK הכדורים חופשיים. במצב PLAY הם נשארים קשורים למקום שלהם במסגרת
      if (!ballsAtEdges) ball.target = null;
    });
  }

  // =========================================
  // PEEK / PLAY
  // =========================================

  // הכדורים מתגלגלים לשוליים, וחלקם יוצאים מהמסך
  function sendBallsToEdges() {
    const spots = edgeSpots(balls.length);
    balls.forEach(function (ball) { ball.target = null; });
    // הכדורים הקרובים לקצה תופסים את המסגרת, והשאר יוצאים מהמסך
    giveSpotsToNearestBalls(spots.frame, balls.slice());
    const leftOver = balls.filter(function (ball) { return !ball.target; });
    // מחוץ למסך: המקומות הקרובים למסך קודם
    spots.offScreen.sort(function (a, b) { return distanceOutside(a) - distanceOutside(b); });
    giveSpotsToNearestBalls(spots.offScreen.slice(0, leftOver.length * 2), leftOver);
    balls.forEach(function (ball) {
      if (ball.target) ball.target.isOutside = !isFullyInsideScreen(ball.target);
    });
  }

  // הכדורים (כולל אלה שמחוץ למסך) מתגלגלים בחזרה ומתפזרים על כל המסך
  function spreadBallsOverScreen() {
    balls.forEach(function (ball) { ball.target = null; });
    const spots = coverSpots();
    giveSpotsToNearestBalls(spots, balls.slice());
    // ערבוב צבעים: כדור שרואים שומר על הצבע שלו, וכדור שמחוץ למסך מקבל צבע
    // שמשלים את השכנים במקום שאליו הוא מתגלגל (הוא לא נראה, אז לא רואים שהצבע השתנה)
    spots.forEach(function (spot) { spot.color = -1; });
    balls.forEach(function (ball) {
      if (ball.target && !isOutOfSight(ball)) ball.target.color = ball.color;
    });
    colorSpots(spots);
    balls.forEach(function (ball) {
      if (ball.target && isOutOfSight(ball)) ball.color = ball.target.color;
    });
    // ליתר ביטחון: כדור שלא קיבל מקום מתגלגל למקום אקראי במסך
    balls.forEach(function (ball) {
      if (!ball.target) {
        ball.target = { x: ballRadius + Math.random() * (width - 2 * ballRadius), y: ballRadius + Math.random() * (height - 2 * ballRadius) };
      }
    });
  }

  function distanceOutside(point) {
    return Math.max(-point.x, -point.y, point.x - width, point.y - height);
  }

  function isFullyInsideScreen(point) {
    return point.x >= ballRadius && point.x <= width - ballRadius && point.y >= ballRadius && point.y <= height - ballRadius;
  }

  function updateToggleText() {
    toggleButton.textContent = ballsAtEdges ? "PLAY" : "PEEK";
  }

  toggleButton.addEventListener("click", function () {
    ballsAtEdges = !ballsAtEdges;
    if (ballsAtEdges) {
      sendBallsToEdges();
    } else {
      spreadBallsOverScreen();
    }
    updateToggleText();
    transitionTime = 0;
    // צמצום תנועה: בלי אנימציה, הכדורים פשוט מופיעים במקום החדש
    if (reducedMotion.matches) placeBallsNow();
    wakeUp();
  });

  // =========================================
  // הפיזיקה
  // =========================================

  function prepareGrid() {
    gridSize = 2 * ballRadius;
    gridMargin = width + height; // מקום גם לכדורים שמחוץ למסך
    gridColumns = Math.ceil((width + 2 * gridMargin) / gridSize);
    gridRows = Math.ceil((height + 2 * gridMargin) / gridSize);
    gridFirst = new Int32Array(gridColumns * gridRows);
    gridNext = new Int32Array(balls.length);
  }

  function gridColumnOf(x) {
    return Math.max(0, Math.min(gridColumns - 1, Math.floor((x + gridMargin) / gridSize)));
  }

  function gridRowOf(y) {
    return Math.max(0, Math.min(gridRows - 1, Math.floor((y + gridMargin) / gridSize)));
  }

  // כדורים שנכנסו זה בזה נדחפים זה מזה (כל אחד חצי מהדרך).
  // stiffness: איזה חלק מהחפיפה מתקנים בכל פעם (1 = הכול)
  // allowedOverlap: כמה כדורים יכולים "לטפס" זה על זה לפני שהם נדחפים (חלק מהקוטר)
  function separateBalls(stiffness, allowedOverlap) {
    gridFirst.fill(-1);
    balls.forEach(function (ball, index) {
      const key = gridRowOf(ball.y) * gridColumns + gridColumnOf(ball.x);
      gridNext[index] = gridFirst[key];
      gridFirst[key] = index;
    });

    const minDistance = 2 * ballRadius * (1 - allowedOverlap);
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      const column = gridColumnOf(ball.x);
      const row = gridRowOf(ball.y);
      for (let r = Math.max(0, row - 1); r <= Math.min(gridRows - 1, row + 1); r++) {
        for (let c = Math.max(0, column - 1); c <= Math.min(gridColumns - 1, column + 1); c++) {
          for (let j = gridFirst[r * gridColumns + c]; j !== -1; j = gridNext[j]) {
            if (j <= i) continue; // כל זוג נבדק פעם אחת
            const other = balls[j];
            if (ball.passThrough || other.passThrough) continue;
            let dx = other.x - ball.x;
            let dy = other.y - ball.y;
            const distanceSquared = dx * dx + dy * dy;
            if (distanceSquared >= minDistance * minDistance) continue;
            let distance = Math.sqrt(distanceSquared);
            if (distance < 0.0001) {
              // שני כדורים בדיוק באותו מקום: דוחפים לכיוון אקראי
              dx = Math.random() - 0.5;
              dy = Math.random() - 0.5;
              distance = Math.hypot(dx, dy);
            }
            // שני כדורים שבדרך ליעד מתנגשים ברכות ומחליקים זה ליד זה, כדי שלא ייתקעו בפקק
            const pairStiffness = ball.onTheWay && other.onTheWay ? stiffness * slideThrough : stiffness;
            const push = ((minDistance - distance) / 2) * pairStiffness;
            const pushX = (dx / distance) * push;
            const pushY = (dy / distance) * push;
            ball.x -= pushX;
            ball.y -= pushY;
            other.x += pushX;
            other.y += pushY;
          }
        }
      }
    }
  }

  // כדור שבתוך המסך לא יוצא ממנו: הוא נהדף בעדינות מהקצה.
  // כדור שמתגלגל אל מחוץ למסך (במצב PLAY) או חוזר מבחוץ, לא נעצר בקצה
  function keepInsideScreen() {
    balls.forEach(function (ball) {
      if (ball.target && ball.target.isOutside) {
        ball.insideScreen = false;
        return;
      }
      if (!ball.insideScreen) {
        ball.insideScreen = isFullyInsideScreen(ball);
        return;
      }
      const left = ballRadius;
      const right = width - ballRadius;
      const top = ballRadius;
      const bottom = height - ballRadius;
      if (ball.x < left) ball.x = left + (left - ball.x) * wallBounce;
      if (ball.x > right) ball.x = right - (ball.x - right) * wallBounce;
      if (ball.y < top) ball.y = top + (top - ball.y) * wallBounce;
      if (ball.y > bottom) ball.y = bottom - (ball.y - bottom) * wallBounce;
    });
  }

  // היד דוחפת החוצה כל כדור שקרוב מדי לקו שהיא עברה בצעד הזה
  function pushByHand(hand, fromX, fromY, toX, toY, seconds) {
    const reach = (handWidth / 2) * cell * hand.grow + ballRadius;
    const moveX = toX - fromX;
    const moveY = toY - fromY;
    const moveLengthSquared = moveX * moveX + moveY * moveY;
    const handSpeedX = moveX / seconds;
    const handSpeedY = moveY / seconds;

    balls.forEach(function (ball) {
      // הנקודה הקרובה ביותר לכדור על הקו שהיד עברה
      let along = moveLengthSquared > 0 ? ((ball.x - fromX) * moveX + (ball.y - fromY) * moveY) / moveLengthSquared : 1;
      along = Math.max(0, Math.min(1, along));
      const closestX = fromX + moveX * along;
      const closestY = fromY + moveY * along;
      let dx = ball.x - closestX;
      let dy = ball.y - closestY;
      let distance = Math.hypot(dx, dy);
      if (distance >= reach) return;
      if (distance < 0.0001) {
        // הכדור בדיוק מתחת ליד: דוחפים אותו הצידה מכיוון התנועה
        dx = -moveY || 1;
        dy = moveX;
        distance = Math.hypot(dx, dy);
      }
      const awayX = dx / distance;
      const awayY = dy / distance;
      ball.x = closestX + awayX * reach;
      ball.y = closestY + awayY * reach;
      // נזכרים כמה מהר היד דחפה את הכדור החוצה, כדי לתת לו תנופה (בסוף הצעד)
      const handPush = Math.max(0, handSpeedX * awayX + handSpeedY * awayY);
      ball.pushedBy = { x: awayX * handPush * (hand.strength - 1), y: awayY * handPush * (hand.strength - 1) };
    });
  }

  // כל יד דוחפת לאורך החלק שלה מהדרך בצעד הקטן מספר sub
  function pushByAllHands(sub, seconds) {
    hands.forEach(function (hand) {
      const fromX = hand.fromX + (hand.x - hand.fromX) * ((sub - 1) / substeps);
      const fromY = hand.fromY + (hand.y - hand.fromY) * ((sub - 1) / substeps);
      const toX = hand.fromX + (hand.x - hand.fromX) * (sub / substeps);
      const toY = hand.fromY + (hand.y - hand.fromY) * (sub / substeps);
      pushByHand(hand, fromX, fromY, toX, toY, seconds);
    });
  }

  // כפתור שנבחר במקלדת: הכדורים מתגלגלים ממנו הצידה, כדי שיראו אותו
  function clearFocusedButton() {
    if (!focusedRect) return;
    const area = {
      left: focusedRect.left - ballRadius,
      top: focusedRect.top - ballRadius,
      right: focusedRect.right + ballRadius,
      bottom: focusedRect.bottom + ballRadius,
    };
    const maxStep = cell * 0.1;
    balls.forEach(function (ball) {
      if (!insideArea(ball, area)) return;
      // יוצאים מהצד הקרוב, לאט (כדי שזה ייראה כמו גלגול)
      const toLeft = ball.x - area.left;
      const toRight = area.right - ball.x;
      const toTop = ball.y - area.top;
      const toBottom = area.bottom - ball.y;
      const nearest = Math.min(toLeft, toRight, toTop, toBottom);
      const step = Math.min(nearest, maxStep);
      if (nearest === toLeft) ball.x -= step;
      else if (nearest === toRight) ball.x += step;
      else if (nearest === toTop) ball.y -= step;
      else ball.y += step;
    });
  }

  // צעד אחד של הפיזיקה (seconds = כמה זמן עבר)
  function step(seconds) {
    const h = seconds / substeps;
    const stopAmount = rollingStop * cell * h;
    const springDamping = 2 * Math.sqrt(rollSpring) * 0.9;
    transitionTime += seconds;

    balls.forEach(function (ball) {
      // "בדרך": כדור שעוד מתגלגל ליעד שלו
      ball.onTheWay = Boolean(ball.target) && Math.hypot(ball.target.x - ball.x, ball.target.y - ball.y) > cell * 0.3;
      // במצב PLAY, כדור שיוצא מהמסך לא מתנגש בכדורים אחרים:
      // - כשהוא כבר לא נראה, כדי שלא ייווצר מחוץ למסך פקק שחוסם את המסגרת
      // - כשהוא עוד לא יצא אחרי רגע קצר (נתקע מאחורי המסגרת), כדי שלא יישאר מעל כפתור או טקסט
      const goingOut = ballsAtEdges && Boolean(ball.target && ball.target.hidden);
      ball.passThrough = goingOut && (isOutOfSight(ball) || transitionTime > passThroughAfter);
    });

    // כל יד מתחילה את הפריים במקום שבו סיימה את הקודם
    hands.forEach(function (hand) {
      hand.fromX = hand.lastX;
      hand.fromY = hand.lastY;
      hand.grow = Math.min(1, hand.grow + seconds / handGrowTime);
    });

    for (let sub = 1; sub <= substeps; sub++) {
      // 1. תנועה: מגלגול ליעד, חיכוך, ואז זזים לפי המהירות
      balls.forEach(function (ball) {
        if (ball.target) {
          ball.vx += ((ball.target.x - ball.x) * rollSpring - ball.vx * springDamping) * h;
          ball.vy += ((ball.target.y - ball.y) * rollSpring - ball.vy * springDamping) * h;
          limitSpeed(ball, maxRollSpeed * cell);
        }
        const slowdown = Math.exp(-friction * h);
        ball.vx *= slowdown;
        ball.vy *= slowdown;
        const speed = Math.hypot(ball.vx, ball.vy);
        const afterStop = Math.max(0, speed - stopAmount);
        if (speed > 0) {
          ball.vx *= afterStop / speed;
          ball.vy *= afterStop / speed;
        }
        ball.startX = ball.x;
        ball.startY = ball.y;
        ball.x += ball.vx * h;
        ball.y += ball.vy * h;
        ball.pushedBy = null;
      });

      // 2. תיקוני מיקום: היד, כפתור במקלדת, התנגשויות, וקצות המסך
      pushByAllHands(sub, h);
      clearFocusedButton();
      balls.forEach(function (ball) {
        ball.beforeBumpX = ball.x;
        ball.beforeBumpY = ball.y;
      });
      separateBalls(0.8, pileUp);
      separateBalls(0.8, pileUp);
      // היד חזקה מכולם: אם התנגשות החזירה כדור לתוך התעלה, היד דוחפת אותו שוב
      pushByAllHands(sub, h);
      keepInsideScreen();

      // 3. המהירות החדשה = כמה כל כדור זז בפועל, ועוד התנופה מהיד.
      // מהדחיפה של ההתנגשויות נשאר רק חלק (bumpEnergy), כי כדור אמיתי מאבד אנרגיה במכה.
      // בלי זה, כדורים שנדחסו בצד התעלה היו קופצים בחזרה וסוגרים אותה
      balls.forEach(function (ball) {
        ball.vx = (ball.beforeBumpX - ball.startX + (ball.x - ball.beforeBumpX) * bumpEnergy) / h;
        ball.vy = (ball.beforeBumpY - ball.startY + (ball.y - ball.beforeBumpY) * bumpEnergy) / h;
        if (ball.pushedBy) {
          ball.vx += ball.pushedBy.x;
          ball.vy += ball.pushedBy.y;
        }
        limitSpeed(ball, maxSpeed * cell);
        // במצב PEEK, כדור שהגיע ליעד שלו משתחרר ומתגלגל חופשי
        if (ball.target && !ballsAtEdges && Math.hypot(ball.target.x - ball.x, ball.target.y - ball.y) < cell * 0.15) {
          ball.target = null;
        }
      });
    }

    // אחרי 3 שניות, כל מי שעוד לא הגיע ליעד במצב PEEK משתחרר (אם הוא כבר בתוך המסך)
    if (!ballsAtEdges && transitionTime > 3) {
      balls.forEach(function (ball) {
        if (ball.insideScreen) ball.target = null;
      });
    }

    hands.forEach(function (hand) {
      hand.lastX = hand.x;
      hand.lastY = hand.y;
    });
  }

  // האם הכדור כולו מחוץ למסך
  function isOutOfSight(ball) {
    return ball.x < -ballRadius || ball.x > width + ballRadius || ball.y < -ballRadius || ball.y > height + ballRadius;
  }

  // בוחר לכדור צבע שיש כמה שפחות ממנו בכדורים שליד place,
  // בלי שצבע אחד יהיה הרבה יותר נפוץ מהאחרים בכל הבריכה
  function pickColor(ball, place) {
    const nearby = colors.map(function () { return 0; });
    const total = colors.map(function () { return 0; });
    balls.forEach(function (other) {
      if (other === ball || other.color < 0) return;
      total[other.color]++;
      if (isOutOfSight(other)) return;
      const distance = Math.hypot(other.x - place.x, other.y - place.y);
      if (distance < ballRadius * 2.4) nearby[other.color] += 1;        // נוגע
      else if (distance < ballRadius * 3.6) nearby[other.color] += 0.3; // קרוב
    });
    const maxPerColor = Math.ceil(balls.length / colors.length) + 1;
    let options = colors.map(function (color, colorIndex) { return colorIndex; }).filter(function (colorIndex) {
      return total[colorIndex] < maxPerColor;
    });
    if (options.length === 0) options = colors.map(function (color, colorIndex) { return colorIndex; });
    options.sort(function (a, b) { return nearby[a] - nearby[b] || total[a] - total[b] || Math.random() - 0.5; });
    ball.color = options[0];
  }

  // צובע מחדש את כל הכדורים לפי המקום שלהם, כך ששכנים יקבלו צבעים שונים (רק לפני שמציירים אותם)
  function mixColorsByPosition() {
    balls.forEach(function (ball) { ball.color = -1; });
    const order = balls.slice().sort(function () { return Math.random() - 0.5; });
    order.forEach(function (ball) { pickColor(ball, ball); });
  }

  function limitSpeed(ball, limit) {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > limit) {
      ball.vx *= limit / speed;
      ball.vy *= limit / speed;
    }
  }

  // =========================================
  // ציור: כל צבע בבת אחת (4 ציורים לכל הכדורים), כדי שזה יהיה מהיר גם בטלפון
  // =========================================
  function draw() {
    context.clearRect(0, 0, width, height);
    colors.forEach(function (color, colorIndex) {
      context.beginPath();
      balls.forEach(function (ball) {
        if (ball.color !== colorIndex) return;
        // כדור שכולו מחוץ למסך לא צריך ציור
        if (isOutOfSight(ball)) return;
        context.moveTo(ball.x + ballRadius, ball.y);
        context.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
      });
      context.fillStyle = color;
      context.fill();
    });
  }

  // =========================================
  // האנימציה: רצה רק כשמשהו זז, ונעצרת כשהכול עומד (חוסך סוללה)
  // =========================================
  function wakeUp() {
    if (running) return;
    running = true;
    lastFrameTime = performance.now();
    requestAnimationFrame(animate);
  }

  function animate(time) {
    const seconds = Math.min((time - lastFrameTime) / 1000, 1 / 30);
    lastFrameTime = time;
    if (seconds > 0) step(seconds);
    draw();
    updateMouseBlocking();
    if (everythingStopped()) {
      running = false;
    } else {
      requestAnimationFrame(animate);
    }
  }

  function everythingStopped() {
    const handMoving = Array.from(hands.values()).some(function (hand) {
      return hand.grow < 1 || hand.x !== hand.fromX || hand.y !== hand.fromY;
    });
    if (handMoving) return false;
    return balls.every(function (ball) {
      const resting = Math.hypot(ball.vx, ball.vy) < restSpeed * cell;
      const arrived = !ball.target || Math.hypot(ball.target.x - ball.x, ball.target.y - ball.y) < cell * 0.1;
      return resting && arrived;
    });
  }

  // =========================================
  // עכבר ואצבע
  // =========================================

  // כשהעכבר על כדור, הקנבס חוסם את מה שמתחתיו (בלי hover ובלי לחיצה על כפתור מכוסה)
  function updateMouseBlocking() {
    const mouse = hands.get("mouse");
    ballCanvas.classList.toggle("is-blocking", Boolean(mouse) && isUnderBall(mouse.x, mouse.y));
  }

  function moveHand(id, x, y, strength) {
    let hand = hands.get(id);
    if (!hand) {
      hand = { x: x, y: y, lastX: x, lastY: y, fromX: x, fromY: y, grow: 0, strength: strength };
      hands.set(id, hand);
    }
    // העכבר "קפץ" (למשל יצא מהחלון ונכנס במקום אחר): היד מתחילה מחדש במקום החדש
    if (Math.hypot(x - hand.x, y - hand.y) > handJump * cell) {
      hand.lastX = x;
      hand.lastY = y;
      hand.grow = 0;
    }
    hand.x = x;
    hand.y = y;
    wakeUp();
  }

  // לחיצה או נגיעה שהתחילה על כדור לא מפעילה את מה שמתחתיו
  let pressStartedOnBall = false;

  window.addEventListener("pointerdown", function (event) {
    pressStartedOnBall = !event.target.closest(".balls-toggle") && isUnderBall(event.clientX, event.clientY);
    page.classList.toggle("is-touching-ball", pressStartedOnBall && event.pointerType !== "mouse");
    if (event.pointerType !== "mouse" && !event.target.closest(".balls-toggle")) {
      moveHand(event.pointerId, event.clientX, event.clientY, touchStrength);
    }
  }, true);

  window.addEventListener("click", function (event) {
    // event.detail === 0: לחיצה מהמקלדת (Enter), שתמיד עובדת
    if (pressStartedOnBall && event.detail !== 0) {
      event.preventDefault();
      event.stopPropagation();
    }
    pressStartedOnBall = false;
  }, true);

  window.addEventListener("pointermove", function (event) {
    if (event.pointerType === "mouse") {
      // מעל הכפתור PEEK / PLAY היד לא בבריכה (הכפתור מעל הכדורים)
      if (event.target.closest(".balls-toggle")) {
        hands.delete("mouse");
        updateMouseBlocking();
        return;
      }
      moveHand("mouse", event.clientX, event.clientY, mouseStrength);
      updateMouseBlocking();
    } else if (hands.has(event.pointerId)) {
      moveHand(event.pointerId, event.clientX, event.clientY, touchStrength);
    }
  });

  // אצבע שעוזבת את המסך מוציאה את היד מהבריכה
  function liftFinger(event) {
    hands.delete(event.pointerId);
    page.classList.remove("is-touching-ball");
  }
  window.addEventListener("pointerup", liftFinger);
  window.addEventListener("pointercancel", liftFinger);

  // עכבר שיוצא מהחלון מוציא את היד מהבריכה
  document.addEventListener("mouseout", function (event) {
    if (!event.relatedTarget) {
      hands.delete("mouse");
      updateMouseBlocking();
    }
  });
  window.addEventListener("blur", function () {
    hands.clear();
  });

  // ביטחון נוסף: מגע באצבע לא גולל את העמוד (יחד עם touch-action: none ב-styles.css)
  document.addEventListener("touchmove", function (event) {
    event.preventDefault();
  }, { passive: false });

  // ניווט במקלדת: הכדורים זזים מהכפתור שנבחר, כדי שיראו אותו
  document.addEventListener("focusin", function (event) {
    if (event.target.matches(".nav-button") && event.target.matches(":focus-visible")) {
      focusedRect = event.target.getBoundingClientRect();
      wakeUp();
    }
  });
  document.addEventListener("focusout", function () {
    focusedRect = null;
  });

  // =========================================
  // התחלה, ושינוי גודל החלון
  // =========================================
  function setUp() {
    measure();
    createBalls();
    if (ballsAtEdges) {
      // מי שביקש צמצום תנועה: מתחילים כשהכדורים כבר בשוליים (הכפתור כתוב PLAY)
      sendBallsToEdges();
      placeBallsNow();
    } else {
      startLikeAfterPlay();
    }
    updateToggleText();
    draw();
  }

  // בטעינה הכדורים נראים בדיוק כמו אחרי לחיצה על PLAY: ערימה מבולגנת על כל המסך.
  // מריצים את התנועה של PLAY (מהשוליים) מאחורי הקלעים, בלי לצייר,
  // ועל המסך רואים רק את הסוף שלה: התמקמות קטנה בשנייה הראשונה
  function startLikeAfterPlay() {
    ballsAtEdges = true;
    sendBallsToEdges();
    placeBallsNow();
    ballsAtEdges = false;
    spreadBallsOverScreen();
    transitionTime = 0;
    const frameTime = 1 / 30;
    for (let time = 0; time < loadHeadStart; time += frameTime) {
      step(frameTime);
    }
    // הכדורים עוד לא צוירו, אז אפשר לצבוע אותם לפי המקום שבו הם יופיעו
    mixColorsByPosition();
    wakeUp();
  }

  ballsAtEdges = reducedMotion.matches;
  setUp();

  // בשינוי גודל החלון (או סיבוב הטלפון) בונים את הבריכה מחדש, במצב הנוכחי
  let resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setUp, 150);
  });
}
