// בדיקה אוטומטית לאתר: רצה לפני כל push (npm run check, .githooks/pre-push).
// מעלה שרת מקומי, פותחת כל עמוד בכל גודל ובכל מנוע (chromium, webkit, firefox),
// ובודקת שהאתר לא שבור. בסוף: צילומים ודוח ב-checks/output, ו-exit code שונה מ-0 כשמשהו נכשל.
// שבור (חוסם): גלילה הצידה, גריד שלא מצויר, אלמנט שנעלם או יוצא מהעמוד, טקסט חתוך,
// פונט שלא נטען, שגיאה, קובץ חסר, תמונה שלא נטענה, רווח מתחת ל-What's Next,
// ובסימולציות של דפדפן ישן: עמוד שנראה אחרת מכרום הרגיל.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { chromium, webkit, firefox } = require("playwright");

const siteRoot = path.join(__dirname, "..");
const outputDir = path.join(__dirname, "output");
const screenshotDir = path.join(outputDir, "screenshots");

// ----- העמודים: כל קבצי ה-html שבגיט, חוץ מ-styleguide ו-process -----
const excludedPages = ["styleguide.html", "process.html"];
function listPages() {
  let files;
  try {
    files = execSync("git ls-files '*.html'", { cwd: siteRoot, encoding: "utf8" }).split("\n");
  } catch (error) {
    files = fs.readdirSync(siteRoot);
  }
  return files.filter((file) => /^[^/]+\.html$/.test(file) && !excludedPages.includes(file)).sort();
}

// ----- הגדלים והמנועים -----
const sizes = {
  "phone-360": { width: 360, height: 780, mobile: true, scale: 3 },
  "phone-390": { width: 390, height: 844, mobile: true, scale: 3 },
  "phone-430": { width: 430, height: 932, mobile: true, scale: 3 },
  "tablet-portrait": { width: 820, height: 1180, mobile: true, scale: 2 },
  "tablet-landscape": { width: 1180, height: 820, mobile: true, scale: 2 },
  "laptop-1280": { width: 1280, height: 720 },
  "laptop-1440": { width: 1440, height: 900 },
  "desktop-1920": { width: 1920, height: 1080 },
  "desktop-2560": { width: 2560, height: 1440 },
  "wide-3440": { width: 3440, height: 1440 },
  "tv-3840": { width: 3840, height: 2160 },
};
// שתי בדיקות: המהירה (npm run check, לפני כל push) והמלאה (npm run check:full, רק כשמבקשים)
const full = process.argv.includes("--full");
const engines = full ? {
  chromium: Object.keys(sizes),
  webkit: ["phone-360", "phone-390", "phone-430", "tablet-portrait", "tablet-landscape", "laptop-1440", "desktop-2560"],
  firefox: ["laptop-1440", "desktop-1920"],
} : {
  chromium: ["phone-390", "laptop-1440", "desktop-2560"],
  webkit: ["phone-390"],
};
// הסימולציות של דפדפן ישן (ב-chromium), מול אותו עמוד בכרום הרגיל
const simulationSizes = full ? ["phone-390", "laptop-1440", "desktop-2560"] : ["laptop-1440"];
const simulations = full ? ["old-chrome", "safari-15"] : ["old-chrome"];
const tolerance = 2; // פיקסלים, בהשוואה של הסימולציות

