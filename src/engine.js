import { SoundBank } from './soundbank.js';

export function lowerBound(notes, time) {
  let lo = 0, hi = notes.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (notes[mid].time < time) lo = mid + 1; else hi = mid; }
  return lo;
}

export class Transport {
  constructor(audio) {
    this.audio = audio; this.time = 0; this.running = false; this.speed = 1;
    this.mode = 'listen'; this.hands = 'both'; this.transpose = 0; this.loop = false;
    this.loopA = 0; this.loopB = 0; this.metronome = false; this.countIn = false;
    this.waiting = []; this.hit = new Set(); this.judged = new Set(); this.held = new Set();
    this.stats = { correct: 0, wrong: 0, missed: 0 }; this.lastBeat = -1;
    this.chordRule = 'pressed'; this.wrongNotes = 'continue'; this.wrongHeld = new Set();
  }
  load(song) {
    this.pause(); this.song = song; this.loopA = 0; this.loopB = song.duration; this.loop = false;
    this.audio.configureSong?.(song);
    this.seek(0); this.resetStats();
  }
  resetStats() { this.stats = { correct: 0, wrong: 0, missed: 0 }; this.hit.clear(); this.judged.clear(); }
  role(note) { const role = this.song.tracks.find(t => t.id === note.track)?.role || 'split'; return role === 'pitch' ? (note.midi < (this.song.splitPoint ?? 60) ? 'left' : 'right') : role === 'split' ? note.hand : role; }
  practice(note) { const role = this.role(note); return this.mode !== 'listen' && this.mode !== 'free' && ['left', 'right'].includes(role) && (this.hands === 'both' || this.hands === role); }
  audible(note) { return this.role(note) !== 'mute' && !this.song.tracks.find(t=>t.id===note.track)?.muted; }
  play() {
    if (!this.song || this.mode === 'free') return;
    if (this.time >= this.song.duration - 0.01) { this.seek(this.loop ? this.loopA : 0); this.resetStats(); }
    if (this.loop && (this.time < this.loopA || this.time >= this.loopB)) this.seek(this.loopA);
    this.running = true;
    this.preRollMeter=this.meterAt(this.time).meter;this.preRollBpm=this.song.tempos?.filter(t=>t.time<=this.time).at(-1)?.bpm||this.song.bpm;
    this.preRoll = this.countIn ? this.preRollMeter[0] * 4/this.preRollMeter[1] * 60 / this.preRollBpm : 0;
    this.countBeat = -1;
    this.onPlay?.();
  }
  pause() { this.running = false; if(this.silenceOnPause!==false)this.audio.panic(); }
  seek(time) {
    this.audio.panic(); this.time = Math.max(0, Math.min(this.song?.duration || 0, time));
    this.index = lowerBound(this.song?.notes || [], this.time - 0.00001);
    this.judgeIndex = this.index; this.waiting = []; this.hit.clear(); this.judged.clear(); this.lastBeat = -1;
    this.wrongHeld.clear(); this.loopErrors=this.stats.wrong+this.stats.missed;
    this.eventIndex=0;this.audio.resetExpression?.();
    const state=new Map();for(const event of this.song?.events||[]){if(event.time>=this.time)break;state.set(`${event.track}:${event.type}:${event.controller??''}`,event);this.eventIndex++;}
    for(const event of state.values())this.audio.expression?.(event,this.song.tracks.find(t=>t.id===event.track));
  }
  expectedInput(midi) {
    if(!this.song)return null;
    const at=this.time-(this.mode==='wait'?0:(this.inputOffset||0)/1000*this.speed);
    const candidates=this.mode==='wait'&&this.waiting.length?this.waiting:this.song.notes.slice(lowerBound(this.song.notes,at-.18),lowerBound(this.song.notes,at+.18));
    return candidates.find(n=>n.midi+this.transpose===midi&&this.practice(n)&&!this.judged.has(n.id));
  }
  completeChord(){
    if(this.mode!=='wait'||this.chordRule!=='held'||!this.waiting.length||!this.waiting.every(n=>this.held.has(n.midi+this.transpose)))return;
    for(const n of this.waiting){if(!this.judged.has(n.id)){this.hit.add(n.id);this.judged.add(n.id);this.stats.correct++;this.onJudge?.('correct',n);}}
    this.waiting=[];
  }
  press(midi) {
    this.held.add(midi);
    if (!this.running || this.preRoll > 0 || !['wait', 'rhythm', 'recital'].includes(this.mode)) return;
    const at=this.time-(this.mode==='wait'?0:(this.inputOffset||0)/1000*this.speed);
    const candidates = this.mode === 'wait' && this.waiting.length ? this.waiting : this.song.notes.slice(lowerBound(this.song.notes, at - 0.18), lowerBound(this.song.notes, at + 0.18));
    const n = candidates.find(n => n.midi + this.transpose === midi && this.practice(n) && !this.hit.has(n.id) && !this.judged.has(n.id));
    if(n&&this.mode==='wait'&&this.chordRule==='held'){this.completeChord();return;}
    if (n) { for (const match of candidates.filter(other => other.midi === n.midi && Math.abs(other.time - n.time) < .001 && this.practice(other) && !this.judged.has(other.id))) { this.hit.add(match.id); this.judged.add(match.id); this.stats.correct++; this.onJudge?.('correct', match); } }
    else { this.stats.wrong++; if(this.mode==='wait'&&this.wrongNotes==='stop')this.wrongHeld.add(midi);this.onJudge?.('wrong'); }
    this.waiting = this.waiting.filter(n => !this.hit.has(n.id));
    this.restartOnErrors();
  }
  release(midi) { this.held.delete(midi);this.wrongHeld.delete(midi); }
  restartOnErrors(){if(this.loop&&this.errorLimit>0&&this.stats.wrong+this.stats.missed-(this.loopErrors||0)>=this.errorLimit){this.seek(this.loopA);this.onLoopRetry?.();return true;}return false;}
  meterAt(time){
    const events=this.song.meters?.length?this.song.meters:[{time:0,meter:this.song.meter}];
    let current={time:0,meter:this.song.meter},measure=1;
    for(const event of events){if(event.time>time)break;if(event.time>current.time)measure+=Math.ceil((this.beatAt(event.time)-this.beatAt(current.time))/(current.meter[0]*4/current.meter[1])-1e-7);current=event;}
    return {...current,measure};
  }
  grid(start,end){
    const lines=[];let cursor=start;
    while(cursor<=end&&lines.length<2000){const m=this.meterAt(cursor),unit=4/m.meter[1],base=this.beatAt(m.time),index=Math.ceil((this.beatAt(cursor)-base)/unit-1e-7),beat=base+index*unit,time=this.timeAtBeat(beat);const next=this.song.meters?.find(e=>e.time>cursor+1e-6);if(next&&next.time<time-1e-6){cursor=next.time;continue;}if(time>end)break;lines.push({time,accent:index%m.meter[0]===0,measure:m.measure+Math.floor(index/m.meter[0])});cursor=time+1e-5;}
    return lines;
  }
  advanceExpression(time){const events=this.song.events||[];while(this.eventIndex<events.length&&events[this.eventIndex].time<=time){const event=events[this.eventIndex++];this.audio.expression?.(event,this.song.tracks.find(t=>t.id===event.track));}}
  beatAt(time) {
    let beats = 0, prev = 0, bpm = this.song.bpm;
    for (const t of this.song.tempos || []) { if (t.time > time) break; beats += (t.time - prev) * bpm / 60; prev = t.time; bpm = t.bpm; }
    return beats + (time - prev) * bpm / 60;
  }
  timeAtBeat(beat){
    let beats=0,prev=0,bpm=this.song.bpm;
    for(const t of this.song.tempos||[]){const span=(t.time-prev)*bpm/60;if(beats+span>beat)return prev+(beat-beats)*60/bpm;beats+=span;prev=t.time;bpm=t.bpm;}
    return prev+(beat-beats)*60/bpm;
  }
  tick(delta) {
    if (!this.running || !this.song) return;
    if (this.preRoll > 0) {
      const beat = Math.ceil(this.preRoll * this.preRollBpm / 60*this.preRollMeter[1]/4);
      if (beat !== this.countBeat) { this.audio.click(beat === this.preRollMeter[0]); this.countBeat = beat; }
      this.preRoll = Math.max(0, this.preRoll - delta * this.speed); return;
    }
    this.completeChord();if (this.waiting.length||this.wrongHeld.size) return;
    let target = this.time + delta * this.speed;
    const boundary = this.loop ? this.loopB : this.song.duration;
    target = Math.min(target, boundary);
    while (this.index < this.song.notes.length && this.song.notes[this.index].time <= target + 0.00001) {
      const at = this.song.notes[this.index].time;
      this.advanceExpression(at);
      const group = [];
      while (this.index < this.song.notes.length && Math.abs(this.song.notes[this.index].time - at) < 0.001) group.push(this.song.notes[this.index++]);
      for (const n of group) {
        if (this.role(n)==='mute') continue;
        if (this.mode === 'wait' && this.practice(n) && !this.hit.has(n.id)) this.waiting.push(n);
        if (this.audible(n)&&(!this.practice(n) || this.playMyPart)) this.audio.note(n.midi + this.transpose, n.velocity, n.duration / this.speed, `song:${n.id}`, this.song.tracks.find(t=>t.id===n.track));
      }
      if (this.waiting.length) { target = at; break; }
    }
    this.time = target;
    this.advanceExpression(target);
    if (['rhythm','recital'].includes(this.mode)) {
      while (this.judgeIndex < this.song.notes.length && this.song.notes[this.judgeIndex].time < this.time - 0.18-Math.max(0,(this.inputOffset||0)/1000*this.speed)) {
        const n = this.song.notes[this.judgeIndex++];
        if (this.practice(n) && !this.judged.has(n.id)) { this.judged.add(n.id); this.stats.missed++; this.onJudge?.('missed', n); }
      }
    }
    if(this.restartOnErrors())return;
    const meter=this.meterAt(this.time),beat = Math.floor((this.beatAt(this.time)-this.beatAt(meter.time))*meter.meter[1]/4+1e-7);
    const beatId=`${meter.time}:${beat}`;
    if (this.metronome && beatId !== this.lastBeat) this.audio.click(beat % meter.meter[0] === 0);
    this.lastBeat = beatId;
    if (this.time >= boundary - 0.00001 && !this.waiting.length) {
      if (this.loop) this.seek(this.loopA);
      else { this.pause(); this.onEnd?.(); }
    }
  }
}

