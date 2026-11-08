import { isBlack, noteName } from './music.js';
import { lowerBound } from './engine.js';

export function noteColor(role, black=false, hit=false) {
  if(role==='left')return hit?'#d4ebff':black?'#4582b6':'#8dbde8';
  if(role==='right')return hit?'#e1fbd0':black?'#72b53b':'#a5e86b';
  return hit?'#ecdcff':black?'#9270b0':'#c4a6df';
}

export function labelFor(midi,mode,octave=4,tonic=0){
  const pitch=((midi%12)+12)%12;
  if(mode==='off')return '';
  if(mode==='octaves')return pitch===0?noteName(midi):'';
  if(mode==='mapping')return ['A','W','S','E','D','F','T','G','Y','H','U','J','K','O','L','P',';',"'"][midi-(octave+1)*12]||'';
  if(mode==='simple'&&isBlack(midi))return '';
  const relative=(pitch-tonic+12)%12;
  if(mode==='movable')return ['Do','Di','Re','Ri','Mi','Fa','Fi','Sol','Si','La','Li','Ti'][relative];
  if(mode==='solfege')return ['Do','Di','Re','Ri','Mi','Fa','Fi','Sol','Si','La','Li','Ti'][pitch];
  if(mode==='numbers')return ['1','♯1','2','♯2','3','4','♯4','5','♯5','6','♯6','7'][relative];
  return noteName(midi).replace(/-?\d+$/,'');
}

