import { readSetting, writeSetting } from './storage.js';
import { escapeXML as esc, noteName } from './music.js';
import './advanced.css';

export const advancedDefaults={chordRule:'held',wrongNotes:'stop',inputSound:'all',loudness:'input',errorLimit:0,silenceOnPause:true,helperDots:true,labelsOnlyMine:false,showTitle:true,showPoints:true,showPaused:true,praise:true,hideCursor:false,reduceMotion:false,touchMode:false,benchmark:false,particles:false,fanfare:false,theme:'classic',recentSongs:true,tonic:'auto',reverb:0,outputLive:true,outputBackground:true,outputPercussion:true,outputMetronome:false,outputPrograms:true,outputScale:1,customRange:false,rangeLow:21,rangeHigh:108};
const shortcutsDefault={back:'ArrowLeft',forward:'ArrowRight',faster:'ArrowUp',slower:'ArrowDown',restart:'Home',sheet:'F2',notes:'F3',measures:'F4',labels:'F5',bookmark:'KeyB',record:'KeyR',metronome:'KeyM',loop:'KeyQ',fullscreen:'Alt+Enter'};
const shortcutNames={back:'Seek back 5 seconds',forward:'Seek forward 5 seconds',faster:'Increase speed',slower:'Decrease speed',restart:'Restart song',sheet:'Sheet music',notes:'Falling notes',measures:'Measure lines',labels:'Cycle note labels',bookmark:'Add bookmark',record:'Record / save',metronome:'Metronome',loop:'Loop section',fullscreen:'Fullscreen'};
const reserved=new Set(['Space','Escape','Tab','ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight']);
const pianoKeys=new Set(['KeyA','KeyW','KeyS','KeyE','KeyD','KeyF','KeyT','KeyG','KeyY','KeyH','KeyU','KeyJ','KeyK','KeyO','KeyL','KeyP','Semicolon','Quote','KeyZ','KeyX']);
export function shortcutCode(e){return`${e.ctrlKey?'Ctrl+':''}${e.altKey?'Alt+':''}${e.metaKey?'Meta+':''}${e.shiftKey?'Shift+':''}${e.code}`;}
export function validShortcut(code){const key=code.split('+').at(-1);return !reserved.has(key)&&(!pianoKeys.has(key)||code.includes('+'))&&/^(?:(?:Ctrl|Alt|Meta|Shift)\+)*(?:Key[A-Z]|Digit[0-9]|Arrow(?:Left|Right|Up|Down)|F(?:[1-9]|1[0-2])|Home|End|PageUp|PageDown|Enter|Backspace|Delete|Minus|Equal)$/.test(code);}

