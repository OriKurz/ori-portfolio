/* Shunra hanging net — interactive canvas.
   Usage: <canvas id="shunra-net"></canvas> inside a box with aspect-ratio 932/381, then initShunraNet(canvasElement).
   Colors: CSS variables --shunra-net (front) and --shunra-net-back (folded side) on the canvas or an ancestor.
   Drawing space is always 932x381 and scales to the canvas size.
   Interactions: hover brushes the threads; press and drag pulls the net — the spot under the hand most, the rest of the body follows more softly with distance; release throws the whole net;
   drag a corner to peel the net off like a blanket (past a third of the width it stays peeled ~2.6s, then lays back). */
function initShunraNet(canvas){

const W=932,H=381,C=28,R=9,SAG=124,BOW=22,WOB=.07,TH=2.1,FRAME=3.6,M=FRAME,SUB=5;
const G=.12, SLACK=1.05;
const cv=canvas,ctx=cv.getContext('2d'),stage=canvas.parentElement;
let homeF=1,peel=null,CORN=[],mode='pull',dragV={x:0,y:0},group=[],start=null,P=[],K=[],ropes=[],cons=[],held=null,ptr=null,prevPtr=null,lastCut=0;
let a=12345;const rnd=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const sagB=SAG*.9,Hn=H-2*M-sagB;
function map(u,v){const s=SAG*(1-.1*v);let X=M+u*(W-2*M),Y=M+v*Hn+s*4*u*(1-u);X+=(.5-u)*2*BOW*Math.sin(Math.PI*v);return[X,Y]}

function particle(x,y,k,im){P.push({x,y,px:x,py:y,hx:x,hy:y-(k?G/k:0),k,im,pin:false,pop:0,hs:1});return P.length-1}
function build(){
  P=[];K=[];ropes=[];cons=[];const N=[],UV=[];
  for(let j=0;j<=R;j++){N[j]=[];UV[j]=[];for(let i=0;i<=C;i++){
    const edge=i===0||i===C||j===0||j===R;
    const u=i/C+(edge?0:(rnd()-.5)*WOB/C),v=j/R+(edge?0:(rnd()-.5)*WOB/R);UV[j][i]=[u,v];
    const [x,y]=map(u,v);const id=particle(x,y,edge?.22:.045,edge?.2:.6);N[j][i]=id;K.push(id)}}
  P[N[0][0]].pin=P[N[0][C]].pin=true;
  CORN=[N[0][0],N[0][C],N[R][0],N[R][C]].map(id=>({id,ox:P[id].x,oy:P[id].y,pin:P[id].pin}));
  // a rope = chain of soft points between two knots; frame ropes follow the hanging edge
  const rope=(A,B,frame,uvA,uvB,slack=SLACK)=>{
    const ids=[A],pa=P[A],pb=P[B],dx=pb.x-pa.x,dy=pb.y-pa.y,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L,b1=(rnd()-.5)*.16,b2=(rnd()-.5)*.16;
    for(let s=1;s<SUB;s++){const t=s/SUB;let x,y;
      if(frame){[x,y]=map(uvA[0]+(uvB[0]-uvA[0])*t,uvA[1]+(uvB[1]-uvA[1])*t)}
      else{const mt=1-t,c1x=pa.x+dx*.33+nx*b1*L,c1y=pa.y+dy*.33+ny*b1*L,c2x=pa.x+dx*.66+nx*b2*L,c2y=pa.y+dy*.66+ny*b2*L;
        x=mt*mt*mt*pa.x+3*mt*mt*t*c1x+3*mt*t*t*c2x+t*t*t*pb.x;y=mt*mt*mt*pa.y+3*mt*mt*t*c1y+3*mt*t*t*c2y+t*t*t*pb.y}
      ids.push(particle(x,y,frame?.22:0,frame?.25:1))}
    ids.push(B);const r={ids,frame,segs:[]};
    for(let s=0;s<ids.length-1;s++){const p=P[ids[s]],q=P[ids[s+1]];
      const c={a:ids[s],b:ids[s+1],rest:Math.hypot(p.x-q.x,p.y-q.y)*(frame?1:slack),broken:false,frame,rope:r};cons.push(c);r.segs.push(c)}
    ropes.push(r)};
  for(let j=1;j<R;j++)for(let i=0;i<C;i++)rope(N[j][i],N[j][i+1],false);
  for(let i=1;i<C;i++)for(let j=0;j<R;j++)rope(N[j][i],N[j+1][i],false,null,null,1.0);  // verticals carry the weight, so they hang taut
  for(let i=0;i<C;i++){rope(N[0][i],N[0][i+1],true,UV[0][i],UV[0][i+1]);rope(N[R][i],N[R][i+1],true,UV[R][i],UV[R][i+1])}
  for(let j=0;j<R;j++){rope(N[j][0],N[j+1][0],true,UV[j][0],UV[j+1][0]);rope(N[j][C],N[j+1][C],true,UV[j][C],UV[j+1][C])}
  // settle once so the threads hang naturally before the first frame
  for(let i=0;i<120;i++)step(true);
}

function size(){const r=stage.getBoundingClientRect(),d=devicePixelRatio||1;cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d);ctx.setTransform(cv.width/W,0,0,cv.height/H,0,0)}