// ----- השרת: מגיש את האתר, ובסימולציות גרסה של styles.css בלי הפיצ'רים החדשים -----
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".webm": "video/webm", ".otf": "font/otf", ".ttf": "font/ttf",
  ".woff": "font/woff", ".woff2": "font/woff2", ".pdf": "application/pdf", ".ico": "image/x-icon",
};
// כרום ישן: בלי round, mod, color-mix ו-dvh (השם המשובש = פונקציה שהדפדפן לא מכיר)
function oldChromeCss(css) {
  return css
    .replace(/round\(/g, "xround(")
    .replace(/mod\(/g, "xmod(")
    .replace(/color-mix\(/g, "xcolor-mix(")
    .replace(/(\d)(dvh|svh|lvh)\b/g, "$1x$2");
}
// ספארי 15: כמו כרום ישן, וגם בלי overflow: clip
function safari15Css(css) {
  return oldChromeCss(css).replace(/(overflow(?:-[xy])?\s*:\s*)clip\b/g, "$1xclip");
}
const cssTransforms = { normal: null, "old-chrome": oldChromeCss, "safari-15": safari15Css };

function startServer(mode) {
  const server = http.createServer((request, response) => {
    let urlPath = decodeURIComponent(request.url.split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    const file = path.join(siteRoot, urlPath);
    const inside = file.startsWith(siteRoot) && fs.existsSync(file) && fs.statSync(file).isFile();
    if (!inside) {
      // כמו Vercel: כתובת שלא קיימת מקבלת את 404.html עם סטטוס 404
      response.writeHead(404, { "Content-Type": types[".html"] });
      response.end(fs.readFileSync(path.join(siteRoot, "404.html")));
      return;
    }
    const type = types[path.extname(file).toLowerCase()] || "application/octet-stream";
    if (path.basename(file) === "styles.css" && cssTransforms[mode]) {
      response.writeHead(200, { "Content-Type": type });
      response.end(cssTransforms[mode](fs.readFileSync(file, "utf8")));
      return;
    }
    // סרטונים: ספארי צריך בקשות חלקיות (Range)
    const size = fs.statSync(file).size;
    const range = /bytes=(\d*)-(\d*)/.exec(request.headers.range || "");
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Number(range[2]) : size - 1;
      response.writeHead(206, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
      fs.createReadStream(file, { start, end }).pipe(response);
      return;
    }
    response.writeHead(200, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Length": size });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// ----- בתוך הדפדפן: מחכים שהעמוד יירגע -----
async function settle(page) {
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    await document.fonts.ready;
    // מעבר העמודים ואנימציות הכניסה (כל אנימציה שיש לה סוף)
    for (let i = 0; i < 60; i++) {
      const running = document.getAnimations().filter((a) => {
        const timing = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : {};
        return a.playState === "running" && timing.endTime !== Infinity;
      });
      if (!running.length && !document.querySelector(".page-transition")) break;
      await wait(100);
    }
    // הסרטונים: עוצרים על הפריים הראשון
    await Promise.all(Array.from(document.querySelectorAll("video")).map(async (video) => {
      video.pause();
      for (let i = 0; i < 40 && video.readyState < 2 && video.currentSrc && video.preload !== "none"; i++) await wait(50);
      if (video.currentTime !== 0) {
        const seeked = new Promise((r) => video.addEventListener("seeked", r, { once: true }));
        video.currentTime = 0;
        await Promise.race([seeked, wait(3000)]);
      }
      video.pause();
    }));
    await frame();
    await frame();
  });
}

// גלילה לנקודה קבועה (0 = למעלה, 1 = עד הסוף) של החלון ושל אזור הגלילה הגדול בעמוד, עד שהיא נעצרת
async function scrollTo(page, fraction) {
  await page.evaluate(async (fraction) => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    let biggest = null;
    let biggestArea = 0;
    document.querySelectorAll("body *").forEach((element) => {
      const style = getComputedStyle(element);
      if (!/auto|scroll/.test(style.overflowY) || element.scrollHeight - element.clientHeight < 10) return;
      const area = element.clientWidth * element.clientHeight;
      if (area > biggestArea) { biggest = element; biggestArea = area; }
    });
    const place = () => {
      window.scrollTo({ top: Math.round((document.documentElement.scrollHeight - innerHeight) * fraction), behavior: "instant" });
      if (biggest) biggest.scrollTo({ top: Math.round((biggest.scrollHeight - biggest.clientHeight) * fraction), behavior: "instant" });
    };
    const where = () => window.scrollY + "," + (biggest ? biggest.scrollTop : 0);
    place();
    let last = where();
    let still = 0;
    for (let i = 0; i < 200 && still < 8; i++) {
      await frame();
      const now = where();
      still = now === last ? still + 1 : 0;
      last = now;
    }
  }, fraction);
}

// גלילה הדרגתית עד הסוף, כדי שכל התמונות (גם lazy) ייטענו
async function scrollThrough(page) {
  for (let step = 1; step <= 10; step++) await scrollTo(page, step / 10);
  await page.waitForTimeout(800);
}

// ----- הבדיקות בתוך העמוד (6א עד 6ח, חוץ משגיאות ותמונות) -----
function pageChecks() {
  const failures = [];
  const fail = (check, element) => failures.push({ check, element });
  const describe = (element) => {
    if (!element || !element.tagName) return "";
    const classes = (element.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".");
    const text = (element.innerText || element.getAttribute("alt") || element.getAttribute("aria-label") || element.getAttribute("src") || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return element.tagName.toLowerCase() + (classes ? "." + classes : "") + (text ? ` "${text}"` : "");
  };
  // נראה = לא מוסתר (display, visibility, opacity, hidden), גם לא באחד ההורים
  const isShown = (element) => {
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || Number(style.opacity) === 0) return false;
      if (node.hasAttribute("hidden")) return false;
    }
    return true;
  };
  // אלמנט שאחד ההורים שלו חותך אותו (overflow), או שהוא בתוך שכבה קבועה: יציאה מהגבולות שלו מכוונת
  const isClipped = (element) => {
    for (let node = element.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX !== "visible" || style.overflowY !== "visible") return true;
      if (style.clipPath !== "none") return true;
    }
    return false;
  };
  const hasOwnText = (element) => Array.from(element.childNodes).some((node) => node.nodeType === 3 && node.textContent.trim());

  const doc = document.documentElement;
  const pageWidth = Math.max(doc.scrollWidth, document.body.scrollWidth);
  const pageHeight = Math.max(doc.scrollHeight, document.body.scrollHeight);

  // א. אין גלילה הצידה
  const sideScroll = Math.max(doc.scrollWidth, document.body.scrollWidth) - window.innerWidth;
  if (sideScroll > 0) fail("א. גלילה הצידה", `${sideScroll}px יותר מרוחב החלון`);

  // ב. הגריד מצויר
  const grids = Array.from(document.querySelectorAll("body, body *")).filter((element) => {
    if (!isShown(element)) return false;
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && /gradient/.test(getComputedStyle(element).backgroundImage);
  });
  if (!grids.length) fail("ב. הגריד לא מצויר", "אין אלמנט עם קווי גריד (gradient)");
  const probeOwner = grids[0] || document.body;
  ["--cell", "--line"].forEach((name) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;left:0;top:0;height:0;visibility:hidden;width:var(${name})`;
    probeOwner.appendChild(probe);
    const value = probe.getBoundingClientRect().width;
    probe.remove();
    if (!(value > 0) || !isFinite(value)) fail("ב. הגריד לא מצויר", `${name} לא מספר תקין (${getComputedStyle(probeOwner).getPropertyValue(name).trim().slice(0, 60) || "ריק"})`);
  });

  // ג. אלמנט נראה לא בגודל 0 ולא מחוץ לגבולות העמוד
  const visualSelector = "img, video, svg, button, a, input, textarea, select";
  Array.from(document.querySelectorAll("body *")).forEach((element) => {
    const isVisual = element.matches(visualSelector) || hasOwnText(element);
    if (!isVisual || element.closest("svg") !== null && element.tagName.toLowerCase() !== "svg") return;
    if (!isShown(element)) return;
    const style = getComputedStyle(element);
    if (style.display === "contents") return;
    const box = element.getBoundingClientRect();
    if (box.width < 0.5 || box.height < 0.5) {
      fail("ג. אלמנט בגודל 0", describe(element));
      return;
    }
    if (isClipped(element) || style.position === "fixed") return;
    const left = box.left + window.scrollX;
    const top = box.top + window.scrollY;
    const outside = left + box.width <= 0 || top + box.height <= 0 || left >= pageWidth || top >= pageHeight || left < -tolerancePx || top < -tolerancePx;
    if (outside) fail("ג. אלמנט מחוץ לעמוד", `${describe(element)} ב-(${Math.round(left)}, ${Math.round(top)})`);
  });

  // ד. טקסט לא נחתך בתגיות, בלייבלים ובקופסאות הטקסט
  const textBoxSelector = "[class*='tag'], [class*='label'], [class*='caption'], [class*='box'], .section-title, .play-hint, .grid-box";
  Array.from(document.querySelectorAll(textBoxSelector)).forEach((element) => {
    if (!isShown(element) || !element.innerText || !element.innerText.trim()) return;
    if (getComputedStyle(element).display.startsWith("inline") && getComputedStyle(element).display !== "inline-block") return;
    if (element.clientWidth === 0 || element.clientHeight === 0) return;
    const extraHeight = element.scrollHeight - element.clientHeight;
    const extraWidth = element.scrollWidth - element.clientWidth;
    if (extraHeight > 1 || extraWidth > 1) fail("ד. טקסט נחתך", `${describe(element)} (חסרים ${Math.max(extraWidth, 0)}px לרוחב, ${Math.max(extraHeight, 0)}px לגובה)`);
  });

  // ה. הפונטים נטענו: הפונט הראשון של כל טקסט נראה, במשקל ובסגנון שלו
  const fonts = new Set();
  Array.from(document.querySelectorAll("body *")).forEach((element) => {
    if (!hasOwnText(element) || !isShown(element)) return;
    const style = getComputedStyle(element);
    const family = style.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
    if (/^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/.test(family)) return;
    fonts.add(`${style.fontStyle}|${style.fontWeight}|${family}`);
  });
  fonts.forEach((font) => {
    const [fontStyle, weight, family] = font.split("|");
    if (!document.fonts.check(`${fontStyle} ${weight} 16px "${family}"`)) fail("ה. פונט לא נטען", `${family} ${weight}${fontStyle !== "normal" ? " " + fontStyle : ""}`);
  });

  // ח. What's Next: הרצועה צמודה מיד מתחת לשורה (בלי שורת רווח)
  const strip = document.querySelector(".next-projects");
  if (strip && isShown(strip)) {
    const title = Array.from(document.querySelectorAll("body *")).find((element) => hasOwnText(element) && /what.s\s*next/i.test(element.textContent) && isShown(element));
    if (title) {
      const row = title.closest(".section-title, .grid-box, .on-grid") || title;
      const line = parseFloat(getComputedStyle(row).getPropertyValue("--line")) || 3;
      const gap = strip.getBoundingClientRect().top - row.getBoundingClientRect().bottom;
      if (gap > 1 || gap < -(line + 1)) fail("ח. What's Next לא צמוד", `${Math.round(gap)}px בין השורה של What's Next לרצועה`);
    }
  }
  return failures;
}

// ----- תמונות: אחרי גלילה עד הסוף, כל תמונה שמוצגת נטענה (ז) -----
function imageChecks() {
  return Array.from(document.images).filter((image) => {
    const box = image.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) return false; // תמונה שלא מוצגת בגודל הזה
    return !image.complete || image.naturalWidth === 0;
  }).map((image) => ({ check: "ז. תמונה לא נטענה", element: image.getAttribute("src") }));
}

// ----- השוואת הסימולציות: מיקום, גודל ועיצוב של כל אלמנט (ט) -----
const movingSelector = [
  ".page-transition", ".custom-cursor", "[class*='ball']", "#shunra-sticker-layer", ".stk",
  ".next-projects-track", ".contact-banner", ".projects-track", "video",
].join(", ");
function dumpLayout(movingSelector) {
  const origin = location.origin;
  return [document.documentElement, ...document.querySelectorAll("body, body *")]
    .filter((element) => !element.closest(movingSelector) && !["SCRIPT", "STYLE"].includes(element.tagName))
    .map((element) => {
      const style = getComputedStyle(element);
      const values = {};
      for (let i = 0; i < style.length; i++) {
        const name = style[i];
        if (!name.startsWith("--")) values[name] = style.getPropertyValue(name).split(origin).join("");
      }
      const box = element.getBoundingClientRect();
      const classes = (element.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".");
      return { name: element.tagName.toLowerCase() + (classes ? "." + classes : ""), box: [box.x, box.y, box.width, box.height], values };
    });
}
// שני ערכים שווים כשהמספרים שבהם שונים בפחות מ-2 (פיקסלים), ושאר הטקסט זהה
function sameValue(a, b) {
  if (a === b) return true;
  const numbers = /-?\d*\.?\d+(?:e-?\d+)?/g;
  if (a.replace(numbers, "#") !== b.replace(numbers, "#")) return false;
  const na = a.match(numbers) || [];
  const nb = b.match(numbers) || [];
  return na.every((n, i) => Math.abs(Number(n) - Number(nb[i])) <= tolerance);
}
function compareLayouts(reference, simulated) {
  const failures = [];
  if (reference.length !== simulated.length) {
    failures.push({ check: "ט. שונה מכרום הרגיל", element: `${simulated.length} אלמנטים במקום ${reference.length}` });
    return failures;
  }
  reference.forEach((a, i) => {
    const b = simulated[i];
    const moved = a.box.some((v, k) => Math.abs(v - b.box[k]) > tolerance);
    if (moved) failures.push({ check: "ט. שונה מכרום הרגיל", element: `${a.name}: מיקום/גודל ${a.box.map(Math.round).join(",")} ← ${b.box.map(Math.round).join(",")}` });
    const styles = Object.keys(a.values).filter((name) => !sameValue(a.values[name], b.values[name] || ""));
    if (styles.length) failures.push({ check: "ט. שונה מכרום הרגיל", element: `${a.name}: ${styles.slice(0, 3).map((n) => `${n} ${a.values[n].slice(0, 40)} ← ${(b.values[n] || "").slice(0, 40)}`).join("; ")}` });
  });
  // אותו הבדל שחוזר בהרבה אלמנטים: מספיק לדווח עליו כמה פעמים
  return failures.slice(0, 15);
}

// ----- הרצה של עמוד אחד בגודל אחד -----
async function runPage(browser, engineName, sizeName, file, baseUrl, options) {
  const size = sizes[sizeName];
  const contextOptions = {
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: size.scale || 1,
    hasTouch: !!size.mobile,
    reducedMotion: options.reducedMotion ? "reduce" : "no-preference",
  };
  if (engineName !== "firefox") contextOptions.isMobile = !!size.mobile;
  const context = await browser.newContext(contextOptions);
  // אקראיות קבועה, כדי שההרצות יהיו זהות
  await context.addInitScript(() => {
    let seed = 12345;
    Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  });
  const page = await context.newPage();
  const failures = [];
  // ו. שגיאות, ושגיאות בקונסול, וקבצים שלא נטענו
  page.on("pageerror", (error) => failures.push({ check: "ו. שגיאת JavaScript", element: error.message.split("\n")[0] }));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push({ check: "ו. שגיאה בקונסול", element: message.text().split("\n")[0].slice(0, 160) });
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) failures.push({ check: "ו. קובץ לא נטען", element: `${response.status()} ${response.url().replace(baseUrl, "")}` });
  });
  page.on("requestfailed", (request) => {
    const reason = (request.failure() && request.failure().errorText) || "";
    if (/abort|cancel|NS_BINDING_ABORTED/i.test(reason)) return; // בקשה שהדפדפן ביטל בעצמו (סרטון, prefetch)
    failures.push({ check: "ו. קובץ לא נטען", element: `${reason} ${request.url().replace(baseUrl, "")}` });
  });

  let layout = null;
  try {
    await page.goto(`${baseUrl}/${file}`, { waitUntil: "load", timeout: 60000 });
    await settle(page);
    await scrollTo(page, 0);
    failures.push(...await page.evaluate(`(${pageChecks.toString().replace(/tolerancePx/g, tolerance)})()`));
    if (options.dump) layout = await page.evaluate(dumpLayout, movingSelector);
    if (options.screenshot) {
      await page.screenshot({ path: path.join(screenshotDir, `${file.replace(/\.html$/, "")}_${options.label}_${size.width}x${size.height}.png`), fullPage: true });
    }
    await scrollThrough(page);
    failures.push(...await page.evaluate(imageChecks));
  } catch (error) {
    failures.push({ check: "העמוד לא נטען", element: error.message.split("\n")[0] });
  }
  await context.close();
  return { failures, layout };
}