export function createAdvanced(api){
 const $=id=>document.getElementById(id),{transport:t,roll,audio,navigation:nav}=api;
 const settings={...advancedDefaults,...readSetting('advanced',{})},bindings={...shortcutsDefault,...readSetting('shortcuts',{})};
 for(const[key,value]of Object.entries(bindings))if(value&&!validShortcut(value))bindings[key]=shortcutsDefault[key];
 const tabs=document.querySelector('.settings-tabs'),panels=document.querySelector('.settings-panels');
 function panel(id,title){const p=document.createElement('section');p.id=`settings-${id}`;p.className='settings-page';p.hidden=true;p.innerHTML=`<h2>${title}</h2><div class="advanced-options"></div>`;panels.append(p);const b=document.createElement('button');b.dataset.settingsCategory=id;b.textContent=title;b.onclick=()=>nav.selectSettings(id);tabs.append(b);return p.querySelector('.advanced-options');}
 const gameplay=panel('gameplay','Gameplay'),appearance=panel('appearance','Appearance'),shortcuts=panel('shortcuts','Keyboard shortcuts');
 function option(parent,key,title,choices,help=''){
  const row=document.createElement('label');row.className='advanced-option';const id=`option-${key}`;
  row.innerHTML=`<span>${title}${help?`<small>${help}</small>`:''}</span>${choices?`<select id="${id}">${choices.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select>`:`<input id="${id}" type="checkbox">`}`;parent.append(row);const control=$(id);if(choices)control.value=String(settings[key]);else control.checked=settings[key];control.onchange=()=>{settings[key]=choices?(typeof advancedDefaults[key]==='number'?Number(control.value):control.value):control.checked;save();};
 }
 option(gameplay,'chordRule','Continue a chord when', [['held','All notes are held together'],['pressed','Each note has been pressed']]);
 option(gameplay,'wrongNotes','Incorrect notes in Learn notes',[['stop','Wait until wrong keys are released'],['continue','Count the error and continue']]);
 option(gameplay,'inputSound','Notes from my keyboard',[['all','Play all notes'],['correct','Only correct practice notes'],['silent','Silent input']], 'Scoring still records every key you play.');
 option(gameplay,'loudness','My note loudness',[['input','Use keyboard velocity'],['song','Use the song’s velocity'],['fixed','Even loudness']], 'Applies to your piano sound; free-play recordings retain the original velocity.');
 option(gameplay,'errorLimit','Restart a loop after errors',[[0,'Never'],[1,'1 error'],[2,'2 errors'],[3,'3 errors'],[5,'5 errors'],[10,'10 errors']], 'Wrong and missed notes count. Enable a loop first.');
 for(const[key,title]of [['silenceOnPause','Silence song notes on pause'],['helperDots','Show next-note helper dots'],['labelsOnlyMine','Label only the hands I am practicing'],['showPoints','Show live practice statistics'],['showPaused','Show paused-song message'],['praise','Show correct-note feedback']])option(gameplay,key,title);
 option(appearance,'theme','Color theme',[['classic','Classic charcoal'],['blue','Sky blue'],['orange','Warm orange'],['contrast','High contrast']]);
 for(const[key,title]of [['showTitle','Show song title'],['recentSongs','Show recently played songs'],['hideCursor','Hide pointer after two idle seconds during playback'],['reduceMotion','Reduce decorative motion'],['touchMode','Larger touch controls'],['particles','Note-hit particles'],['fanfare','Completion sound'],['benchmark','Show rendering frame rate']])option(appearance,key,title);
 option(appearance,'tonic','Key for movable Do and scale numbers',[['auto','Use song key signature'],...['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'].map((n,i)=>[String(i),n])]);
 option(appearance,'customRange','Use a custom keyboard range');
 const pitches=Array.from({length:88},(_,i)=>[i+21,noteName(i+21)]);option(appearance,'rangeLow','Lowest visible key',pitches);option(appearance,'rangeHigh','Highest visible key',pitches);
 const sound=$('settings-sound');option(sound,'reverb','Reverb',[[0,'Dry'],[.25,'Small room'],[.5,'Medium room'],[1,'Large room']]);
 const devices=document.createElement('div');devices.className='advanced-options';devices.innerHTML='<h3>MIDI output routing</h3>';$('midi-dialog').append(devices);
 for(const[key,title]of [['outputLive','Send my notes'],['outputBackground','Send background parts'],['outputPercussion','Send percussion'],['outputMetronome','Send metronome on percussion channel'],['outputPrograms','Send instrument changes']])option(devices,key,title);
 option(devices,'outputScale','MIDI output velocity',[[.5,'50%'],[.75,'75%'],[1,'100%'],[1.25,'125%'],[1.5,'150%']]);
 for(const id of ['key-labels','note-labels','labels']){for(const[value,label]of [['movable','Movable Do'],['simple','Simple white-key names']]){const o=new Option(label,value);$(id).add(o);}}
 $('key-labels').value=roll.keyLabel;$('note-labels').value=roll.label;$('labels').value=roll.label;
 shortcuts.innerHTML='<p>Space always plays or pauses in the piano view. Piano keys, octave keys, sustain and Escape stay reserved. Click a binding, then press a new key combination.</p><div id="shortcut-list"></div><p id="shortcut-message" role="status"></p><button id="reset-shortcuts">Restore shortcut defaults</button>';
 let capturing=null;
 function renderBindings(){$('shortcut-list').innerHTML=Object.entries(shortcutNames).map(([id,name])=>`<div class="shortcut-row"><span>${name}</span><button data-binding="${id}">${esc(bindings[id]||'Unassigned')}</button><button data-clear-binding="${id}" aria-label="Clear ${name}">Clear</button></div>`).join('');}
 renderBindings();$('shortcut-list').onclick=e=>{const b=e.target.closest('[data-binding]'),clear=e.target.closest('[data-clear-binding]');if(b){capturing=b.dataset.binding;b.textContent='Press keys…';$('shortcut-message').textContent='Escape cancels.';}if(clear){bindings[clear.dataset.clearBinding]='';writeSetting('shortcuts',bindings);renderBindings();}};
 $('reset-shortcuts').onclick=()=>{capturing=null;Object.assign(bindings,shortcutsDefault);writeSetting('shortcuts',bindings);renderBindings();$('shortcut-message').textContent='Default shortcuts restored.';};
 document.addEventListener('keydown',e=>{if(!capturing||nav.view()!=='settings')return;e.preventDefault();e.stopImmediatePropagation();if(e.code==='Escape'){capturing=null;renderBindings();return;}const code=shortcutCode(e);if(!validShortcut(code)){$('shortcut-message').textContent='That key is reserved for playing the piano or navigating. Choose another.';return;}const conflict=Object.keys(bindings).find(k=>k!==capturing&&bindings[k]===code);if(conflict){$('shortcut-message').textContent=`Already used by ${shortcutNames[conflict]}. Clear that binding first.`;return;}bindings[capturing]=code;capturing=null;writeSetting('shortcuts',bindings);renderBindings();$('shortcut-message').textContent='Shortcut saved.';},true);
 const reset=document.createElement('button');reset.id='reset-advanced';reset.textContent='Restore gameplay and appearance defaults';appearance.append(reset);reset.onclick=()=>{Object.assign(settings,advancedDefaults);for(const key of Object.keys(settings)){const c=$(`option-${key}`);if(c){if(c.type==='checkbox')c.checked=settings[key];else c.value=String(settings[key]);}}save();api.toast('Gameplay and appearance defaults restored. Your songs and progress are kept.');};
 const feedback=document.createElement('div');feedback.id='judge-feedback';feedback.setAttribute('aria-live','off');document.querySelector('.roll-wrap').append(feedback);
 const fps=document.createElement('span');fps.id='frame-rate';document.querySelector('.roll-wrap').append(fps);
 let feedbackUntil=0,lastPointer=performance.now(),frames=0,lastFps=performance.now(),range='';
 document.addEventListener('pointermove',()=>{lastPointer=performance.now();document.body.classList.remove('idle-pointer');},{passive:true});
 function apply(){
  if(settings.rangeLow>=settings.rangeHigh){settings.rangeHigh=Math.min(108,settings.rangeLow+12);settings.rangeLow=Math.min(settings.rangeLow,settings.rangeHigh-1);$('option-rangeLow').value=settings.rangeLow;$('option-rangeHigh').value=settings.rangeHigh;}
  for(const key of ['chordRule','wrongNotes','errorLimit','silenceOnPause'])t[key]=settings[key];
  roll.helperDots=settings.helperDots;roll.labelsOnlyMine=settings.labelsOnlyMine;roll.reduceMotion=settings.reduceMotion;roll.particles=settings.particles;
  for(const key of ['outputLive','outputBackground','outputPercussion','outputMetronome','outputPrograms','outputScale'])audio[key]=settings[key];audio.setReverb(settings.reverb);
  document.body.dataset.theme=settings.theme;document.body.classList.toggle('reduced-motion',settings.reduceMotion);document.body.classList.toggle('touch-controls',settings.touchMode);document.body.classList.toggle('hide-song-title',!settings.showTitle);document.body.classList.toggle('hide-live-points',!settings.showPoints);
  $('key-range').disabled=settings.customRange;
  if(settings.customRange){roll.setRange(settings.rangeLow,settings.rangeHigh);range=roll.range.join(':');}else if(range){range='';$('key-range').dispatchEvent(new Event('change'));}
  roll.updateLabels();
 }
 function save(){apply();writeSetting('advanced',settings);}
 apply();
 const recent=document.createElement('aside');recent.id='recent-songs';recent.innerHTML='<h2>Recently played</h2><div id="recent-list"></div><button id="clear-recent">Clear recent list</button>';$('home-screen').insertBefore(recent,document.querySelector('.home-bottom'));
 function renderRecent(){const entries=readSetting('recentSongs',[]).slice(0,8);recent.hidden=!settings.recentSongs;$('recent-list').innerHTML=entries.map(entry=>{const song=api.songs().find(s=>s.id===entry.id);return song?`<button data-recent-song="${esc(song.id)}"><strong>${esc(song.title)}</strong><small>${new Date(entry.date).toLocaleDateString()} · ${entry.count} plays</small></button>`:'';}).join('')||'<p>Start a song and it will appear here.</p>';}
 $('clear-recent').onclick=()=>{writeSetting('recentSongs',[]);renderRecent();};recent.onclick=async e=>{const b=e.target.closest('[data-recent-song]');if(!b)return;await api.selectSong(b.dataset.recentSong);await nav.selected();};
 const homeObserver=new MutationObserver(()=>{if(nav.view()==='home')renderRecent();});homeObserver.observe($('app'),{attributes:true,attributeFilter:['data-view']});renderRecent();
 t.onPlay=()=>{if(t.time<.1||t.song.id!==t.lastPlayedId){const entries=readSetting('recentSongs',[]),old=entries.find(s=>s.id===t.song.id);writeSetting('recentSongs',[{id:t.song.id,date:new Date().toISOString(),count:(old?.count||0)+1},...entries.filter(s=>s.id!==t.song.id)].slice(0,30));t.lastPlayedId=t.song.id;const counts=readSetting('playCounts',{});counts[t.song.id]=(counts[t.song.id]||0)+1;writeSetting('playCounts',counts);}};
 t.onJudge=(kind,n)=>{if(settings.praise){feedback.textContent=kind==='correct'?'Good!':kind==='wrong'?'Try the highlighted notes':'Missed';feedback.dataset.kind=kind;feedbackUntil=performance.now()+650;}if(kind==='correct'&&n)roll.addParticle?.(n.midi+t.transpose);};
 t.onLoopRetry=()=>api.toast('Loop restarted — try that section again.');
 function key(e){if(e.repeat||document.querySelector('dialog[open]')||e.target.matches('textarea,input:not([type=range]):not([type=checkbox]):not([type=color]),[contenteditable=true]'))return false;const action=Object.keys(bindings).find(k=>bindings[k]===shortcutCode(e));if(!action)return false;if(t.mode==='free'&&!['record','fullscreen','notes'].includes(action)){e.preventDefault();return true;}e.preventDefault();e.stopImmediatePropagation();const clicks={forward:'skip',faster:'faster',slower:'slower',restart:'restart',sheet:'sheet-button',bookmark:'bookmark-button',record:'record-button',loop:'loop-button',fullscreen:'fullscreen',metronome:'metronome',notes:'show-falling',measures:'show-measures'};if(action==='back'){if(t.mode!=='recital'&&!t.recording)t.seek(t.time-5);}else if(action==='labels'){const modes=['notes','fingers','off'];$('labels').value=modes[(modes.indexOf(roll.label)+1)%modes.length];$('labels').dispatchEvent(new Event('change'));}else $(clicks[action])?.click();return true;}
 function frame(now){
  feedback.hidden=now>feedbackUntil||!settings.praise;fps.hidden=!settings.benchmark;frames++;if(now-lastFps>=1000){fps.textContent=`${Math.round(frames*1000/(now-lastFps))} FPS`;lastFps=now;frames=0;}
  document.body.classList.toggle('idle-pointer',settings.hideCursor&&t.running&&now-lastPointer>2000&&nav.isPlayer());
  if(t.mode!=='free'&&!settings.showPaused&&!t.running&&!t.waiting.length&&t.time>0)$('practice-cue').hidden=true;
  if(t.wrongHeld.size){$('practice-cue').hidden=false;$('practice-cue').textContent='Release the incorrect keys to continue';}
  if(settings.customRange&&roll.range.join(':')!==range){roll.setRange(settings.rangeLow,settings.rangeHigh);range=roll.range.join(':');}
  const signature=t.song.keySignatures?.filter(k=>k.time<=t.time).at(-1),pitches={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};const tonic=settings.tonic==='auto'?((pitches[signature?.key]??0)+(signature?.scale==='minor'?9:0))%12:Number(settings.tonic);if(roll.tonic!==tonic){roll.tonic=tonic;roll.updateLabels();}
 }
 return {settings,bindings,key,frame,liveInput(midi,velocity){const expected=t.expectedInput(midi),practice=t.running&&['wait','rhythm','recital'].includes(t.mode);return {sound:settings.inputSound!=='silent'&&(settings.inputSound!=='correct'||!practice||!!expected),velocity:settings.loudness==='fixed'?.8:settings.loudness==='song'&&expected?expected.velocity:velocity};},complete(){if(settings.fanfare){[72,76,79,84].forEach((n,i)=>setTimeout(()=>audio.note(n,.5,.35,`fanfare:${n}`),i*100));}}};
}
