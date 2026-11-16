/* Shunra stickers — pick up, move, put down.
   Usage: put the sticker <img> elements, absolutely positioned (left/top/width), inside a container
   with position:relative, give each one class="shunra-sticker", then call initShunraStickers(container).
   Mouse: press and hold (or press and drag) picks a sticker up. Touch: long press picks it up.
   While held it grows a little, as if it came closer. Drop it anywhere inside the container:
   it shrinks back to its size and stays there. No shadow, no fold. */
function initShunraStickers(root){
  const HOLD_MOUSE=110, HOLD_TOUCH=300, LIFT=1.08;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(getComputedStyle(root).position==='static')root.style.position='relative';
  const css=document.createElement('style');
  css.textContent=`.stk{position:absolute;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:grab}
  .stk img{display:block;width:100%;height:auto;max-width:none;pointer-events:none;-webkit-user-drag:none}
  .stk.up{cursor:grabbing;z-index:100}`;
  document.head.appendChild(css);

  root.querySelectorAll('img.shunra-sticker').forEach(img=>{
    const rr=root.getBoundingClientRect(),r=img.getBoundingClientRect();
    const w=document.createElement('div');w.className='stk';
    w.style.left=((r.left-rr.left)/rr.width*100)+'%';w.style.top=((r.top-rr.top)/rr.height*100)+'%';w.style.width=(r.width/rr.width*100)+'%';
    img.parentNode.insertBefore(w,img);img.removeAttribute('style');img.classList.remove('shunra-sticker');w.appendChild(img);
    w._s=1;w.addEventListener('pointerdown',down);
  });

  function setScale(w,s){w._s=s;w.style.transform=s===1?'':`scale(${s})`}
  function animate(w,toS,ms,done){
    const s0=w._s,t0=performance.now();
    if(w._anim)cancelAnimationFrame(w._anim);
    const step=now=>{const t=reduce?1:Math.min(1,(now-t0)/ms),e=1-Math.pow(1-t,3);
      setScale(w,s0+(toS-s0)*e);
      if(t<1)w._anim=requestAnimationFrame(step);else{w._anim=null;done&&done()}};
    w._anim=requestAnimationFrame(step);
  }

  let held=null;
  function down(e){
    const w=e.currentTarget;if(e.button>0)return;
    w.setPointerCapture(e.pointerId);e.preventDefault();
    const r=w.getBoundingClientRect(),touch=e.pointerType!=='mouse';
    held={w,id:e.pointerId,sx:e.clientX,sy:e.clientY,ox:e.clientX-r.left,oy:e.clientY-r.top,up:false,touch};
    held.timer=setTimeout(lift,touch?HOLD_TOUCH:HOLD_MOUSE);
    w.addEventListener('pointermove',move);w.addEventListener('pointerup',up);w.addEventListener('pointercancel',up);
  }
  function lift(){
    if(!held||held.up)return;held.up=true;const w=held.w;
    root.appendChild(w);w.classList.add('up');          // on top of the others
    animate(w,LIFT,220);
  }
  function move(e){
    if(!held||e.pointerId!==held.id)return;
    if(!held.up){ if(!held.touch&&Math.hypot(e.clientX-held.sx,e.clientY-held.sy)>4){clearTimeout(held.timer);lift()} else return }
    const w=held.w,rr=root.getBoundingClientRect();
    let x=e.clientX-rr.left-held.ox,y=e.clientY-rr.top-held.oy;
    x=Math.max(0,Math.min(rr.width-w.offsetWidth,x));y=Math.max(0,Math.min(rr.height-w.offsetHeight,y));   // stays inside the frame
    w.style.left=(x/rr.width*100)+'%';w.style.top=(y/rr.height*100)+'%';
  }
  function up(e){
    if(!held||e.pointerId!==held.id)return;
    const h=held;held=null;clearTimeout(h.timer);const w=h.w;
    w.removeEventListener('pointermove',move);w.removeEventListener('pointerup',up);w.removeEventListener('pointercancel',up);
    if(!h.up)return;
    animate(w,1,220,()=>w.classList.remove('up'));
  }
}