// ----- הכול יחד -----
async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(screenshotDir, { recursive: true });
  const pages = listPages();
  const servers = {};
  for (const mode of Object.keys(cssTransforms)) servers[mode] = await startServer(mode);
  const urlFor = (mode) => `http://127.0.0.1:${servers[mode].address().port}`;

  // רשימת ההרצות
  const jobs = [];
  for (const [engineName, engineSizes] of Object.entries(engines)) {
    for (const sizeName of engineSizes) for (const file of pages) {
      jobs.push({ engineName, sizeName, file, mode: "normal", label: engineName, report: true, screenshot: true });
    }
  }
  for (const sizeName of simulationSizes) for (const file of pages) {
    // ההשוואה: בלי תנועה (reduced motion), גם בכרום הרגיל וגם בסימולציה
    jobs.push({ engineName: "chromium", sizeName, file, mode: "normal", label: "chromium-reference", reducedMotion: true, dump: true });
    for (const simulation of simulations) {
      jobs.push({ engineName: "chromium", sizeName, file, mode: simulation, label: `chromium-${simulation}`, report: true, screenshot: true, reducedMotion: true, dump: true });
    }
  }

  const browsers = {};
  const launchers = { chromium, webkit, firefox };
  const results = [];
  let done = 0;
  async function worker() {
    while (jobs.length) {
      const job = jobs.shift();
      if (!browsers[job.engineName]) browsers[job.engineName] = launchers[job.engineName].launch();
      const browser = await browsers[job.engineName];
      // עמוד שנתקע לא עוצר את כל הבדיקה: אחרי 2 דקות הוא נכשל
      const result = await Promise.race([
        runPage(browser, job.engineName, job.sizeName, job.file, urlFor(job.mode), job),
        new Promise((resolve) => setTimeout(() => resolve({ failures: [{ check: "העמוד נתקע", element: "לא הסתיים תוך 2 דקות" }], layout: null }), 120000)),
      ]);
      results.push({ ...job, ...result });
      done++;
      if (done % 20 === 0) process.stdout.write(`  ${done} הרצות...\n`);
    }
  }
  console.log(`${full ? "בדיקה מלאה" : "בדיקה מהירה"}: ${pages.length} עמודים (${pages.join(", ")})`);
  await Promise.all(Array.from({ length: 4 }, worker));

  // ט. הסימולציות מול כרום הרגיל
  for (const result of results.filter((r) => r.mode !== "normal")) {
    const reference = results.find((r) => r.label === "chromium-reference" && r.file === result.file && r.sizeName === result.sizeName);
    if (reference && reference.layout && result.layout) result.failures.push(...compareLayouts(reference.layout, result.layout));
  }

  // הדוח
  const lines = [];
  for (const result of results.filter((r) => r.report)) {
    const size = sizes[result.sizeName];
    const seen = new Set();
    result.failures.forEach((failure) => {
      const line = `${result.file} | ${result.label} | ${size.width}×${size.height} | ${failure.check} | ${failure.element}`;
      if (!seen.has(line)) { seen.add(line); lines.push(line); }
    });
  }
  const passed = lines.length === 0;
  fs.writeFileSync(path.join(outputDir, "report.txt"), [passed ? "עבר" : "נכשל", ...lines].join("\n") + "\n");
  console.log(passed ? "עבר" : `נכשל: ${lines.length} כישלונות. הפירוט ב-checks/output/report.txt`);

  for (const browser of Object.values(browsers)) await (await browser).close();
  Object.values(servers).forEach((server) => server.close());
  process.exit(passed ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
