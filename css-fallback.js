// חלופה לדפדפנים ישנים (כרום ו-Edge לפני 125, ספארי לפני 15.4, פיירפוקס לפני 118).
// הם לא מכירים את round() ואת mod() (וחלקם גם את dvh), ולכן כל משתנה ב-styles.css
// שמשתמש בהם לא עובד, כולל --cell, --line ו---grid-top שכל האתר תלוי בהם.
// הסקריפט מחשב בעצמו את הערך של כל משתנה כזה, ושם אותו על האלמנט שלו בפיקסלים.
// בדפדפן עדכני הוא לא עושה כלום: styles.css מסמן --css-fallback רק כשחסר משהו.
// הקובץ נטען ב-head מיד אחרי styles.css (ואחרי grid.js, אם יש), לפני שהעמוד מצויר.
(function () {
  const root = document.documentElement;
  if (!getComputedStyle(root).getPropertyValue("--css-fallback").trim()) return;

  // dvh, svh ו-lvh: רק בדפדפן שלא מכיר אותם
  const supportsDvh = window.CSS && CSS.supports && CSS.supports("height", "1dvh");
  const needsFix = supportsDvh ? /round\(|mod\(/ : /round\(|mod\(|\d[dsl]vh\b/;

  // ----- איזה משתנים צריך לחשב: כל משתנה ב-styles.css שהערך שלו משתמש ב-round, mod או dvh -----
  const targets = [];
  function collect(rules) {
    Array.from(rules).forEach(function (rule) {
      if (rule.cssRules) collect(rule.cssRules); // בתוך @media ו-@supports
      if (!rule.style || !rule.selectorText) return;
      for (let i = 0; i < rule.style.length; i++) {
        const name = rule.style[i];
        if (name.startsWith("--") && needsFix.test(rule.style.getPropertyValue(name))) {
          targets.push({ selector: rule.selectorText, name: name });
        }
      }
    });
  }
  Array.from(document.styleSheets).forEach(function (sheet) {
    try { collect(sheet.cssRules); } catch (error) { /* גיליון מאתר אחר */ }
  });

  // ----- גודל היחידות: נמדד מאלמנט נסתר, בדיוק כמו שהדפדפן מחשב אותן -----
  let units = {};
  function measureUnits() {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;width:100vw;height:100vh";
    root.appendChild(probe);
    const box = probe.getBoundingClientRect();
    units = { px: 1, vw: box.width / 100, vh: box.height / 100 };
    ["dvh", "svh", "lvh"].forEach(function (unit) {
      if (supportsDvh) {
        probe.style.height = "100" + unit;
        units[unit] = probe.getBoundingClientRect().height / 100;
      }
    });
    if (!supportsDvh) {
      // בלי dvh: הגובה הנוכחי של החלון, הגובה הקטן (עם סרגל הדפדפן) והגדול
      units.dvh = window.innerHeight / 100;
      units.svh = root.clientHeight / 100;
      units.lvh = units.vh;
    }
    probe.remove();
  }

  // ----- חישוב ביטוי: calc, min, max, clamp, round ו-mod, ביחידות px, vw ו-vh -----
  function unitSize(unit) {
    if (units[unit] === undefined) throw new Error("unit " + unit);
    return units[unit];
  }

  function evaluate(text) {
    const tokens = text.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?[a-z%]*|[a-z][\w-]*\(?|[()+*/,-]/gi) || [];
    let position = 0;
    const next = function () { return tokens[position]; };
    const take = function (expected) {
      if (expected && tokens[position] !== expected) throw new Error("expected " + expected);
      return tokens[position++];
    };

    // כל ערך הוא מספר, ו-isLength אומר אם הוא בפיקסלים
    function sum() {
      let a = product();
      while (next() === "+" || next() === "-") {
        const sign = take() === "+" ? 1 : -1;
        const b = product();
        a = { value: a.value + sign * b.value, isLength: a.isLength || b.isLength };
      }
      return a;
    }
    function product() {
      let a = single();
      while (next() === "*" || next() === "/") {
        const operator = take();
        const b = single();
        a = operator === "*"
          ? { value: a.value * b.value, isLength: a.isLength || b.isLength }
          : { value: a.value / b.value, isLength: a.isLength && !b.isLength };
      }
      return a;
    }
    function list() {
      const values = [sum()];
      while (next() === ",") { take(); values.push(sum()); }
      take(")");
      return values;
    }
    function single() {
      const token = take();
      if (token === undefined) throw new Error("end");
      if (token === "(") { const inner = sum(); take(")"); return inner; }
      const number = /^(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z%]*)$/i.exec(token);
      if (number) {
        const unit = number[2].toLowerCase();
        return unit
          ? { value: parseFloat(number[1]) * unitSize(unit), isLength: true }
          : { value: parseFloat(number[1]), isLength: false };
      }
      // השם בלי x בהתחלה: בסימולציה של דפדפן ישן round נקרא xround
      const name = token.toLowerCase().replace(/\($/, "").replace(/^x(?=round$|mod$)/, "");
      if (name === "calc") { const inner = sum(); take(")"); return inner; }
      if (name === "min" || name === "max") {
        const values = list();
        const pick = Math[name].apply(null, values.map(function (v) { return v.value; }));
        return { value: pick, isLength: values.some(function (v) { return v.isLength; }) };
      }
      if (name === "clamp") {
        const [low, middle, high] = list();
        return { value: Math.max(low.value, Math.min(middle.value, high.value)), isLength: middle.isLength };
      }
      if (name === "round") {
        let strategy = "nearest";
        if (/^(nearest|up|down|to-zero)$/.test(next())) { strategy = take(); take(","); }
        const [a, step] = list();
        const stepValue = step ? step.value : 1;
        const ratio = a.value / stepValue;
        const whole = strategy === "down" ? Math.floor(ratio)
          : strategy === "up" ? Math.ceil(ratio)
          : strategy === "to-zero" ? Math.trunc(ratio)
          : Math.round(ratio);
        return { value: whole * stepValue, isLength: a.isLength };
      }
      if (name === "mod") {
        const [a, b] = list();
        return { value: a.value - b.value * Math.floor(a.value / b.value), isLength: a.isLength };
      }
      throw new Error("unknown " + token);
    }

    const result = sum();
    if (position !== tokens.length || !isFinite(result.value)) throw new Error("bad value");
    const rounded = Math.round(result.value * 1e8) / 1e8;
    return result.isLength ? rounded + "px" : String(rounded);
  }

  // ----- הצבת הערכים על האלמנטים -----
  const placed = [];          // [אלמנט, שם, ערך] שהסקריפט שם
  let watched = new Set();    // האלמנטים שיש עליהם משתנה כזה

  function update() {
    // קודם מסירים את הערכים הקודמים, כדי לקרוא מחדש את הערך מ-styles.css
    placed.forEach(function (entry) {
      if (entry[0].style.getPropertyValue(entry[1]) === entry[2]) entry[0].style.removeProperty(entry[1]);
    });
    placed.length = 0;
    watched = new Set();
    measureUnits();
    targets.forEach(function (target) {
      let elements;
      try { elements = document.querySelectorAll(target.selector); } catch (error) { return; }
      elements.forEach(function (element) {
        watched.add(element);
        // הערך שהדפדפן בחר (אחרי ה-cascade), עם המשתנים שבתוכו כבר מוצבים
        const text = getComputedStyle(element).getPropertyValue(target.name);
        if (!needsFix.test(text)) return;
        let value;
        try { value = evaluate(text); } catch (error) { return; }
        element.style.setProperty(target.name, value);
        placed.push([element, target.name, value]);
      });
    });
    observer.takeRecords(); // השינויים של הסקריפט עצמו לא מפעילים חישוב נוסף
  }

  // ----- חישוב מחדש: שינוי גודל, ושינוי של סקריפט אחר במשתנים או במחלקות -----
  function matchesTarget(element) {
    return targets.some(function (target) {
      try { return element.matches(target.selector) || element.querySelector(target.selector); }
      catch (error) { return false; }
    });
  }
  function isRelevant(record) {
    if (record.type === "childList") {
      return Array.from(record.addedNodes).some(function (node) {
        return node.nodeType === 1 && matchesTarget(node);
      });
    }
    const element = record.target;
    if (element === root || element === document.body || watched.has(element)) return true;
    return record.attributeName === "class" && matchesTarget(element);
  }
  const observer = new MutationObserver(function (records) {
    if (records.some(isRelevant)) update();
  });
  observer.observe(root, { attributes: true, attributeFilter: ["style", "class"], childList: true, subtree: true });

  window.addEventListener("resize", update);
  document.addEventListener("DOMContentLoaded", update);
  update();
})();