// Master volume is last in the chain so turning it down remains predictable.
// Boost lifts quiet MIDI passages; compression and a soft ceiling tame chords.
export function createAudioOutput(ctx, volume = .65, boostDb = 6) {
  const input = ctx.createGain(), boost = ctx.createGain(), compressor = ctx.createDynamicsCompressor();
  boost.gain.value = 10 ** (boostDb / 20);
  compressor.threshold.value = -6; compressor.knee.value = 6; compressor.ratio.value = 12;
  compressor.attack.value = .002; compressor.release.value = .15;
  const ceiling = ctx.createWaveShaper(), curve = new Float32Array(4097);
  for (let i = 0; i < curve.length; i++) {
    const x = i * 2 / (curve.length - 1) - 1, a = Math.abs(x);
    curve[i] = Math.sign(x) * (a <= .8 ? a : .8 + .18 * (1 - Math.exp(-(a - .8) / .18)));
  }
  ceiling.curve = curve;
  const master = ctx.createGain(); master.gain.value = volume;
  input.connect(boost); boost.connect(compressor); compressor.connect(ceiling); ceiling.connect(master); master.connect(ctx.destination);
  return { input, boost, compressor, ceiling, master };
}

export class PianoAudio {
  constructor() { this.voices = new Map(); this.volume = 0.65; this.boostDb = 6; this.tone = 'grand'; this.output = null; this.sustain = false; this.released = new Set(); this.samples = new Map(); }
  createContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
      Object.assign(this, createAudioOutput(this.ctx, this.volume, this.boostDb));
      const impulse=this.ctx.createBuffer(2,Math.floor(this.ctx.sampleRate*1.4),this.ctx.sampleRate);let seed=713;
      for(let ch=0;ch<2;ch++){const data=impulse.getChannelData(ch);for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=(seed/1073741824-1)*Math.pow(1-i/data.length,3);}}
      this.reverbNode=this.ctx.createConvolver();this.reverbNode.buffer=impulse;this.reverbGain=this.ctx.createGain();this.input.connect(this.reverbNode);this.reverbNode.connect(this.reverbGain);this.reverbGain.connect(this.boost);this.setReverb(this.reverb??0);
    }
  }
  preload() {
    this.createContext();
    if (!this.samplePromise) this.samplePromise = fetch('/piano.json').then(response => { if (!response.ok) throw new Error('Piano samples unavailable'); return response.json(); }).then(async data => {
      await Promise.all(Object.entries(data).map(async ([name, url]) => {
        const match = /^([A-G])([#b]?)(-?\d+)$/.exec(name); if (!match) return;
        const midi = (Number(match[3]) + 1) * 12 + { C:0,D:2,E:4,F:5,G:7,A:9,B:11 }[match[1]] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
        const binary = atob(url.split(',')[1]), bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        const buffer = await this.ctx.decodeAudioData(bytes.buffer); this.samples.set(midi, buffer);
      }));
    }).catch(() => { this.sampleFailed = true; });
    return this.samplePromise;
  }
  async ready() {
    this.createContext();
    if (this.ctx.state !== 'running') await this.ctx.resume();
    if (this.tone === 'grand') await this.preload();
    if (this.tone === 'bank') await (this.bankReady || this.loadBank());
  }
  configureSong(song){this.song=song;this.bank?.configure(song.tracks);this.restoreExpression();}
  restoreExpression(){if(!this.bank?.synth)return;for(const[trackId,state]of this.expressionState||[]){const track=this.song?.tracks.find(t=>t.id===trackId);for(const[controller,value]of Object.entries(state.controllers||{}))this.bank.expression({type:'cc',controller:Number(controller),value},track);this.bank.expression({type:'bend',value:state.bend},track);}}
  loadBank(buffer) {
    this.createContext();this.panic();this.bank??=new SoundBank();
    this.bankReady=(async()=>{const data=buffer||await(await fetch('/general-user.sf2')).arrayBuffer();const presets=await this.bank.load(this.ctx,this.input,data);this.bank.configure(this.song?.tracks||[]);this.restoreExpression();return presets;})();
    return this.bankReady;
  }
  setVolume(value) { this.volume = Math.max(0, Math.min(1, Number(value) || 0)); if (this.master) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02); }
  setBoost(value) { this.boostDb = Math.max(0, Math.min(12, Number(value) || 0)); if (this.boost) this.boost.gain.setTargetAtTime(10 ** (this.boostDb / 20), this.ctx.currentTime, .02); }
  setReverb(value){this.reverb=Math.max(0,Math.min(1,Number(value)||0));if(this.reverbGain)this.reverbGain.gain.setTargetAtTime(this.reverb*.6,this.ctx.currentTime,.02);}
  resetExpression(){this.expressionState=new Map();this.bank?.resetExpression();if(this.output)for(let c=0;c<16;c++){try{this.output.send([0xb0|c,121,0]);this.output.send([0xe0|c,0,64]);}catch{}}}
  expression(event,track){
    this.expressionState??=new Map();const state=this.expressionState.get(event.track)||{volume:1,expression:1,bend:0,pan:track?.pan||0};
    if(event.type==='bend')state.bend=event.value;else if(event.controller===7)state.volume=event.value;else if(event.controller===11)state.expression=event.value;else if(event.controller===10)state.pan=event.value*2-1;
    if(event.type==='cc'){state.controllers??={};state.controllers[event.controller]=event.value;}
    this.expressionState.set(event.track,state);this.bank?.expression(event,track);
    for(const voice of this.voices.values())if(!voice.bank&&voice.trackId===event.track){voice.expressionGain?.gain.setTargetAtTime(state.volume*state.expression,this.ctx.currentTime,.015);voice.pan?.pan.setTargetAtTime(state.pan,this.ctx.currentTime,.015);}
    if(event.type==='bend')for(const voice of this.voices.values())if(!voice.bank&&voice.trackId===event.track)for(const source of voice.oscillators)source.detune?.setTargetAtTime(state.bend*200,this.ctx.currentTime,.015);
    if(this.output&&this.outputBackground!==false){const ch=(track?.channel||0)&15;try{if(event.type==='bend'){const v=Math.max(0,Math.min(16383,Math.round((event.value+1)*8192)));this.output.send([0xe0|ch,v&127,v>>7]);}else this.output.send([0xb0|ch,event.controller,Math.round(event.value*127)]);}catch{}}
  }
  note(midi, velocity = .7, duration = null, id = `live:${midi}`, track = null) {
    if (!this.ctx || midi < 0 || midi > 127) return;
    this.stop(id, true);
    velocity=Math.max(0,Math.min(1,velocity*(track?.volume??1)));
    if(!velocity||track?.muted)return;
    const expression=this.expressionState?.get(track?.id),category=track?(track.percussion?'outputPercussion':'outputBackground'):'outputLive';
    if(this.tone==='bank'&&this.bank?.synth){
      const channel=this.bank.note(midi,velocity,track),outChannel=track?.channel??0;
      const voice={midi,channel,outChannel,bank:true,timer:null};this.voices.set(id,voice);
      this.sendExternal(midi,velocity,outChannel,track?.instrument??this.bank.liveProgram??0,category);
      if(duration!==null)voice.timer=setTimeout(()=>this.stop(id,true),Math.max(20,duration*1000));
      return;
    }
    const now = this.ctx.currentTime, envelope = this.ctx.createGain(), freq = 440 * 2 ** ((midi - 69) / 12);
    const outVelocity=velocity;
    const oscillators = [];
    envelope.gain.setValueAtTime(0, now); envelope.gain.linearRampToValueAtTime(velocity * .48, now + .006);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.001, velocity * .12), now + (this.tone === 'organ' ? 12 : 1.4));
    envelope.gain.exponentialRampToValueAtTime(.0001, now + 16);
    const expressionGain=this.ctx.createGain();expressionGain.gain.value=(expression?.volume??1)*(expression?.expression??1);
    const pan=this.ctx.createStereoPanner();pan.pan.value=Math.max(-1,Math.min(1,expression?.pan??track?.pan??0));envelope.connect(expressionGain);expressionGain.connect(pan);pan.connect(this.input);
    const sampled = this.tone === 'grand' && this.samples.has(midi);
    if (sampled) {
      const source = this.ctx.createBufferSource();source.buffer = this.samples.get(midi);source.connect(envelope);source.start(now);oscillators.push(source);
      envelope.gain.cancelScheduledValues(now);envelope.gain.setValueAtTime(0,now);envelope.gain.linearRampToValueAtTime(velocity*1.8,now+.004);
    }
    const harmonics = sampled ? [] : this.tone === 'soft' ? [1,.18,.06] : this.tone === 'organ' ? [1,.5,.3,.15] : [1,.32,.14,.055];
    harmonics.forEach((amp,i)=>{
      if (freq * (i + 1) >= this.ctx.sampleRate / 2) return;
      const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq * (i + 1); gain.gain.value = amp;
      osc.connect(gain); gain.connect(envelope); osc.start(now); osc.stop(now + 17); oscillators.push(osc);
    });
    for(const source of oscillators)if(source.detune)source.detune.value=(expression?.bend||0)*200;
    const voice = { envelope, pan, expressionGain, oscillators, midi, trackId:track?.id, outChannel:track?.channel??0, timer: null };
    this.voices.set(id, voice);
    this.sendExternal(midi,outVelocity,voice.outChannel,track?.instrument||0,category);
    if (duration !== null) voice.timer = setTimeout(()=>this.stop(id, true), Math.max(20, duration * 1000));
  }
  sendExternal(midi,velocity,channel,program,category='outputLive'){if(this.output&&this[category]!==false){try{if(this.outputPrograms!==false)this.output.send([0xc0|(channel&15),program]);this.output.send([0x90|(channel&15),midi,Math.max(1,Math.min(127,Math.round(velocity*127*(this.outputScale??1))))]);}catch{this.output=null;}}}
  stop(id, force = false) {
    const voice = this.voices.get(id); if (!voice) return;
    if (this.sustain && !force && id.startsWith('live:')) { this.released.add(id); return; }
    clearTimeout(voice.timer); this.released.delete(id);
    this.voices.delete(id);
    if(voice.bank){
      if(![...this.voices.values()].some(v=>v.bank&&v.channel===voice.channel&&v.midi===voice.midi))this.bank.release(voice.channel,voice.midi);
    }else{
    const now = this.ctx.currentTime;
    voice.envelope.gain.cancelAndHoldAtTime(now); voice.envelope.gain.exponentialRampToValueAtTime(.0001, now + .16);
    voice.oscillators.forEach(o=>{ try { o.stop(now+.18); } catch {} });
    setTimeout(()=>{voice.envelope.disconnect();voice.expressionGain?.disconnect();voice.pan?.disconnect();}, 220);
    }
    if (this.output && ![...this.voices.values()].some(v=>v.midi===voice.midi&&v.outChannel===voice.outChannel)) { try { this.output.send([0x80|(voice.outChannel&15),voice.midi,0]); } catch {} }
  }
  pedal(down) { this.sustain = down; if (!down) for (const id of [...this.released]) this.stop(id, true); }
  panic() { for (const id of [...this.voices.keys()]) this.stop(id, true); this.bank?.panic(); this.released.clear(); }
  click(accent) {
    if(this.outputMetronome&&this.output){try{this.output.send([0x99,accent?76:77,90]);this.output.send([0x89,accent?76:77,0],performance.now()+60);}catch{}}
    if (!this.ctx) return;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain(), now=this.ctx.currentTime;
    o.frequency.value=accent?1400:950; g.gain.setValueAtTime(.12,now); g.gain.exponentialRampToValueAtTime(.0001,now+.045);
    o.connect(g);g.connect(this.input);o.start(now);o.stop(now+.05);o.onended=()=>g.disconnect();
  }
}

