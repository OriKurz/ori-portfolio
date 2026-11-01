/*
  elements-anim.js
  Hover animations for the illustrated objects from "The Perfect Crime".

  Usage in the page:
    <link rel="stylesheet" href="elements-anim/elements-anim.css">
    <div class="ea-item" data-ea="tree"></div>      (one div per object, sized by its width)
    <script src="elements-anim/elements-anim.js" defer></script>

  Each div gets its own drawing and animation from the img/ folder next to this file.
  Names: chandelier, box-flip, box-small, box-long, box-office, box-fragile,
         tree, car, siren, fire, gift, lamp, glass, tape, axe
*/
(() => {
  "use strict";

  const SCRIPT = document.currentScript;
  const BASE = SCRIPT && SCRIPT.src ? new URL(".", SCRIPT.src).href : "elements-anim/";
  const IMG = name => `${BASE}img/${name}.png`;
  const LOTTIE_URL = `${BASE}vendor/lottie.min.js`;
  const NS = "http://www.w3.org/2000/svg";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const M = reduce ? 0.35 : 1;

  /* ---------- sizes and fixed points measured on each drawing (in its own pixels) ---------- */
  const SIZE = {
    "chandelier": [1193, 974], "box-flip": [593, 547], "box-small": [593, 547], "box-long": [1862, 633],
    "box-office": [1826, 1138], "box-fragile": [1480, 1563], "tree": [496, 592], "car": [980, 562],
    "siren": [990, 941], "fire": [1354, 1388], "gift": [1444, 1812], "lamp": [2121, 1858],
    "glass": [308, 390], "tape": [1600, 1696], "axe": [581, 650]
  };
  // where each separate part sits inside its object
  const LAYERS = {
    fire: { "fire-sun": [0, 0, 809, 1261], "fire-sign": [325, 227, 1029, 1161] },
    gift: { "gift-body": [0, 328, 1444, 1484], "gift-bow": [42, 0, 1249, 568] },
    lamp: { "lamp-body": [0, 0, 2121, 1774], "lamp-web": [880, 470, 886, 1271], "lamp-spider": [1585, 1725, 230, 133] },
    tape: { "tape-body": [0, 0, 1600, 1696], "tape-tongue": [1072, 1189, 405, 379] },
    axe: { "axe-box": [0, 149, 466, 501], "axe-axe": [75, 0, 506, 251] }
  };
  // the two bottom corners each box can lean on
  const CORNERS = {
    "box-long": { L: [99, 619], R: [1854, 626] }, "box-office": { L: [102, 1126], R: [1819, 1131] },
    "box-fragile": { L: [133, 1555], R: [1445, 1544] }, "box-small": { L: [113, 540], R: [570, 531] }
  };
  // how high each box tips (degrees) and how hard gravity pulls it back
  const FEEL = {
    "box-small": { tilt: 13, g: 420 }, "box-long": { tilt: 6, g: 240 },
    "box-office": { tilt: 9, g: 270 }, "box-fragile": { tilt: 8, g: 240 }
  };

  /* ---------- shared animation loop ---------- */
  const spring = (w, z) => ({ x: 0, v: 0, t: 0, w, z });
  const step = (s, dt) => {
    s.v += (-s.w * s.w * (s.x - s.t) - 2 * s.z * s.w * s.v) * dt; s.x += s.v * dt;
    return Math.abs(s.x - s.t) > 0.002 || Math.abs(s.v) > 0.02;
  };
  const jobs = new Set(); let looping = false, prevT = 0;
  function run(fn) { jobs.add(fn); if (!looping) { looping = true; prevT = performance.now(); requestAnimationFrame(loop); } }
  function loop(now) {
    const dt = Math.max(0, Math.min(0.033, (now - prevT) / 1000)); prevT = now;
    for (const fn of [...jobs]) if (!fn(dt)) jobs.delete(fn);
    if (jobs.size) requestAnimationFrame(loop); else looping = false;
  }

  /* ---------- helpers ---------- */
  const svgEl = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const loadImg = src => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
  const loadScript = src => new Promise((ok, fail) => {
    const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  let uid = 0;

  // hover with a mouse; tap on touch screens
  function hover(item, enter, leave) {
    item.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") enter(e); });
    if (leave) item.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") leave(e); });
    let on = false;
    item.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse") return;
      if (leave) { on = !on; on ? enter(e) : leave(e); } else enter(e);
    });
  }
  // horizontal mouse speed in px per ms
  function mouseSpeed(item, cb) {
    let last = null;
    item.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      const t = performance.now();
      if (last && t - last.t < 100) cb((e.clientX - last.x) / Math.max(8, t - last.t), e, (e.clientY - last.y) / Math.max(8, t - last.t));
      last = { x: e.clientX, y: e.clientY, t };
    });
    item.addEventListener("pointerleave", () => { last = null; });
  }
  const pct = (p, size) => `${(p[0] / size[0] * 100).toFixed(3)}% ${(p[1] / size[1] * 100).toFixed(3)}%`;

  // the still drawing that sits in the div; animated objects draw on a layer above it
  function restImage(item, file) {
    let img = item.querySelector(":scope > img.ea-rest");
    if (!img) {
      img = document.createElement("img");
      img.className = "ea-rest"; img.alt = item.getAttribute("aria-label") || ""; img.decoding = "async";
      img.src = IMG(file);
      item.prepend(img);
    }
    return img;
  }
  function overlay(item) {
    const d = document.createElement("div"); d.className = "ea-layer"; item.appendChild(d); return d;
  }
  function svgStage(item, name) {
    const [w, h] = SIZE[name];
    const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}`, "aria-hidden": "true" }, overlay(item));
    const layer = (id, parent = svg) => {
      const [x, y, lw, lh] = LAYERS[name][id];
      const g = svgEl("g", {}, parent);
      svgEl("image", { href: IMG(id), x, y, width: lw, height: lh }, g);
      return g;
    };
    return { svg, layer, w, h };
  }
  // show the animated layer only once all its pictures are loaded, so nothing flickers
  function swapWhenLoaded(item, rest, files) {
    return Promise.all(files.map(f => loadImg(IMG(f)))).then(() => {
      rest.style.visibility = "hidden"; item.classList.add("ea-ready");
    });
  }

  /* =====================================================================
     Objects
     ===================================================================== */
  const INIT = {};

  /* ---------- boxes that lean on a bottom corner and drop back ---------- */
  for (const name of ["box-small", "box-long", "box-office", "box-fragile"]) {
    INIT[name] = item => {
      const img = restImage(item, name), C = CORNERS[name], F = FEEL[name], S = SIZE[name];
      let th = 0, w = 0, side = 1, running = false;
      const thud = speed => {
        const s = Math.min(1, speed / 120) * M;
        if (s < 0.08 || !img.animate) return;
        img.animate([
          { transform: "translateY(0) scale(1,1)" },
          { transform: `translateY(${(s * 1.2).toFixed(2)}%) scale(${1 + 0.012 * s},${1 - 0.02 * s})`, offset: 0.35 },
          { transform: "translateY(0) scale(1,1)" }
        ], { duration: 180, easing: "ease-out", composite: "add" });
      };
      const tick = dt => {
        w -= F.g * dt; th += w * dt;
        if (th <= 0 && w <= 0) {
          const hit = -w; th = 0;
          if (hit > 25) { w = hit * 0.3; thud(hit); }          // a small bounce on landing
          else { w = 0; img.style.transform = ""; running = false; return false; }
        }
        img.style.transform = `rotate(${(side * th).toFixed(3)}deg)`;
        return true;
      };
      const tip = (dir, speed) => {
        if (th > 1.2) return;                                   // let it come down before the next push
        if (th < 0.01) { side = dir; img.style.transformOrigin = pct(side > 0 ? C.R : C.L, S); }
        const maxTh = F.tilt * M;
        const target = Math.min(maxTh, maxTh * (0.35 + speed * 0.55));
        w = Math.sqrt(2 * F.g * target);                        // just enough spin to reach that angle, then gravity
        if (!running) { running = true; run(tick); }
      };
      mouseSpeed(item, v => { if (Math.abs(v) > 0.12) tip(Math.sign(v), Math.abs(v)); });
      item.addEventListener("pointerdown", e => {
        if (e.pointerType === "mouse") return;
        const r = item.getBoundingClientRect();
        tip(e.clientX < r.left + r.width / 2 ? 1 : -1, 1.2);
      });
    };
  }

  /* ---------- box that jumps and does a flip ---------- */
  INIT["box-flip"] = item => {
    const img = restImage(item, "box-flip");
    img.style.transformOrigin = "50% 50%";
    let busy = false;
    const flip = dir => {
      if (busy || !img.animate) return; busy = true;
      const r = d => `rotate(${dir * d}deg)`;
      const a = img.animate([
        { offset: 0, transform: `translateY(0) ${r(0)} scale(1,1)` },
        { offset: 0.14, transform: `translateY(7%) ${r(0)} scale(1.1,.86)`, easing: "cubic-bezier(.2,.7,.3,1)" },
        { offset: 0.32, transform: `translateY(${-70 * M}%) ${r(110 * M)} scale(.95,1.06)` },
        { offset: 0.5, transform: `translateY(${-100 * M}%) ${r(200 * M)} scale(1,1)`, easing: "cubic-bezier(.5,0,.8,.4)" },
        { offset: 0.74, transform: `translateY(0) ${r(360 * M)} scale(1,1)` },
        { offset: 0.82, transform: `translateY(6%) ${r(360 * M)} scale(1.09,.88)` },
        { offset: 0.91, transform: `translateY(-5%) ${r(360 * M)} scale(.98,1.03)` },
        { offset: 1, transform: `translateY(0) ${r(360 * M)} scale(1,1)` }
      ], { duration: 1150, easing: "linear" });
      a.onfinish = () => { busy = false; };
    };
    const side = e => { const r = item.getBoundingClientRect(); return e.clientX < r.left + r.width / 2 ? 1 : -1; };
    hover(item, e => flip(side(e)));
  };

  /* ---------- tree: heavy, slow sway from its base ---------- */
  INIT.tree = item => {
    const img = restImage(item, "tree");
    img.style.transformOrigin = pct([247, 572], SIZE.tree);
    const s = spring(2.4, 0.3);
    const tick = dt => {
      const a = step(s, dt); s.x = Math.max(-6, Math.min(6, s.x));
      img.style.transform = Math.abs(s.x) > 0.01 ? `rotate(${s.x.toFixed(2)}deg)` : "";
      return a;
    };
    mouseSpeed(item, v => { s.v = Math.max(-16, Math.min(16, s.v + v * 9 * M)); run(tick); });
    item.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") { s.v += 14 * M; run(tick); } });
  };

  /* ---------- cocktail glass: leans on the edge of its base and drops back ---------- */
  INIT.glass = item => {
    const img = restImage(item, "glass"), L = [17, 380], R = [192, 380];
    let th = 0, w = 0, side = 1, running = false;
    const G = 520;
    const tick = dt => {
      w -= G * dt; th += w * dt;
      if (th <= 0 && w <= 0) {
        const hit = -w; th = 0;
        if (hit > 25) w = hit * 0.3;
        else { w = 0; img.style.transform = ""; running = false; return false; }
      }
      img.style.transform = `rotate(${(side * th).toFixed(2)}deg)`;
      return true;
    };
    const tip = (dir, speed) => {
      if (th > 1.5) return;
      if (th < 0.01) { side = dir; img.style.transformOrigin = pct(side > 0 ? R : L, SIZE.glass); }
      const target = Math.min(14, 14 * (0.35 + speed * 0.55)) * M;
      w = Math.sqrt(2 * G * target);
      if (!running) { running = true; run(tick); }
    };
    mouseSpeed(item, v => { if (Math.abs(v) > 0.12) tip(Math.sign(v), Math.abs(v)); });
    item.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") tip(1, 1.2); });
  };

  /* ---------- red and blue beacon, turning clockwise ---------- */
  function beacon(img, canvas, scale, opts) {
    const W = Math.round(img.naturalWidth * scale), H = Math.round(img.naturalHeight * scale);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H);
    const orig = ctx.getImageData(0, 0, W, H), frame = ctx.createImageData(W, H), d = orig.data;
    const RED = [219, 74, 43], BLUE = [74, 151, 232];
    const px = [], rows = new Map();
    const maxY = opts.maxY ? Math.round(opts.maxY * H) : H;
    for (let y = 0; y < maxY; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
      if (a < 20) continue;
      let t = -1;
      if (r > 40 && r > 2 * g + 10 && r > 2.4 * b) t = Math.min(1, r / RED[0]);
      else if (opts.blue && b > 40 && b > r + 30 && r / b > 0.24 && g / b > 0.55 && g / b < 0.8) t = Math.min(1, b / BLUE[2]);
      if (t < 0.15) continue;
      px.push(x, y, i, t);
      const R = rows.get(y) || [x, x]; R[0] = Math.min(R[0], x); R[1] = Math.max(R[1], x); rows.set(y, R);
    }
    // the drawn middle line is painted over; the turning draws its own
    const edge = Math.round(opts.edge * scale);
    if (opts.blue) for (const [y, R] of rows) for (let x = R[0] + edge; x <= R[1] - edge; x++) {
      const i = (y * W + x) * 4; if (d[i + 3] > 20) px.push(x, y, i, 1);
    }
    const N = px.length / 4, ang = new Float32Array(N);
    for (let k = 0; k < N; k++) {
      const x = px[k * 4], y = px[k * 4 + 1], R = rows.get(y);
      const cx = (R[0] + R[1]) / 2, hw = Math.max(1, (R[1] - R[0]) / 2);
      ang[k] = Math.asin(Math.max(-1, Math.min(1, (x - cx) / hw)));
    }
    const lineW = opts.line * scale;
    let phase = opts.rest, spinning = false, stopping = false;
    const draw = () => {
      frame.data.set(d);
      const f = frame.data;
      for (let k = 0; k < N; k++) {
        const x = px[k * 4], y = px[k * 4 + 1], i = px[k * 4 + 2], t = px[k * 4 + 3], R = rows.get(y);
        const cx = (R[0] + R[1]) / 2, hw = Math.max(1, (R[1] - R[0]) / 2);
        let dark = false;
        for (const ab of [-phase, Math.PI - phase]) {
          const a = Math.atan2(Math.sin(ab), Math.cos(ab));
          if (Math.abs(a) <= Math.PI / 2 && Math.abs(x - (cx + Math.sin(a) * hw)) < lineW) dark = true;
        }
        const C = dark ? [20, 20, 20] : (Math.sin(ang[k] + phase) < 0 ? RED : BLUE), m = dark ? 1 : t;
        f[i] = C[0] * m; f[i + 1] = C[1] * m; f[i + 2] = C[2] * m;
      }
      ctx.putImageData(frame, 0, 0);
    };
    const TWO = Math.PI * 2, speed = TWO * 1.1 * (reduce ? 0.4 : 1);
    const tick = dt => {
      const before = phase; phase += speed * dt;
      if (stopping) {
        const target = opts.rest + Math.ceil((before - opts.rest) / TWO - 1e-6) * TWO;
        if (phase >= target) { phase = opts.rest; spinning = false; stopping = false; ctx.putImageData(orig, 0, 0); return false; }
      }
      draw(); return true;
    };
    return {
      start() { stopping = false; if (!spinning) { spinning = true; run(tick); } },
      stop() { if (spinning) stopping = true; }
    };
  }
  function beaconCanvas(item, name) {
    const rest = restImage(item, name);
    const cv = document.createElement("canvas"); cv.setAttribute("aria-hidden", "true");
    overlay(item).appendChild(cv);
    // draw at about the size it is shown on screen, never above the file's own size
    const shown = (item.clientWidth || 200) * (window.devicePixelRatio || 1) * 1.15;
    const scale = Math.max(0.25, Math.min(1, shown / SIZE[name][0]));
    return loadImg(IMG(name)).then(img => {
      rest.style.visibility = "hidden"; item.classList.add("ea-ready");
      return { cv, img, scale };
    });
  }

  INIT.siren = item => {
    beaconCanvas(item, "siren").then(({ cv, img, scale }) => {
      const b = beacon(img, cv, scale, { blue: true, edge: 14, line: 4.4, rest: 0 });
      hover(item, () => b.start(), () => b.stop());
    }).catch(() => {});
  };

  /* ---------- police car: brakes (nose dips and settles), beacon turns on ---------- */
  INIT.car = item => {
    beaconCanvas(item, "car").then(({ cv, img, scale }) => {
      const S = SIZE.car;
      cv.style.transformOrigin = pct([378, 550], S);
      const b = beacon(img, cv, scale, { blue: false, edge: 0, line: 2.7, rest: Math.PI * 1.5, maxY: 0.3 });
      const tilt = spring(9, 0.32), slide = spring(9, 0.45);
      hover(item, () => {
        b.start();
        tilt.v = -42 * M; slide.v = -40 * M;
        run(dt => {
          const a = step(tilt, dt), c = step(slide, dt);
          cv.style.transform = `translateX(${(slide.x / S[0] * 100).toFixed(3)}%) rotate(${tilt.x.toFixed(2)}deg)`;
          return a || c;
        });
      }, () => b.stop());
    }).catch(() => {});
  };

  /* ---------- FIRE sign: the sun flickers ---------- */
  INIT.fire = item => {
    const rest = restImage(item, "fire-rest");
    const { layer } = svgStage(item, "fire");
    const sun = layer("fire-sun"); layer("fire-sign");
    swapWhenLoaded(item, rest, ["fire-sun", "fire-sign"]).catch(() => {});
    const C = [684, 674];
    let on = false, t = 0, amp = 0;
    const tick = dt => {
      t += dt; amp += ((on ? 1 : 0) - amp) * Math.min(1, dt * 10);
      const pulse = Math.abs(Math.sin(t * Math.PI * 4.2)) * 0.13 + Math.sin(t * 23) * 0.02;
      const s = 1 + pulse * amp * M;
      sun.setAttribute("transform", `translate(${C[0]} ${C[1]}) scale(${s.toFixed(4)}) translate(${-C[0]} ${-C[1]})`);
      if (!on && amp < 0.01) { sun.removeAttribute("transform"); return false; }
      return true;
    };
    hover(item, () => { on = true; run(tick); }, () => { on = false; });
  };

  /* ---------- gift building: hops, the bow keeps swinging ---------- */
  INIT.gift = item => {
    const rest = restImage(item, "gift-rest");
    const { svg, layer } = svgStage(item, "gift");
    const all = svgEl("g", {}, svg);
    layer("gift-body", all); const bow = layer("gift-bow", all);
    swapWhenLoaded(item, rest, ["gift-body", "gift-bow"]).catch(() => {});
    const K = [696, 267], B = [722, 1804];
    const swing = spring(7, 0.16);
    const keys = [[0, 0, 1, 1], [0.12, 0, 1.05, 0.93], [0.3, -150, 0.97, 1.04], [0.48, 0, 1, 1], [0.56, 0, 1.04, 0.95], [0.68, 0, 1, 1]];
    let busy = false;
    hover(item, () => {
      if (busy) return; busy = true;
      const T0 = performance.now();
      swing.v = 70 * M;
      run(() => {
        const t = (performance.now() - T0) / 1000;
        const k = keys.findIndex(q => q[0] > t);
        let y = 0, sx = 1, sy = 1;
        if (k > 0) {
          const a = keys[k - 1], b = keys[k], u = (t - a[0]) / (b[0] - a[0]);
          const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
          y = a[1] + (b[1] - a[1]) * e; sx = a[2] + (b[2] - a[2]) * e; sy = a[3] + (b[3] - a[3]) * e;
        }
        if (k === 4) swing.v += 3;                               // landing nudges the bow again
        all.setAttribute("transform", `translate(0 ${(y * M).toFixed(1)}) translate(${B[0]} ${B[1]}) scale(${1 + (sx - 1) * M} ${1 + (sy - 1) * M}) translate(${-B[0]} ${-B[1]})`);
        const a = step(swing, 1 / 60);
        bow.setAttribute("transform", `rotate(${swing.x.toFixed(2)} ${K[0]} ${K[1]})`);
        const done = k === -1 && !a;
        if (done) { busy = false; all.removeAttribute("transform"); bow.removeAttribute("transform"); }
        return !done;
      });
    });
  };

  /* ---------- lamp: the spider drops on its thread, the web strands give a little ---------- */
  INIT.lamp = item => {
    const rest = restImage(item, "lamp-rest");
    const { svg, layer } = svgStage(item, "lamp");
    // the thread starts inside the lampshade, so it is drawn first and the lamp covers its top
    const thread = svgEl("line", { x1: 1699, y1: 1200, x2: 1699, y2: 1735, stroke: "rgb(181,201,223)", "stroke-width": 9, "stroke-linecap": "round" }, svg);
    layer("lamp-body");
    // the web strands are cut into thin vertical strips so their middle can sag while their ends stay put
    const [wx, wy, ww, wh] = LAYERS.lamp["lamp-web"], N = 64, strips = [], defs = svgEl("defs", {}, svg), id = `ea-web-${++uid}`;
    for (let k = 0; k < N; k++) {
      const x = wx + ww * k / N;
      svgEl("rect", { x, y: wy - 60, width: ww / N + 0.6, height: wh + 120 }, svgEl("clipPath", { id: `${id}-${k}` }, defs));
      const inner = svgEl("g", {}, svgEl("g", { "clip-path": `url(#${id}-${k})` }, svg));
      svgEl("image", { href: IMG("lamp-web"), x: wx, y: wy, width: ww, height: wh }, inner);
      strips.push({ inner, w: Math.sin(Math.PI * Math.min(1, Math.max(0, ((k + 0.5) / N - 0.01) / 0.98))) });
    }
    const spider = layer("lamp-spider");
    swapWhenLoaded(item, rest, ["lamp-body", "lamp-web", "lamp-spider"]).catch(() => {});

    const web = { x: 0, y: 0, vx: 0, vy: 0 };
    const webTick = dt => {
      const w = 4.2, z = 0.2;
      web.vx += (-w * w * web.x - 2 * z * w * web.vx) * dt; web.vy += (-w * w * web.y - 2 * z * w * web.vy) * dt;
      web.x += web.vx * dt; web.y += web.vy * dt;
      const r = Math.hypot(web.x, web.y); if (r > 34) { web.x *= 34 / r; web.y *= 34 / r; }
      for (const S of strips) S.inner.setAttribute("transform", `translate(${(web.x * S.w).toFixed(2)} ${(web.y * S.w).toFixed(2)})`);
      return r > 0.05 || Math.hypot(web.vx, web.vy) > 0.3;
    };
    mouseSpeed(item, v => {
      const k = SIZE.lamp[0] / (svg.getBoundingClientRect().width || 1);
      web.vx = Math.max(-140, Math.min(140, web.vx + v * k * 0.9 * M));
      web.vy = Math.max(-90, Math.min(90, web.vy + Math.abs(v) * k * 0.35 * M));
      run(webTick);
    });

    const drop = spring(6.5, 0.22);
    const tick = dt => {
      const a = step(drop, dt);
      spider.setAttribute("transform", `translate(0 ${drop.x.toFixed(1)})`);
      thread.setAttribute("y2", (1735 + drop.x).toFixed(1));
      return a;
    };
    hover(item,
      () => { drop.w = 6.5; drop.z = 0.22; drop.t = 380 * M; run(tick); },
      () => { drop.w = 3.2; drop.z = 1.0; drop.t = 0; run(tick); });      // climbs back up slowly
  };

  /* ---------- tape dispenser: the tape slides out of the slot, waits, goes back in ---------- */
  INIT.tape = item => {
    const rest = restImage(item, "tape-rest");
    const { svg, layer } = svgStage(item, "tape");
    layer("tape-body");
    const [tx, ty] = LAYERS.tape["tape-tongue"];
    const s1 = [tx + 11, ty + 22], s2 = [tx + 262, ty + 13];             // the slot's edge
    const ax = [112.5, 348.5];                                              // direction the tape comes out
    const id = `ea-slot-${++uid}`;
    svgEl("polygon", {
      points: [s1, s2, [s2[0] + ax[0] * 9, s2[1] + ax[1] * 9], [s1[0] + ax[0] * 9, s1[1] + ax[1] * 9]].map(p => p.join(",")).join(" ")
    }, svgEl("clipPath", { id }, svgEl("defs", {}, svg)));
    const tongue = layer("tape-tongue", svgEl("g", { "clip-path": `url(#${id})` }, svg));
    const place = out => tongue.setAttribute("transform", `translate(${(-ax[0] * (1 - out)).toFixed(1)} ${(-ax[1] * (1 - out)).toFixed(1)})`);
    place(0);
    swapWhenLoaded(item, rest, ["tape-body", "tape-tongue"]).catch(() => {});
    let busy = false;
    hover(item, () => {
      if (busy) return; busy = true;
      const T0 = performance.now(), reach = M;
      run(() => {
        const t = (performance.now() - T0) / 1000;
        let out;
        if (t < 0.22) out = 1 - (1 - t / 0.22) ** 3;                      // slides out
        else if (t < 0.85) out = 1;                                       // stays out, still
        else if (t < 1.15) { const u = (t - 0.85) / 0.3; out = 1 - u * u; } // pulled back in
        else { place(0); busy = false; return false; }
        place(out * reach);
        return true;
      });
    });
  };

  /* ---------- axe: shudders as if it just landed ---------- */
  INIT.axe = item => {
    const rest = restImage(item, "axe-rest");
    const { layer } = svgStage(item, "axe");
    layer("axe-box"); const axe = layer("axe-axe");
    swapWhenLoaded(item, rest, ["axe-box", "axe-axe"]).catch(() => {});
    const P = [203, 241];
    let T0 = 0, on = false;
    hover(item, () => {
      T0 = performance.now(); if (on) return; on = true;
      run(() => {
        const t = (performance.now() - T0) / 1000;
        if (t > 0.9) { axe.removeAttribute("transform"); on = false; return false; }
        const a = 5 * M * Math.exp(-t / 0.22) * Math.sin(t * Math.PI * 2 * 13);
        axe.setAttribute("transform", `rotate(${a.toFixed(2)} ${P[0]} ${P[1]})`);
        return true;
      });
    });
  };

  /* ---------- chandelier: each crystal drop swings, the bead chains give as one rope ---------- */
  let lottieReady = null;
  INIT.chandelier = item => {
    const rest = restImage(item, "chandelier-rest");
    if (!lottieReady) {
      lottieReady = Promise.all([
        window.lottie ? Promise.resolve() : loadScript(LOTTIE_URL),
        window.EA_CHANDELIER_DATA ? Promise.resolve() : loadScript(`${BASE}chandelier.data.js`)
      ]);
    }
    lottieReady.then(() => {
      const DATA = window.EA_CHANDELIER_DATA, box = overlay(item);
      const anim = window.lottie.loadAnimation({
        container: box, renderer: "svg", loop: false, autoplay: false, animationData: DATA,
        rendererSettings: { preserveAspectRatio: "xMidYMid meet" }
      });
      anim.addEventListener("DOMLoaded", () => setup(anim, box, DATA));
    }).catch(() => {});                                                    // without the player, the still drawing stays

    function wrapChildren(el) {
      const g = document.createElementNS(NS, "g");
      while (el.firstChild) g.appendChild(el.firstChild);
      el.appendChild(g);
      return g;
    }
    function setup(anim, box, DATA) {
      anim.goToAndStop(46, true);                                        // the frame where all drops hang still
      const svg = box.querySelector("svg");
      svg.setAttribute("aria-hidden", "true");
      // fit the drawing to the div exactly like the still image (the animation file has extra room around it)
      const root = svg.querySelector(":scope > g");
      const bb = root.getBBox();
      svg.setAttribute("viewBox", `${bb.x} ${bb.y} ${bb.width} ${bb.height}`);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.style.width = "100%"; svg.style.height = "100%";
      rest.style.visibility = "hidden"; item.classList.add("ea-ready");

      const byLn = ln => box.querySelector(`[id="${ln}"]`);
      const drops = [], chains = [];
      for (const L of DATA.layers) {
        const el = byLn(L.ln);
        if (!el) continue;
        if (L.nm.startsWith("טיפה")) {
          const g = wrapChildren(el), b = g.getBBox();
          drops.push({ host: el, g, px: b.x + b.width / 2, py: b.y + 2, a: 0, v: 0,
            w: 7.0 * (0.9 + Math.random() * 0.2), z: 0.2 + Math.random() * 0.06 });
        } else if (L.nm.startsWith("חוט")) {
          const parents = [...new Set([...el.querySelectorAll("path")].map(p => p.parentNode))];
          const rootInv = svg.getScreenCTM().inverse();
          const beads = parents.map(p => {
            const g = wrapChildren(p);
            const Mx = rootInv.multiply(g.getScreenCTM()), I = Mx.inverse(), b = g.getBBox();
            const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
            return { g, I: [I.a, I.b, I.c, I.d], x: Mx.a * cx + Mx.c * cy + Mx.e, y: Mx.b * cx + Mx.d * cy + Mx.f };
          });
          if (!beads.length) continue;
          let A = beads[0], B = beads[0], far = -1;
          for (const p of beads) for (const q of beads) {
            const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2; if (d > far) { far = d; A = p; B = q; }
          }
          const ax = B.x - A.x, ay = B.y - A.y, len2 = ax * ax + ay * ay || 1;
          let cx = 0, cy = 0;
          for (const b of beads) {
            const s = Math.max(0, Math.min(1, ((b.x - A.x) * ax + (b.y - A.y) * ay) / len2));
            b.w = Math.sin(Math.PI * s); cx += b.x; cy += b.y;
          }
          chains.push({ beads, cx: cx / beads.length, cy: cy / beads.length, x: 0, y: 0, vx: 0, vy: 0 });
        }
      }

      const toScreen = (m, x, y) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
      let running = false;
      const tick = dt => {
        let alive = false;
        for (const d of drops) {
          d.v += (-d.w * d.w * d.a - 2 * d.z * d.w * d.v) * dt; d.a += d.v * dt;
          d.a = Math.max(-35, Math.min(35, d.a));
          if (Math.abs(d.a) > 0.05 || Math.abs(d.v) > 0.5) alive = true;
          d.g.setAttribute("transform", `rotate(${d.a.toFixed(2)} ${d.px.toFixed(1)} ${d.py.toFixed(1)})`);
        }
        for (const c of chains) {
          const w = 5.2, z = 0.17;
          c.vx += (-w * w * c.x - 2 * z * w * c.vx) * dt; c.vy += (-w * w * c.y - 2 * z * w * c.vy) * dt;
          c.x += c.vx * dt; c.y += c.vy * dt;
          const r = Math.hypot(c.x, c.y); if (r > 9) { c.x *= 9 / r; c.y *= 9 / r; }
          if (r > 0.02 || Math.hypot(c.vx, c.vy) > 0.2) alive = true;
          for (const b of c.beads) {
            const X = c.x * b.w, Y = c.y * b.w;
            b.g.setAttribute("transform", `translate(${(b.I[0] * X + b.I[2] * Y).toFixed(2)} ${(b.I[1] * X + b.I[3] * Y).toFixed(2)})`);
          }
        }
        if (!alive) {
          drops.forEach(d => { d.a = d.v = 0; d.g.removeAttribute("transform"); });
          chains.forEach(c => { c.x = c.y = c.vx = c.vy = 0; c.beads.forEach(b => b.g.removeAttribute("transform")); });
          running = false;
        }
        return alive;
      };
      const push = (x, y, vx, vy) => {
        const rect = svg.getBoundingClientRect(), R = rect.width * 0.2;
        for (const d of drops) {
          const m = d.host.getScreenCTM(); if (!m) continue;
          const p = toScreen(m, d.px, d.py + 20);
          const f = Math.exp(-((Math.hypot(p.x - x, p.y - y) / R) ** 2));
          d.v = Math.max(-260, Math.min(260, d.v - vx * f * 55 * M));
        }
        const m = svg.getScreenCTM();
        const scale = rect.width / (svg.viewBox.baseVal.width || DATA.w);
        for (const c of chains) {
          const p = toScreen(m, c.cx, c.cy);
          const f = Math.exp(-((Math.hypot(p.x - x, p.y - y) / (R * 1.3)) ** 2));
          const g = f * 7 * M / scale;
          c.vx = Math.max(-60, Math.min(60, c.vx + vx * g));
          c.vy = Math.max(-40, Math.min(40, c.vy + vy * g * 0.5));
        }
        if (!running) { running = true; run(tick); }
      };
      mouseSpeed(item, (vx, e, vy) => push(e.clientX, e.clientY, vx, vy));
      item.addEventListener("pointerdown", e => {
        if (e.pointerType === "mouse") return;
        const dir = Math.random() < 0.5 ? -1 : 1;
        for (let i = 0; i < 6; i++) push(e.clientX, e.clientY, dir * 1.2, 0.4);
      });
    }
  };

  /* ---------- start ---------- */
  function init() {
    document.querySelectorAll("[data-ea]").forEach(item => {
      if (item.dataset.eaInit) return;
      const fn = INIT[item.dataset.ea];
      if (!fn) { console.warn(`elements-anim: unknown object "${item.dataset.ea}"`); return; }
      item.dataset.eaInit = "1";
      item.classList.add("ea-item");
      if (getComputedStyle(item).position === "static") item.style.position = "relative";
      fn(item);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.ElementsAnim = { init };
})();