function cross(p1,p2,p3,p4){const d=(p2.x-p1.x)*(p4.y-p3.y)-(p2.y-p1.y)*(p4.x-p3.x);if(!d)return false;
  const t=((p3.x-p1.x)*(p4.y-p3.y)-(p3.y-p1.y)*(p4.x-p3.x))/d,u=((p3.x-p1.x)*(p2.y-p1.y)-(p3.y-p1.y)*(p2.x-p1.x))/d;return t>=0&&t<=1&&u>=0&&u<=1}

function step(settle){
  const now=performance.now();
  // the hand: brushes the threads along, and in tear mode cuts what a quick stroke crosses
  if(!settle&&ptr&&prevPtr&&!group.length&&!peel){
    const vx=ptr.x-prevPtr.x,vy=ptr.y-prevPtr.y,sp=Math.hypot(vx,vy),r=16;
    if(sp>.3){const cx=vx/sp*Math.min(sp,5),cy=vy/sp*Math.min(sp,5);for(const p of P){if(p.pin)continue;const d=Math.hypot(p.x-ptr.x,p.y-ptr.y);if(d<r){const f=(1-d/r)*.4;p.x+=cx*f;p.y+=cy*f}}}
    if(false){for(const c of cons){if(c.broken||c.frame)continue;
      if(cross(prevPtr,ptr,P[c.a],P[c.b])){c.broken=true;lastCut=now;
        const A=P[c.a],B=P[c.b],dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy)||1;   // the cut ends snap back a little
        A.px+=dx/d*.8;A.py+=dy/d*.8;B.px-=dx/d*.8;B.py-=dy/d*.8}}}}
  const t=now*.001;
  // while the hand holds the net, it stops clinging to its shape so the whole body answers; it settles back after release
  homeF+=((group.length?.12:1)-homeF)*(group.length?.15:.025);
  // peeling: a corner is lifted and the net lets go of its shape behind it, like pulling a blanket off a bed
  if(peel){const c=P[peel.id],ease=u=>u<.5?2*u*u:1-(-2*u+2)**2/2;
    if(peel.phase==='drag'&&ptr){peel.tx=ptr.x;peel.ty=ptr.y}
    if(peel.phase==='hold'&&now-peel.t0>2600){peel.phase='return';peel.t0=now;peel.fx=c.x;peel.fy=c.y}
    if(peel.phase==='return'){const u=Math.min(1,(now-peel.t0)/1600),e=ease(u);
      peel.tx=peel.fx+(peel.ox-peel.fx)*e;peel.ty=peel.fy+(peel.oy-peel.fy)*e;
      if(u>=1){c.x=c.px=peel.ox;c.y=c.py=peel.oy;c.pin=peel.pin;peel=null}}
    if(peel){const dx0=peel.tx-peel.ox,dy0=peel.ty-peel.oy,L0=Math.hypot(dx0,dy0),cap=Math.hypot(W,H)*1.15;
      if(L0>cap){peel.tx=peel.ox+dx0/L0*cap;peel.ty=peel.oy+dy0/L0*cap}
      peel.drag=Math.min(L0,cap);c.px=c.x;c.py=c.y;c.x+=(peel.tx-c.x)*.3;c.y+=(peel.ty-c.y)*.3;
      // fold line = halfway between where the corner was and where it is now; everything on the corner's side is folded over it
      const mx=(peel.ox+c.x)/2,my=(peel.oy+c.y)/2,fx=c.x-peel.ox,fy=c.y-peel.oy,fl=Math.hypot(fx,fy)||1,nx=fx/fl,ny=fy/fl;
      for(const p of P){const d=(p.hx-mx)*nx+(p.hy-my)*ny;
        if(peel.drag>4&&d<0){p.tx=p.hx-2*d*nx;p.ty=p.hy-2*d*ny;p.fold=true}else{p.tx=p.hx;p.ty=p.hy;p.fold=false}}}}
  if(!peel)for(const p of P){p.tx=p.hx;p.ty=p.hy;p.fold=false}
  if(group.length&&ptr&&prevPtr){dragV.x=dragV.x*.6+(ptr.x-prevPtr.x)*.4;dragV.y=dragV.y*.6+(ptr.y-prevPtr.y)*.4}
  for(const p of P){if(p.pin)continue;
    if(!settle){p.x+=Math.sin(t*1.1+p.y*.025+p.x*.004)*.03;p.y+=Math.sin(t*.8+p.x*.012)*.02}   // a faint breeze: the net is never fully still
    if(p.w&&ptr){const tx=p.gx+(ptr.x-start.x)*p.w,ty=p.gy+(ptr.y-start.y)*p.w;p.px=p.x;p.py=p.y;p.x+=(tx-p.x)*.3;p.y+=(ty-p.y)*.3;continue}
    // the rest of the net is drawn along with the hand, softer the farther it is, so the whole body moves together
    if(p.f&&ptr){const tx=p.gx+(ptr.x-start.x)*p.f,ty=p.gy+(ptr.y-start.y)*p.f;p.x+=(tx-p.x)*.08;p.y+=(ty-p.y)*.08}
    let vx=(p.x-p.px)*.986,vy=(p.y-p.py)*.986;const vs=Math.hypot(vx,vy);if(vs>7){vx*=7/vs;vy*=7/vs}p.px=p.x;p.py=p.y;
    p.x+=vx;p.y+=vy+G;
    const k=p.fold?Math.max(p.k,.05)*1.6:p.k*(p.k>.1?.2+.8*homeF:homeF);if(k){p.x+=((p.tx??p.hx)-p.x)*k;p.y+=((p.ty??p.hy)-p.y)*k}}
  // re-tie: two seconds after the last cut, loose ends are drawn back together and knotted
  // re-tie: each cut thread is reconnected at its current length and gently reeled in to its true length
  if(now-lastCut>1500)for(const c of cons)if(c.broken){const A=P[c.a],B=P[c.b];c.broken=false;c.cur=Math.hypot(B.x-A.x,B.y-A.y);c.tying=true}
  for(const c of cons)if(c.tying){c.cur=Math.max(c.rest,c.cur*.93-.4);if(c.cur===c.rest){c.tying=false;P[c.a].pop=P[c.b].pop=1}}
  for(let it=0;it<10;it++)for(const c of cons){
    if(c.broken)continue;const A=P[c.a],B=P[c.b];
    const dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy)||1e-4;
    const rest=c.tying?c.cur:c.rest;if(d<=rest)continue;                            // rope only resists stretching; slack just hangs
    const wa=A.pin||A.w>.55?0:A.im,wb=B.pin||B.w>.55?0:B.im,sum=wa+wb;if(!sum)continue;
    const k=(d-rest)/d/sum;A.x+=dx*k*wa;A.y+=dy*k*wa;B.x-=dx*k*wb;B.y-=dy*k*wb}
  for(const p of P)if(p.pop>0)p.pop=Math.max(0,p.pop-.05);
  prevPtr=ptr?{...ptr}:null;
}

