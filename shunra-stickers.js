/* Shunra stickers — pick up, move anywhere on the page, put down.
   Usage: put the sticker <img> elements, absolutely positioned (left/top/width), inside a container
   with position:relative, give each one class="shunra-sticker", then call initShunraStickers(container).
   Their starting places are read from where they sit in the container.
   Mouse: press and hold (or press and drag) picks a sticker up. Touch: long press picks it up.
   Touch: a quick swipe that starts on a sticker scrolls the page, as anywhere else.
   While held it grows a little. Drop it anywhere on the page, over anything: it shrinks back and stays there.
   The stickers live in their own layer on top of everything else in the grid area (.full-project-grid),
   so they scroll with it (on desktop only the grid area scrolls, on mobile the whole page does).
   They keep their place relative to the container when the window is resized. No shadow, no fold.
   Mouse hover: the sticker grows a little (less than when it is lifted). Not while dragging, not on touch.
   Entrance: the first time the stickers come into view, each one starts a bit bigger and shrinks to its size,
   one after the other, as if it was being stuck on. Once per page load, and not with reduced motion. */
function initShunraStickers(root){
  const HOLD_MOUSE=110, HOLD_TOUCH=300, LIFT=1.08;
  const HOVER=1.04, HOVER_MS=200;                      // mouse hover: a little smaller than the lift
  const ENTER=1.12, ENTER_MS=500, ENTER_GAP=80;        // entrance: start size, length, delay between stickers
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css=document.createElement('style');
  css.textContent=`#shunra-sticker-layer{position:absolute;left:0;top:0;width:0;height:0;z-index:990;pointer-events:none}
  .stk{position:absolute;pointer-events:auto;touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:grab;transform-origin:50% 50%}
  .stk img{display:block;width:100%;height:auto;max-width:none;pointer-events:none;-webkit-user-drag:none;user-select:none}
  .stk.up{cursor:grabbing;z-index:2}
  html.stk-dragging,html.stk-dragging *{cursor:grabbing!important;user-select:none!important;-webkit-user-select:none!important}`;
  document.head.appendChild(css);
  // the area the stickers live in and can be dragged over: the grid of the project page (the page itself if there is none)
  const panel=root.closest('.full-project-panel');
  const area=(panel&&panel.querySelector('.full-project-grid'))||document.body;
  let layer=document.getElementById('shunra-sticker-layer');
  if(!layer){layer=document.createElement('div');layer.id='shunra-sticker-layer';area.appendChild(layer)}
  const items=[];

  // everything is measured from the area's top-left corner, so it stays right whatever scrolls
  function areaBox(){const r=area.getBoundingClientRect();return{x:r.left,y:r.top,w:area.offsetWidth,h:area.offsetHeight}}
  function rootBox(){const r=root.getBoundingClientRect(),a=areaBox();return{x:r.left-a.x,y:r.top-a.y,w:r.width}}
  // positions are kept as fractions of the container's width, measured from its top-left corner
  function place(it){const b=rootBox();it.el.style.left=(b.x+it.fx*b.w)+'px';it.el.style.top=(b.y+it.fy*b.w)+'px';it.el.style.width=(it.fw*b.w)+'px'}
  function placeAll(){items.forEach(it=>{if(it!==heldItem())place(it)})}

  function setup(){
    const b=rootBox();
    root.querySelectorAll('img.shunra-sticker').forEach(img=>{
      const r=img.getBoundingClientRect();
      const el=document.createElement('div');el.className='stk';el.dataset.sticker=img.getAttribute('src'); // the file decides the rotation (styles.css)
      const a=areaBox();
      const it={el,img,fx:(r.left-a.x-b.x)/b.w,fy:(r.top-a.y-b.y)/b.w,fw:r.width/b.w,s:1,anim:null};
      img.removeAttribute('style');img.classList.remove('shunra-sticker');el.appendChild(img);layer.appendChild(el);
      el.addEventListener('pointerdown',e=>down(e,it));
      // touch: a swipe over a sticker scrolls the page as usual. Only a lifted sticker stops the scroll
      el.addEventListener('touchmove',e=>{if(held&&held.up&&held.it===it)e.preventDefault()},{passive:false});
      el.addEventListener('pointerenter',e=>hover(e,it,true));
      el.addEventListener('pointerleave',e=>hover(e,it,false));
      if(!reduce){it.waiting=true;setScale(it,ENTER)}    // waits, a bit bigger, for its entrance
      items.push(it);place(it);
    });
    if(!reduce)watchEntrance();
    addEventListener('resize',placeAll);
    if(window.ResizeObserver){const ro=new ResizeObserver(placeAll);ro.observe(root);ro.observe(document.body)}
  }
  // wait until images and layout have settled, so the starting places are read correctly
  if(document.readyState==='complete')setup();else addEventListener('load',setup,{once:true});

  // entrance: once, the first time the stickers come into view, one after the other
  function watchEntrance(){
    const start=()=>items.forEach((it,i)=>setTimeout(()=>{
      if(!it.waiting||heldItem()===it)return;
      it.waiting=false;animate(it,1,ENTER_MS);
    },i*ENTER_GAP));
    if(!window.IntersectionObserver){start();return}
    const io=new IntersectionObserver(entries=>{
      if(!entries.some(en=>en.isIntersecting))return;
      io.disconnect();start();
    },{threshold:0.2});
    io.observe(root);
  }

  // mouse hover only, and never while a sticker is being held
  function hover(e,it,over){
    if(e.pointerType!=='mouse'||held)return;
    it.waiting=false;
    animate(it,over?HOVER:1,HOVER_MS);
  }

  function setScale(it,s){it.s=s;it.el.style.transform=s===1?'':`scale(${s})`}
  function animate(it,toS,ms,done){
    const s0=it.s,t0=performance.now();if(it.anim)cancelAnimationFrame(it.anim);
    const step=now=>{const t=reduce?1:Math.min(1,(now-t0)/ms),e=1-Math.pow(1-t,3);setScale(it,s0+(toS-s0)*e);
      if(t<1)it.anim=requestAnimationFrame(step);else{it.anim=null;done&&done()}};
    it.anim=requestAnimationFrame(step);
  }

  // the drag is followed on the whole window, so passing over videos, buttons or the page edge never loses it
  let held=null;const heldItem=()=>held&&held.it;
  function down(e,it){
    if(e.button>0||held)return;e.preventDefault();
    it.waiting=false;
    const r=it.el.getBoundingClientRect(),touch=e.pointerType!=='mouse';
    held={it,id:e.pointerId,sx:e.clientX,sy:e.clientY,ox:(e.clientX-r.left)/it.s,oy:(e.clientY-r.top)/it.s,up:false,touch};
    held.timer=setTimeout(lift,touch?HOLD_TOUCH:HOLD_MOUSE);
    addEventListener('pointermove',move,{passive:false});addEventListener('pointerup',end);addEventListener('pointercancel',end);
    addEventListener('blur',end);
    addEventListener('scroll',follow,true);   // scrolling while holding: the sticker stays under the pointer
  }
  function lift(){
    if(!held||held.up)return;held.up=true;const it=held.it;
    layer.appendChild(it.el);it.el.classList.add('up');document.documentElement.classList.add('stk-dragging');
    animate(it,LIFT,220);
  }
  function move(e){
    if(!held||e.pointerId!==held.id)return;
    if(!held.up){
      if(Math.hypot(e.clientX-held.sx,e.clientY-held.sy)>6){
        if(held.touch){end(e);return}        // a finger that moves before the long press is a scroll, not a pick-up
        clearTimeout(held.timer);lift();
      }else return;
    }
    e.preventDefault();
    held.cx=e.clientX;held.cy=e.clientY;
    moveTo(held.cx,held.cy);
  }
  function moveTo(cx,cy){
    const it=held.it,w=it.el.offsetWidth,h=it.el.offsetHeight,a=areaBox();
    let x=cx-a.x-held.ox,y=cy-a.y-held.oy;
    x=Math.max(0,Math.min(a.w-w,x));y=Math.max(0,Math.min(a.h-h,y));     // anywhere in the grid area, never off its edges
    it.el.style.left=x+'px';it.el.style.top=y+'px';
  }
  function follow(){if(held&&held.up&&held.cx!==undefined)moveTo(held.cx,held.cy)}
  function end(e){
    if(!held)return;if(e&&e.pointerId!==undefined&&e.pointerId!==held.id)return;
    const h=held;held=null;clearTimeout(h.timer);
    removeEventListener('pointermove',move);removeEventListener('pointerup',end);removeEventListener('pointercancel',end);removeEventListener('blur',end);
    removeEventListener('scroll',follow,true);
    document.documentElement.classList.remove('stk-dragging');
    if(!h.up)return;
    const it=h.it,b=rootBox();
    it.fx=(parseFloat(it.el.style.left)-b.x)/b.w;it.fy=(parseFloat(it.el.style.top)-b.y)/b.w;   // remember the new place
    // back to its size (or to the hover size, if the mouse is still on it)
    const stillOver=!h.touch&&it.el.matches(':hover');
    animate(it,stillOver?HOVER:1,220,()=>it.el.classList.remove('up'));
  }
}
