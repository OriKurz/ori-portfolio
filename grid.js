// הטורים העודפים בגריד (--extra-columns ב-styles.css).
// רוחב החלון מתחלק בדיוק לטורי העיצוב ועוד מספר זוגי של טורים עודפים (חצי מכל צד).
// מחפשים את המספר הזוגי הקטן ביותר שבו כל שורות העיצוב נכנסות לגובה החלון.
// הקובץ נטען ב-head, לפני שהעמוד מצויר, כדי שהעיצוב לא יקפוץ בטעינה.
// (ב-CSS לבד אי אפשר: ספארי מחשב לא נכון את היחס רוחב/גובה של החלון)
(function () {
  const root = document.documentElement;

  // קורא משתנה מספרי מ-styles.css (גם כשהוא חישוב, כמו 810 / 93)
  function readNumber(name) {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;width:calc(var(" + name + ") * 1px)";
    root.appendChild(probe);
    const value = probe.getBoundingClientRect().width;
    probe.remove();
    return value;
  }

  function updateExtraColumns() {
    const columns = readNumber("--design-columns");
    const rows = readNumber("--design-rows");
    // כמה טורים צריך כדי שהמשבצת תהיה קטנה מספיק לגובה (0.0001 = תיקון לשגיאת חישוב)
    const neededColumns = (rows * window.innerWidth) / window.innerHeight;
    const extraPerSide = Math.max(0, Math.ceil((neededColumns - columns) / 2 - 0.0001));
    root.style.setProperty("--extra-columns", extraPerSide * 2);
  }

  updateExtraColumns();
  window.addEventListener("resize", updateExtraColumns);
})();