function path(ids){const p0=P[ids[0]];ctx.moveTo(p0.x,p0.y);
  for(let k=1;k<ids.length-1;k++){const p=P[ids[k]],q=P[ids[k+1]];ctx.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2)}
  const l=P[ids[ids.length-1]];ctx.lineTo(l.x,l.y)}
function draw(){
  ctx.clearRect(0,0,W,H);const red=(getComputedStyle(cv).getPropertyValue('--shunra-net').trim()||'#d9363c');
  ctx.strokeStyle=ctx.fillStyle=red;ctx.lineCap='round';ctx.lineJoin='round';
  const back=(getComputedStyle(cv).getPropertyValue('--shunra-net-back').trim()||'#a3242a');
  for(const [frame,folded] of [[false,false],[true,false],[false,true],[true,true]]){ctx.strokeStyle=folded?back:red;ctx.lineWidth=frame?FRAME:TH;ctx.beginPath();
    for(const r of ropes){if(r.frame!==frame)continue;if(!!(P[r.ids[0]].fold&&P[r.ids[r.ids.length-1]].fold)!==folded)continue;let run=[r.ids[0]];
      r.segs.forEach((c,s)=>{if(c.broken){if(run.length>1)path(run);run=[r.ids[s+1]]}else run.push(r.ids[s+1])});
      if(run.length>1)path(run)}
    ctx.stroke()}
  for(const id of K){const p=P[id];ctx.fillStyle=p.fold?back:red;ctx.beginPath();ctx.arc(p.x,p.y,TH*1.25*(1+p.pop*.8),0,Math.PI*2);ctx.fill()}
  for(const c of CORN){const p=P[c.id];ctx.fillStyle=red;ctx.beginPath();ctx.arc(p.x,p.y,TH*2.2,0,Math.PI*2);ctx.fill()}   // the corners read as handles
}
function loop(){step(false);draw();requestAnimationFrame(loop)}