export class PianoRoll {
  constructor(canvas, keyboard, transport, onPress, onRelease, onNote) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.keyboard=keyboard;this.transport=transport;
    this.onPress=onPress;this.onRelease=onRelease;this.onNote=onNote;this.label='notes';this.window=5;this.range=[21,108];this.keyMap=new Map();this.drawn=[];
    this.keyLabel='octaves';this.labelSize=12;this.octave=4;this.showMeasures=true;this.showNotes=true;this.highContrast=false;
    this.buildKeys();
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);
    canvas.addEventListener('click',e=>{if(transport.running)return;const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;const item=this.drawn.find(n=>x>=n.x&&x<=n.x+n.w&&y>=n.y&&y<=n.y+n.h);if(item)this.onNote(item.note);});
  }
  resize() {const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=r.width*dpr;this.canvas.height=r.height*dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);}
  setRange(min,max) {if(isBlack(min))min--;if(isBlack(max))max++;this.range=[Math.max(21,min),Math.min(108,max)];this.buildKeys();}
  buildKeys() {
    this.keyboard.replaceChildren();this.keyMap.clear();
    const [min,max]=this.range,total=Array.from({length:max-min+1},(_,i)=>min+i).filter(n=>!isBlack(n)).length;
    let whites=0;
    for(let midi=min;midi<=max;midi++) {
      const black=isBlack(midi),width=black?.62:1,left=black?whites-.31:whites;
      if(!black)whites++;
      const key=document.createElement('button');key.className=`key ${black?'black':'white'}`;key.type='button';key.setAttribute('aria-label',`Play ${noteName(midi)}`);key.dataset.midi=midi;
      key.style.left=`${left/total*100}%`;key.style.width=`${width/total*100}%`;
      const name=document.createElement('span');name.textContent=noteName(midi);key.append(name);
      key.addEventListener('pointerdown',e=>{e.preventDefault();key.setPointerCapture(e.pointerId);this.onPress(midi, .75,`pointer:${e.pointerId}`);});
      const release=e=>this.onRelease(midi,`pointer:${e.pointerId}`);
      key.addEventListener('pointerup',release);key.addEventListener('pointercancel',release);key.addEventListener('lostpointercapture',release);
      key.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&!e.repeat){e.preventDefault();e.stopPropagation();this.onPress(midi,.75,`keybutton:${midi}`);}});
      key.addEventListener('keyup',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();this.onRelease(midi,`keybutton:${midi}`);}});
      key.addEventListener('blur',()=>this.onRelease(midi,`keybutton:${midi}`));
      this.keyboard.append(key);this.keyMap.set(midi,{key,left:left/total,width:width/total,black});
    }
    this.updateLabels();
  }
  updateLabels(){for(const[midi,k]of this.keyMap){k.key.querySelector('span').textContent=labelFor(midi,this.keyLabel,this.octave,this.tonic);k.key.style.setProperty('--label-size',`${this.labelSize}px`);}}
  addParticle(midi){if(!this.particles||this.reduceMotion)return;this.sparks??=[];this.sparks.push({midi,start:performance.now()});if(this.sparks.length>60)this.sparks.shift();}
  draw() {
    const c=this.ctx,w=this.width,h=this.height,t=this.transport;
    if(!w||!h||!t.song)return;
    c.clearRect(0,0,w,h);c.fillStyle='#292d30';c.fillRect(0,0,w,h);
    if(t.mode==='free'){this.drawFree(c,w,h);return;}else{this.freeNotes=[];this.freeHeld=new Map();}
    for(const [midi,k]of this.keyMap){if(k.black){c.fillStyle='#24282b';c.fillRect(k.left*w,0,k.width*w,h);}if(midi%12===0){c.strokeStyle='#4b5359';c.lineWidth=1;c.beginPath();c.moveTo(k.left*w,0);c.lineTo(k.left*w,h);c.stroke();}}
    const px=h/this.window;
    if(this.showMeasures)for(const line of t.grid(t.time,t.time+this.window)) {const y=h-(line.time-t.time)*px;c.strokeStyle=line.accent?'#566069':'#363d42';c.lineWidth=line.accent?1:.5;c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();if(line.accent){c.fillStyle='#b4bfc6';c.font='12px Segoe UI';c.fillText(String(line.measure),8,y-7);}}
    const active=new Map(),incomingByPitch=new Map(t.waiting.map(n=>[n.midi+t.transpose,n])),waiting=new Set(incomingByPitch.keys());this.drawn=[];
    const end=lowerBound(t.song.notes,t.time+this.window+.1);
    // The prefix maximum lets long held notes remain visible without scanning the entire song.
    if(this.cachedSong!==t.song){this.cachedSong=t.song;let max=0;this.ends=t.song.notes.map(n=>max=Math.max(max,n.time+n.duration));}
    let lo=0,hi=this.ends.length;while(lo<hi){let mid=(lo+hi)>>>1;if(this.ends[mid]<t.time-.2)lo=mid+1;else hi=mid;}
    for(let i=lo;i<end;i++) {
      const n=t.song.notes[i],midi=n.midi+t.transpose,k=this.keyMap.get(midi),role=t.role(n);
      if(!k||role==='mute'||n.time+n.duration<t.time-.2)continue;
      if(Math.abs(n.time-t.time)<.18)incomingByPitch.set(midi,n);
      if(n.time<=t.time+.015&&n.time+n.duration>t.time&&t.running&&(!t.practice(n)||t.playMyPart))active.set(midi,role);
      if(!this.showNotes||t.song.tracks.find(track=>track.id===n.track)?.hidden)continue;
      const x=k.left*w+1,nw=Math.max(3,k.width*w-2),bottom=h-(n.time-t.time)*px,top=h-(n.time+n.duration-t.time)*px,nh=Math.max(5,bottom-top-2);
      c.fillStyle=t.song.tracks.find(track=>track.id===n.track)?.color||noteColor(role,k.black,t.hit.has(n.id));
      c.beginPath();c.roundRect(x,top,nw,nh,Math.min(6,nw/3));c.fill();
      c.fillStyle='rgba(255,255,255,.22)';c.fillRect(x+2,top+2,Math.max(1,nw-4),2);
      if(waiting.has(midi)&&n.time<=t.time+.03){c.strokeStyle='#fff';c.lineWidth=2;c.stroke();}
      if(nw>17&&nh>17&&this.label!=='off'&&(!this.labelsOnlyMine||t.practice(n))){c.fillStyle=this.highContrast?'#000':'#17291d';c.textAlign='center';c.font=`${this.highContrast?800:600} ${Math.min(this.labelSize,nw*.5)}px Segoe UI`;const label=this.label==='fingers'?(n.finger||''):labelFor(midi,this.label,this.octave,this.tonic),y=Math.max(15,Math.min(h-8,bottom-9));if(this.highContrast){c.strokeStyle='#fff';c.lineWidth=3;c.strokeText(label,x+nw/2,y);}c.fillText(label,x+nw/2,y);c.textAlign='start';}
      this.drawn.push({x,y:top,w:nw,h:nh,note:n});
      if(n.time<=t.time+.015&&n.time+n.duration>t.time&&t.running&&!t.practice(n))active.set(midi,role);
    }
    c.fillStyle='#e98073';c.fillRect(0,h-3,w,3);
    if(this.helperDots&&t.mode==='wait'){const notes=t.waiting.length?t.waiting:t.song.notes.slice(t.index,t.index+80).filter(n=>t.practice(n));const at=notes[0]?.time;for(const n of notes){if(Math.abs(n.time-at)>.001)break;const key=this.keyMap.get(n.midi+t.transpose);if(!key)continue;c.fillStyle='#fff';c.beginPath();c.arc((key.left+key.width/2)*w,h-12,Math.max(3,Math.min(6,key.width*w/4)),0,Math.PI*2);c.fill();}}
    const now=performance.now();this.sparks=(this.sparks||[]).filter(p=>now-p.start<550);if(this.particles&&!this.reduceMotion)for(const p of this.sparks){const key=this.keyMap.get(p.midi);if(!key)continue;const age=(now-p.start)/550;c.fillStyle=`rgba(230,255,210,${1-age})`;for(let i=0;i<5;i++){c.beginPath();c.arc((key.left+key.width/2)*w+(i-2)*age*10,h-8-age*75+(i%2)*9,2*(1-age)+1,0,Math.PI*2);c.fill();}}
    for(const [midi,k]of this.keyMap){const role=active.get(midi);k.key.classList.toggle('playing',!!role||t.held.has(midi));k.key.classList.toggle('expected',waiting.has(midi));const incoming=incomingByPitch.get(midi);const hand=role||(incoming?t.role(incoming):midi-t.transpose<(t.song.splitPoint??60)?'left':'right');k.key.style.setProperty('--key-active',noteColor(hand));}
  }
  drawFree(c,w,h){
    const now=performance.now()/1000,t=this.transport;this.freeHeld??=new Map();this.freeNotes??=[];this.drawn=[];
    for(const midi of t.held)if(!this.freeHeld.has(midi)){const n={midi,start:now,end:null};this.freeHeld.set(midi,n);this.freeNotes.push(n);}
    for(const[midi,n]of this.freeHeld)if(!t.held.has(midi)){n.end=now;this.freeHeld.delete(midi);}
    this.freeNotes=this.freeNotes.filter(n=>n.end===null||now-n.end<this.window);
    if(this.showNotes)for(const n of this.freeNotes){const k=this.keyMap.get(n.midi);if(!k)continue;const x=k.left*w+1,nw=Math.max(3,k.width*w-2),top=h-(now-n.start)*h/this.window,bottom=n.end===null?h:h-(now-n.end)*h/this.window;c.fillStyle=noteColor(n.midi<60?'left':'right',k.black);c.beginPath();c.roundRect(x,top,nw,Math.max(5,bottom-top),Math.min(5,nw/3));c.fill();}
    c.fillStyle='#e98073';c.fillRect(0,h-3,w,3);
    for(const[midi,k]of this.keyMap){k.key.classList.toggle('playing',t.held.has(midi));k.key.classList.remove('expected');k.key.style.setProperty('--key-active',noteColor(midi<60?'left':'right'));}
  }
}
