# Elements animation – integration instructions

A self-contained module that adds hover animations to the 15 illustrated objects
on the project page of "The Perfect Crime". Plain HTML/CSS/JS, no build step, no
dependencies except the Lottie player (loaded from cdnjs only when the chandelier is on the page).

## What is in this folder

```
elements-anim/
  INSTRUCTIONS.md        this file
  elements-anim.js       all animations (one file)
  elements-anim.css      sizing rules for the objects
  chandelier.data.js     the chandelier animation exported from After Effects (Lottie)
  demo.html              test page with every object – for checking only, do not link it from the site
  img/                   all drawings (transparent PNG, high resolution)
```

## How it works

Every object on the page is one empty div:

```html
<div data-ea="tree" aria-label="Blue tree"></div>
```

The script finds every `[data-ea]` element, inserts the drawing and attaches the
animation. The div's **width** sets the size; the height comes from the drawing's
aspect ratio (set in `elements-anim.css`). Do not put an `<img>` inside, and do not
set a height.

The 15 names (`data-ea` values), matching the layer names in the Figma frame `elements-board`:

| data-ea | object | what happens on hover |
|---|---|---|
| `chandelier` | light-blue chandelier | crystal drops swing toward the mouse, bead chains give as one rope |
| `box-flip` | small box (top row) | jumps, does a full flip, lands |
| `box-small` | small box (bottom row) | leans on a bottom corner in the mouse direction, drops back |
| `box-long` | long box with CE mark | leans on a bottom corner, drops back |
| `box-office` | OFFICE box | leans on a bottom corner, drops back |
| `box-fragile` | FRAGILE box | leans on a bottom corner, drops back |
| `tree` | blue tree | slow, heavy sway from the base |
| `car` | police car | brakes (nose dips and settles), the beacon turns red/blue |
| `siren` | red/blue beacon | turns clockwise while hovered |
| `fire` | FIRE sign | the sun behind the globe flickers |
| `gift` | gift-wrapped building | small hop, the bow keeps swinging |
| `lamp` | hanging lamp | the spider drops on its thread; the curved web strands give a little |
| `glass` | cocktail glass | leans on the edge of its base, drops back |
| `tape` | high-heel tape dispenser | the tape slides out of the slot, waits, goes back in |
| `axe` | box with an axe | the axe shudders as if it just landed |

On touch screens, a tap triggers the animation. `prefers-reduced-motion` is respected.

## Steps

1. **Copy the folder** `elements-anim/` as-is into the project root (next to `index.html`).
   Keep the folder name lowercase and keep `img/` inside it. The script finds its images
   relative to its own location, so no paths need to be changed.

2. **On the project page of "The Perfect Crime"**, add:
   - in `<head>`: `<link rel="stylesheet" href="elements-anim/elements-anim.css">`
   - before `</body>`: `<script src="elements-anim/elements-anim.js" defer></script>`
   (Adjust the relative path if the page is not in the project root.)

3. **Build the board from the Figma frame `elements-board`:**
   - One container with `position: relative` and the frame's aspect ratio
     (`aspect-ratio: <frame width> / <frame height>`; width as the design requires).
   - For each layer in the frame, one `<div data-ea="<layer name>" aria-label="...">` with
     `position: absolute` and `left`, `top`, `width` as **percentages of the frame**
     (from the layer's x, y, width in Figma). No height.
   - Keep the Figma layer order (later in the HTML = on top).
   - Use the drawings from this folder, not images exported from Figma. The animation code
     depends on these exact files.
   - If a Figma layer name does not match a `data-ea` name exactly, match it by the
     table above.

4. **Nothing may clip the objects.** Several animations go outside their own box (the flip
   jumps about one box-height up, the spider drops below the lamp, boxes tip sideways, the
   tape slides down). The board and its parents must not use `overflow: hidden` near it,
   and leave some space below the lamp.

5. **Mobile:** if Figma has a mobile version of the frame, build it the same way (media query
   or a second set of positions). Otherwise the percentage layout simply scales down.

6. **External script:** the chandelier loads the Lottie player from
   `https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js`. If the project
   rules (CLAUDE.md) do not allow external scripts, download that file into
   `elements-anim/vendor/lottie.min.js` and change the `LOTTIE_URL` constant at the top of
   `elements-anim.js` to `` `${BASE}vendor/lottie.min.js` ``. If the player does not load, the
   chandelier still shows as a still drawing.

7. **Check:** run a local server, open `elements-anim/demo.html` and hover every object;
   then do the same on the project page. Also check a narrow (phone) width.

8. **Do not change the numbers in `elements-anim.js`.** They are points measured on each
   drawing (pivot corners, the tape slot, the spider's thread). If the drawings are replaced,
   the designer will send an updated package.

9. Show the result to the designer before committing and pushing (Vercel deploys `main`
   automatically).