const toNet=ev=>{const r=cv.getBoundingClientRect();return{x:(ev.clientX-r.left)*W/r.width,y:(ev.clientY-r.top)*H/r.height}};
cv.addEventListener('pointermove',ev=>{if(ev.pointerType!=='mouse'&&!held)return;ptr=toNet(ev)});
cv.addEventListener('pointerdown',ev=>{ptr=start=toNet(ev);prevPtr=null;group=[];const RG=46;
  if(!peel){const cn=CORN.find(c=>Math.hypot(P[c.id].x-ptr.x,P[c.id].y-ptr.y)<34);
    if(cn){peel={...cn,phase:'drag',tx:ptr.x,ty:ptr.y,drag:0};P[cn.id].pin=true;held=true;cv.setPointerCapture(ev.pointerId);return}}
  for(const p of P){if(p.pin)continue;const d=Math.hypot(p.x-ptr.x,p.y-ptr.y);p.gx=p.x;p.gy=p.y;if(d<RG){p.w=1-(d/RG)**2;group.push(p)}else p.f=Math.exp(-(d-RG)/230)*.85}
  if(!group.length)for(const p of P)p.f=0;
  if(group.length){held=true;cv.setPointerCapture(ev.pointerId)}});
const end=ev=>{if(peel&&peel.phase==='drag'){const c=P[peel.id];
    if(peel.drag>W*.3){peel.phase='hold';peel.t0=performance.now()}else{peel.phase='return';peel.t0=performance.now()-400;peel.fx=c.x;peel.fy=c.y}
    held=null;if(ev.pointerType!=='mouse'){ptr=null;prevPtr=null}return}
  if(group.length&&ptr){const v=dragV,sp=Math.hypot(v.x,v.y),rx=ptr.x,ry=ptr.y;
    for(const p of P){if(p.pin)continue;const d=Math.hypot(p.x-rx,p.y-ry),f=Math.exp(-d/260)*.9;
      p.px-=v.x*f;p.py-=v.y*f;                                   // carry the throw outward
      p.py-=Math.min(sp,6)*.35*Math.exp(-d/420)}}                // and a soft bounce through the whole body
  dragV={x:0,y:0};held=null;for(const p of group)p.w=0;for(const p of P)p.f=0;group=[];if(ev.pointerType!=='mouse'){ptr=null;prevPtr=null}};
cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
cv.addEventListener('pointerleave',()=>{if(!held){ptr=null;prevPtr=null}});
build();size();addEventListener('resize',size);loop();

}
