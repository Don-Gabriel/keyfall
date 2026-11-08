import { exportFile, nativePlatform, installNativeNavigation } from './platform.js';
import './style.css';
import { makeDemos, importSong, normalizeSong, exportMidi, songToXML, noteName, formatTime, escapeXML, assignMidiHands, instrumentNames } from './music.js';
import { Transport, PianoAudio } from './engine.js';
import { PianoRoll } from './roll.js';
import { songStore, readSetting, writeSetting } from './storage.js';
import { soundBankStore } from './soundbank.js';
import { Profiles } from './profiles.js';
import { createNavigation } from './navigation.js';
import { installButtonChoices } from './button-choices.js';
import { createAdvanced } from './advanced.js';
import { createLibraryTools } from './library-tools.js';

const $ = id => document.getElementById(id);
const esc = escapeXML;
const icons = {
  play: '<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="5"/>',
  back: '<path d="M5 5v14m14-14L7 12l12 7z"/>',
  next: '<path d="M19 5v14M5 5l12 7-12 7z"/>',
  library: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="11" y="4" width="4" height="16" rx="1"/><path d="m18 4 3 16"/>',
  settings: '<path d="m9 3-1 3-3 1 1 4-2 2 2 3 3-1 2 3 3-1 1-3 3-1-1-4 2-2-2-3-3 1-2-3z"/><circle cx="11" cy="11" r="3"/>',
  fullscreen: '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6"/>',
  piano: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v9h3V4m4 0v9h3V4M8 13v7m8-7v7"/>',
  loop: '<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>',
  music: '<path d="M9 17V5l12-2v12M9 8l12-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="18" cy="16" rx="3" ry="2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  record: '<circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M3 17v4h18v-4"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.music}</svg>`;
const button = (id, label, glyph, cls = '') => `<button id="${id}" class="${cls}" title="${label}" aria-label="${label}">${icon(glyph)}<span>${label}</span></button>`;

$('app').innerHTML = `
<header class="toolbar">
  <div class="brand"><img src="/icon.svg" alt="" width="30" height="30"><strong>Keyfall</strong></div>
  ${button('library-button','Song library','library')}
  <div class="transport">
    ${button('restart','Restart song','back','icon-button')}
    ${button('play','Play','play','icon-button play-button')}
    ${button('skip','Skip forward 5 seconds','next','icon-button')}
    <div class="speed"><button id="slower" aria-label="Decrease speed">−</button><button id="speed-reset" title="Reset to original speed"><strong id="speed-value">100%</strong><small id="bpm">96 BPM</small></button><button id="faster" aria-label="Increase speed">+</button></div>
  </div>
  <div class="toolbar-end">${button('midi-button','Connect piano','piano')}${button('settings-button','Settings','settings','icon-button')}${button('help-button','Help','help','icon-button')}${button('fullscreen','Fullscreen','fullscreen','icon-button')}</div>
</header>
<main>
  <section class="songbar" aria-label="Song and practice controls">
    <div class="song-title"><h1 id="song-title"></h1><p id="composer"></p></div>
    <div class="mode-group" role="group" aria-label="Practice mode"><button data-mode="listen" aria-pressed="true">Listen</button><button data-mode="wait" aria-pressed="false">Learn notes</button><button data-mode="rhythm" aria-pressed="false">Practice rhythm</button><button data-mode="recital" aria-pressed="false">Recital</button></div>
    <div class="hand-control"><span>Hands</span><select id="hands" hidden aria-hidden="true" tabindex="-1"><option value="both">Both hands</option><option value="right">Right only</option><option value="left">Left only</option></select><div id="hand-buttons" role="group" aria-label="Practice hands"><button data-hand="left" aria-pressed="false">Left</button><button data-hand="both" aria-pressed="true">Both</button><button data-hand="right" aria-pressed="false">Right</button></div></div>
    ${button('sheet-button','Sheet music','music','subtle')}
  </section>
  <section class="timeline" aria-label="Song timeline"><span id="time-current">0:00</span><input id="seek" aria-label="Song position" type="range" min="0" max="100" value="0" step="0.01"><span id="time-total">0:00</span></section>
  <section id="score-panel" class="score-panel" hidden><div class="score-tools"><span id="score-message">Loading sheet music…</span><label><input type="checkbox" id="score-follow" checked> Follow</label><button id="score-expand" aria-pressed="false">Score only</button><button id="score-print">Print score</button><button id="score-close" aria-label="Close sheet music">${icon('close')}</button></div><div id="score"></div></section>
  <section class="instrument" aria-label="Piano visualizer">
    <div class="roll-wrap"><canvas id="roll" role="img" aria-label="Falling piano notes. Green notes are the right hand; blue notes are the left hand. Use the on-screen or connected keyboard to play."></canvas>
      <div class="roll-legend"><span class="left-dot">Left hand</span><span class="right-dot">Right hand</span></div>
      <div id="practice-cue" class="practice-cue" role="status">Press play to begin</div>
      <div class="roll-bottom"><span id="chord-label">88-key piano</span><span id="score-live"></span></div>
    </div>
    <div id="keyboard" class="keyboard" role="group" aria-label="Playable piano keyboard"></div>
  </section>
  <section class="practicebar" aria-label="Practice tools">
    <div class="tools-group">${button('loop-button','Loop','loop','compact')}<button id="loop-a" title="Set loop start at current position">A <span>0:00</span></button><button id="loop-b" title="Set loop end at current position">B <span>0:00</span></button>${button('bookmark-button','Bookmark','bookmark','compact')}<select id="bookmarks" aria-label="Jump to bookmark"><option value="">Bookmarks</option></select></div>
    <div class="tools-group"><label><input type="checkbox" id="metronome"> Metronome</label><label><input type="checkbox" id="count-in"> Count-in</label><label>Labels <select id="labels"><option value="notes">Notes</option><option value="fingers">Fingers</option><option value="off">Off</option></select></label></div>
    <div class="tools-group">${button('record-button','Record','record','compact record-button')}${button('export-button','Export MIDI','download','compact')}</div>
  </section>
  <footer><span id="device-status">Computer keyboard ready</span><span id="keyboard-hint"><kbd>A</kbd>–<kbd>;</kbd> play · <kbd>Z</kbd>/<kbd>X</kbd> octave · <kbd>Space</kbd> play / pause</span><span id="octave-label">C4–E5</span></footer>
</main>
<input type="file" id="file-input" accept=".mid,.midi,.xml,.musicxml,.mxl" multiple hidden>
<dialog id="library-dialog" class="library-dialog">
  <div class="dialog-heading"><div><h2>Your music</h2><p>A song, a little practice, a little progress.</p></div><button data-close aria-label="Close song library">${icon('close')}</button></div>
  <div class="library-controls"><input id="song-search" type="search" placeholder="Find a song or composer" aria-label="Search songs"><select id="library-filter" aria-label="Filter songs"><option value="all">All songs</option><option value="favorites">Favorites</option><option value="imported">Imported & recorded</option><option value="included">Included exercises</option></select>${button('import-button','Import songs','upload','primary')}</div>
  <div class="library-options"><p class="library-note">MIDI and MusicXML · Files stay on this computer</p><select id="library-sort" aria-label="Sort songs"><option value="title">Title A–Z</option><option value="duration">Shortest first</option><option value="notes">Fewest notes</option><option value="best">Best accuracy</option><option value="recent">Recently practiced</option></select><button id="import-folder">Import folder</button></div>
  <div id="song-list" class="song-list"></div>
  <div class="library-footer"><p id="library-summary"></p><button id="progress-button">Practice history</button></div>
</dialog>
<dialog id="settings-dialog">
  <div class="dialog-heading"><div><h2>Piano settings</h2><p>Make this space work for you.</p></div><button data-close aria-label="Close settings">${icon('close')}</button></div>
  <div class="settings-grid">
    <label>Master volume <output id="volume-value">65%</output><input id="volume" type="range" min="0" max="1" step=".01" value=".65"></label>
    <label>Volume boost <select id="volume-boost"><option value="0">Off</option><option value="6" selected>+6 dB · louder</option><option value="12">+12 dB · quiet recordings</option></select></label>
    <div class="sound-test"><button id="sound-test">Test piano sound</button><small>Version 0.5.0 · boosted output with peak protection</small></div>
    <label>Sound <select id="tone"><option value="grand">Grand piano · sampled</option><option value="bank">Song instruments · SoundFont</option><option value="piano">Synthesized piano</option><option value="soft">Soft keys</option><option value="organ">Organ</option></select></label>
    <label>Playback speed <input id="speed-slider" type="range" min="10" max="200" step="5" value="100"></label>
    <label>Transpose <select id="transpose">${Array.from({length:25},(_,i)=>`<option value="${i-12}" ${i===12?'selected':''}>${i-12>0?'+':''}${i-12} semitones</option>`).join('')}</select></label>
    <label>Visible keyboard <select id="key-range"><option value="full">Full piano · 88 keys</option><option value="song">Fit to song</option><option value="compact">Computer keyboard · C3–C6</option></select></label>
    <label>Note look-ahead <select id="lookahead"><option value="3">3 seconds</option><option value="5" selected>5 seconds</option><option value="8">8 seconds</option><option value="12">12 seconds</option></select></label>
  </div>
  <details class="settings-section"><summary>SoundFonts and instruments</summary><p class="muted">GeneralUser GS is included for full MIDI instrument and drum playback. Load an SF2, SF3, or DLS file to use your own sounds.</p><div class="soundfont-actions"><button id="load-soundfont">Load SoundFont</button><button id="reset-soundfont">Use included soundbank</button></div><p id="soundfont-status" role="status">Included soundbank ready to load</p><label>Free-play instrument <select id="live-instrument">${instrumentNames.map((n,i)=>`<option value="${i}">${i+1}. ${esc(n)}</option>`).join('')}</select></label></details>
  <details class="settings-section"><summary>Display and practice options</summary><div class="settings-grid">
    <label>Keyboard labels <select id="key-labels"><option value="octaves">Octaves (C2, C3…)</option><option value="notes">Note names</option><option value="mapping">Computer keys (A, W, S…)</option><option value="solfege">Fixed Do (Do, Re, Mi…)</option><option value="numbers">Scale numbers</option><option value="off">No labels</option></select></label>
    <label>Falling-note labels <select id="note-labels"><option value="notes">Note names</option><option value="solfege">Fixed Do</option><option value="numbers">Scale numbers</option><option value="mapping">Computer keys</option><option value="fingers">Finger hints</option><option value="off">No labels</option></select></label>
    <label>Label size <input id="label-size" type="range" min="8" max="20" value="12" step="1"></label>
    <label>Input timing offset <input id="input-offset" type="number" min="-300" max="300" step="10" value="0"><small>Milliseconds; positive compensates for delayed input.</small></label>
    <label><input id="show-measures" type="checkbox" checked> Show measure lines</label>
    <label><input id="show-falling" type="checkbox" checked> Show falling notes</label>
    <label><input id="play-my-part" type="checkbox"> Play my parts in the background</label>
    <label><input id="automatic-octave" type="checkbox"> Move computer-keyboard octave to upcoming notes</label>
    <label><input id="high-contrast" type="checkbox"> High-contrast note labels</label>
    <label><input id="focus-mode" type="checkbox"> Hide song and tool bars while playing</label>
  </div></details>
  <h3>Song parts</h3><p class="muted">Blue = left hand. Green = right hand. Auto uses track names and pitch ranges for MIDI, or staff assignments for MusicXML. These are estimates when the file does not identify hands.</p><div id="track-list"></div>
  <div class="hand-split"><label>Right hand starts at <select id="hand-split">${Array.from({length:88},(_,i)=>`<option value="${i+21}" ${i+21===60?'selected':''}>${noteName(i+21)}</option>`).join('')}</select></label><button id="apply-split">Split hands here</button><button id="auto-colors">Auto colors</button></div><p id="hand-summary" class="muted"></p>
  <p class="muted">To add finger hints, pause and click a falling note.</p>
  <details class="settings-section"><summary>Saved bookmarks</summary><div id="bookmark-editor"></div></details>
</dialog>
<dialog id="midi-dialog">
  <div class="dialog-heading"><div><h2>Connect your piano</h2><p>USB MIDI input and output</p></div><button data-close aria-label="Close piano connections">${icon('close')}</button></div>
  <p>Plug in your MIDI keyboard, then enable access. Allow the browser’s device permission when prompted.</p>
  <button id="midi-connect" class="primary">Enable MIDI access</button><p id="midi-message" role="status">Your computer keyboard and on-screen piano also work without a MIDI device.</p>
  <p id="midi-test" role="status">Play your connected keyboard to check incoming notes here.</p>
  <div class="settings-grid"><label>Input <select id="midi-input"><option value="all">All connected keyboards</option></select></label><label>Output <select id="midi-output"><option value="">Computer speakers only</option></select></label></div>
  <p class="muted">Choose an output to send notes to your digital piano. Lower master volume to silence the computer speakers. Use your piano’s Local Control setting if you hear doubled notes.</p>
</dialog>
<dialog id="help-dialog">
  <div class="dialog-heading"><div><h2>A little help at the piano</h2><p>Start with Listen, then learn one hand at a time.</p></div><button data-close aria-label="Close help">${icon('close')}</button></div>
  <dl class="help-list"><dt>Listen</dt><dd>The song plays itself. Watch the notes meet the keyboard.</dd><dt>Learn notes</dt><dd>The song waits at each note or chord until you play all selected-hand notes. The other hand accompanies you.</dd><dt>Practice rhythm</dt><dd>The song keeps moving. Play within 180 ms of the note’s position; hits, missed notes, and wrong notes count toward your score.</dd><dt>Recital</dt><dd>A complete attempt at original speed. Seeking and loops are disabled. You can pause or leave this mode at any time.</dd><dt>Free play</dt><dd>Play freely or record a performance, then save it as a song and export MIDI.</dd><dt>Practice a section</dt><dd>Seek to the start and click A. Seek to the end and click B. Turn on Loop. Bookmarks save useful positions; rename or remove them in Settings.</dd></dl>
  <h3>Computer keyboard</h3><div class="key-guide"><code>A W S E D F T G Y H U J K O L P ; ' </code><span>C C♯ D D♯ E F F♯ G G♯ A A♯ B C C♯ D D♯ E F</span></div>
  <p><kbd>Z</kbd>/<kbd>X</kbd> change octave. Hold <kbd>Shift</kbd> for sustain. <kbd>Space</kbd> starts or pauses. Arrow keys seek five seconds. <kbd>Escape</kbd> silences notes.</p>
  <p class="muted">Keyfall is an independent local app. The included pieces are short practice arrangements. MIDI sheet music is automatically quantized. MusicXML playback follows written measures; repeats, grace notes and ornaments are not expanded. Device-specific light guides are not supported. For MIDI instruments and drums, select Song instruments in Settings. SF2, SF3 and DLS soundbanks can be loaded there.</p>
  <p class="muted">Offline grand piano: FluidR3 samples, converted by Benjamin Gleitzman, <a href="https://github.com/gleitz/midi-js-soundfonts" target="_blank" rel="noopener">source and attribution</a>, <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>. A synthesized fallback is included.</p>
</dialog>
<dialog id="history-dialog"><div class="dialog-heading"><div><h2>Practice history</h2><p>Saved on this computer</p></div><button data-close aria-label="Close history">${icon('close')}</button></div><div id="history-content"></div></dialog>
<dialog id="result-dialog"><div class="dialog-heading"><h2>Practice complete</h2><button data-close aria-label="Close practice result">${icon('close')}</button></div><div id="result-content"></div><button id="practice-again" class="primary">Practice again</button></dialog>
<dialog id="finger-dialog"><div class="dialog-heading"><h2 id="finger-title">Finger hint</h2><button data-close aria-label="Close finger hint">${icon('close')}</button></div><p>1 = thumb, 5 = little finger. This hint appears on the falling note.</p><div id="finger-buttons" class="finger-buttons">${[0,1,2,3,4,5].map(n=>`<button data-finger="${n}">${n||'Clear'}</button>`).join('')}</div></dialog>
<div id="toast" class="toast" role="status" hidden></div>
<div id="drop-overlay" hidden>Drop MIDI or MusicXML songs here</div>`;

const soundfontInput=document.createElement('input');soundfontInput.type='file';soundfontInput.accept='.sf2,.sf3,.dls';soundfontInput.id='soundfont-file';soundfontInput.hidden=true;document.body.append(soundfontInput);
const folderInput=document.createElement('input');folderInput.type='file';folderInput.webkitdirectory=true;folderInput.multiple=true;folderInput.id='folder-input';folderInput.hidden=true;document.body.append(folderInput);
const overdubButton=document.createElement('button');overdubButton.id='overdub-button';overdubButton.textContent='Add recording layer';overdubButton.title='Record a new track over this song at original speed';$('record-button').after(overdubButton);overdubButton.onclick=()=>startRecording(true);
const freeTools=document.createElement('div');freeTools.id='free-tools';freeTools.innerHTML='<button id="free-sound">Instrument & sound</button><span id="free-recording-status" role="status">Record something to save it to your library.</span>';document.querySelector('.practicebar').prepend(freeTools);
$('free-sound').onclick=()=>{navigation.selectSettings('sound');navigation.go('settings');};

const audio = new PianoAudio();
const transport = new Transport(audio);
const demos = makeDemos();
let songs = [...demos], currentSong = demos[0], octave = 4, midiAccess, selectedInput = 'all', recording = null, fingerNote, scoreRenderer, scoreGeneration = 0;
let savedStats = '', toastTimer, lastFrame = performance.now(), lastUI = 0, scoreReady = false, lastScoreBeat = -1;
let navigation,buttonChoices,advanced,libraryTools;
let lastFreeRecording=null;
let freePlayStarted=false;
let recordingSave=null;
const sources = new Map(), heldComputer = new Map();
const profiles=new Profiles();
const preferences = readSetting('preferences', nativePlatform?{range:'compact'}:{}), favorites = new Set(profiles.read('favorites', []));
let history = profiles.read('history', []), songPrefs = readSetting('songs', {});
const roll = new PianoRoll($('roll'), $('keyboard'), transport, press, release, n=>{ fingerNote=n;$('finger-title').textContent=`Finger hint · ${noteName(n.midi)}`;$('finger-dialog').showModal(); });

function toast(message) { clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,6000); }
function persist(key,value) { if(!(['history','favorites'].includes(key)?profiles.write(key,value):writeSetting(key,value)))toast('Browser storage is full or unavailable. Export your songs to keep a copy.'); }
function savePreferences() {
  Object.assign(preferences,{volume:audio.volume,boostDb:audio.boostDb,tone:audio.tone,speed:transport.speed,range:$('key-range').value,labels:roll.label,keyLabels:roll.keyLabel,labelSize:roll.labelSize,showMeasures:roll.showMeasures,showNotes:roll.showNotes,highContrast:roll.highContrast,inputOffset:transport.inputOffset||0,playMyPart:!!transport.playMyPart,automaticOctave:$('automatic-octave').checked,focusMode:$('focus-mode').checked,liveInstrument:Number($('live-instrument').value),lookahead:roll.window,octave,metronome:transport.metronome,countIn:transport.countIn});persist('preferences',preferences);
}
function saveSongPreferences() {
  songPrefs[currentSong.id]={...songPrefs[currentSong.id],splitPoint:currentSong.splitPoint??60,tracks:currentSong.tracks.map(t=>({id:t.id,role:t.role,instrument:t.instrument,volume:t.volume,color:t.color,muted:t.muted,hidden:t.hidden,pan:t.pan})),fingers:Object.fromEntries(currentSong.notes.filter(n=>n.finger).map(n=>[n.id,n.finger])),bookmarks:songPrefs[currentSong.id]?.bookmarks||[]};persist('songs',songPrefs);
}
function saveSession() {
  const s=transport.stats, key=JSON.stringify(s);
  if(s.correct+s.wrong+s.missed===0||savedStats===key)return;
  history.unshift({song:currentSong.title,songId:currentSong.id,date:new Date().toISOString(),mode:transport.mode,hands:transport.hands,speed:transport.speed,...s});history=history.slice(0,500);persist('history',history);savedStats=key;
}
function accuracy(s) {const total=s.correct+s.wrong+s.missed;return total?Math.round(100*s.correct/total):0;}
function refreshRange() {
  const type=$('key-range').value;
  if(type==='full')roll.setRange(21,108);
  else if(type==='compact')roll.setRange(48,84);
  else {let min=108,max=21;currentSong.notes.forEach(n=>{min=Math.min(min,n.midi+transport.transpose);max=Math.max(max,n.midi+transport.transpose);});roll.setRange(Math.min(48,Math.max(21,min-2)),Math.max(72,Math.min(108,max+2)));}
}
function loadSong(song) {
  if(recording)stopRecording();saveSession();releaseAll();currentSong=song;
  if(song.source==='MIDI'&&song.handAssignmentVersion!==3)assignMidiHands(song);
  const pref=songPrefs[song.id];if(pref){song.splitPoint=pref.splitPoint??song.splitPoint??60;for(const t of song.tracks){const stored=pref.tracks?.find(p=>p.id===t.id);if(stored)Object.assign(t,stored);}for(const n of song.notes)if(pref.fingers?.[n.id])n.finger=pref.fingers[n.id];}
  transport.load(song);savedStats='';$('song-title').textContent=song.title;$('composer').textContent=`${song.composer} · ${song.source}`;
  $('seek').max=song.duration;$('time-total').textContent=formatTime(song.duration);$('loop-button').setAttribute('aria-pressed','false');
  updateLoop();updateBookmarks();refreshRange();updateTracks();updateUI();
  if(!$('score-panel').hidden)renderScore();
  persist('lastSong',song.id);if(song.warning)toast(song.warning);
}
function updateTracks(){
  const active=document.activeElement,focused=$('track-list').contains(active)?(active.closest('.button-choice')?.querySelector('select')||active):null;
  const focusTrack=focused?.dataset.track,focusField=focused?.dataset.field;
  $('track-list').innerHTML=currentSong.tracks.map(t=>`<div class="track-card"><strong>${esc(t.name)}</strong><div class="track-controls"><label>Hand<select data-track="${t.id}" data-field="role" aria-label="Role for ${esc(t.name)}">${[['split','Auto hand'],['pitch','Use split point'],['right','Right hand'],['left','Left hand'],['accompaniment','Accompaniment'],['mute','Hide part']].map(([v,l])=>`<option value="${v}" ${t.role===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Instrument<select data-track="${t.id}" data-field="instrument" aria-label="Instrument for ${esc(t.name)}">${instrumentNames.map((n,i)=>`<option value="${i}" ${(t.instrument||0)===i?'selected':''}>${esc(n)}</option>`).join('')}</select></label><label>Volume<input data-track="${t.id}" data-field="volume" aria-label="Volume for ${esc(t.name)}" type="range" min="0" max="1" step=".05" value="${t.volume??1}"></label><label>Color<input data-track="${t.id}" data-field="color" aria-label="Color for ${esc(t.name)}" type="color" value="${t.color||((t.role==='left'||currentSong.notes.find(n=>n.track===t.id)?.hand==='left')?'#8dbde8':'#a5e86b')}"></label><label><input data-track="${t.id}" data-field="muted" type="checkbox" aria-label="Mute ${esc(t.name)}" ${t.muted?'checked':''}>Mute</label><label><input data-track="${t.id}" data-field="hidden" type="checkbox" aria-label="Hide notes for ${esc(t.name)}" ${t.hidden?'checked':''}>Hide falling notes</label><label>Pan<input data-track="${t.id}" data-field="pan" aria-label="Pan for ${esc(t.name)}" type="range" min="-1" max="1" step=".1" value="${t.pan??0}"></label></div></div>`).join('');
  $('hand-split').value=currentSong.splitPoint??60;
  const count={left:0,right:0};for(const n of currentSong.notes){const role=transport.role(n);if(role in count)count[role]++;}
  $('hand-summary').textContent=`${count.left} left-hand notes (blue) · ${count.right} right-hand notes (green).`;
  if(focusTrack!==undefined&&focusField)queueMicrotask(()=>{const control=$('track-list').querySelector(`[data-track="${focusTrack}"][data-field="${focusField}"]`);(control?.closest('.button-choice')?.querySelector('.choice-trigger')||control)?.focus({preventScroll:true});});
}
function setMode(mode) {
  saveSession();transport.pause();releaseAll();transport.mode=mode;transport.seek(transport.time);transport.resetStats();savedStats='';
  if(mode==='recital'){transport.speed=1;transport.loop=false;transport.seek(0);updateLoop();}
  for(const id of ['slower','faster','speed-reset','speed-slider','loop-button','loop-a','loop-b','restart','skip'])$(id).disabled=mode==='recital';
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  $('hands').disabled=mode==='listen'||mode==='free';$('play').disabled=mode==='free';$('seek').disabled=mode==='free'||mode==='recital';
  document.querySelectorAll('[data-hand]').forEach(b=>b.disabled=mode==='free');
  document.querySelector('main').classList.toggle('free-playing',mode==='free');
  $('song-title').textContent=mode==='free'?'Free play':currentSong.title;$('composer').textContent=mode==='free'?'Play, explore, and record your own music':`${currentSong.composer} · ${currentSong.source}`;
  $('keyboard-hint').innerHTML=mode==='free'?'<kbd>A</kbd>–<kbd>;</kbd> play · <kbd>Z</kbd>/<kbd>X</kbd> octave · <kbd>Shift</kbd> sustain':'<kbd>A</kbd>–<kbd>;</kbd> play · <kbd>Z</kbd>/<kbd>X</kbd> octave · <kbd>Space</kbd> play / pause';
  if(mode==='free'){$('score-panel').hidden=true;$('sheet-button').setAttribute('aria-pressed','false');$('score-expand').setAttribute('aria-pressed','false');document.querySelector('main').classList.remove('score-only');}
  $('record-button').disabled=false;navigation?.syncMode(mode);updateUI();
}
async function togglePlay() {
  if(transport.mode==='free'||togglePlay.pending||(navigation&&!navigation.isPlayer()))return;
  if(transport.running)transport.pause();else{togglePlay.pending=true;try{if(audio.tone==='bank')await ensureSoundBank();await audio.ready();if(!navigation||navigation.isPlayer())transport.play();}catch{toast('Audio could not start. Check your browser audio permissions.');}finally{togglePlay.pending=false;}}updateUI();
}
async function ensureSoundBank(){
  if(!audio.bankReady){
    $('soundfont-status').textContent='Loading soundbank…';
    let saved;try{saved=await soundBankStore('get');}catch{}
    try{await audio.loadBank(saved?.buffer);$('soundfont-status').textContent=saved?.name||'GeneralUser GS · included soundbank';}
    catch(e){audio.bankReady=null;audio.tone='grand';$('tone').value='grand';$('soundfont-status').textContent='Could not load soundbank. Grand piano is available.';toast('Soundbank could not load. Try another SF2 file.');throw e;}
  }else await audio.bankReady;
  audio.bank.liveProgram=Number($('live-instrument').value);
}
function setSpeed(value) { transport.speed=Math.round(Math.max(.1,Math.min(2,value))*100)/100;audio.panic();$('speed-slider').value=transport.speed*100;savePreferences();updateUI(); }
function updateLoop(){ $('loop-a').querySelector('span').textContent=formatTime(transport.loopA);$('loop-b').querySelector('span').textContent=formatTime(transport.loopB);$('loop-button').setAttribute('aria-pressed',String(transport.loop)); }
function updateBookmarks(){const list=songPrefs[currentSong.id]?.bookmarks||[];$('bookmarks').innerHTML='<option value="">Bookmarks</option>'+list.map((b,i)=>`<option value="${i}">${esc(b.name)} · ${formatTime(b.time)}</option>`).join('');$('bookmark-editor').innerHTML=list.length?list.map((b,i)=>`<div class="bookmark-row"><input data-rename-bookmark="${i}" aria-label="Bookmark ${i+1} name" value="${esc(b.name)}" maxlength="80"><span>${formatTime(b.time)}</span><button data-delete-bookmark="${i}" aria-label="Delete bookmark ${i+1}">Remove</button></div>`).join(''):'<p class="muted">Use Bookmark below the keyboard to save a position.</p>';}
function chordName(notes){
  const pitches=[...new Set(notes.map(n=>n%12))].sort((a,b)=>a-b);if(!pitches.length)return'';
  if(pitches.length===1)return noteName(notes[0]);
  for(const root of pitches){const rel=pitches.map(p=>(p-root+12)%12).sort((a,b)=>a-b).join(',');const suffix={'0,4,7':'major','0,3,7':'minor','0,4,7,10':'7','0,4,7,11':'maj7','0,3,7,10':'m7','0,3,6':'dim','0,5,7':'sus4','0,2,7':'sus2'}[rel];if(suffix)return`${noteName(root+60).replace(/\d/,'')} ${suffix}`;}
  return notes.map(noteName).join(' + ');
}
function updateUI(){
  const free=transport.mode==='free';overdubButton.hidden=free;$('record-button').hidden=!free&&!recording?.overdub;
  $('record-button').disabled=!!recordingSave;$('record-button').setAttribute('aria-busy',String(!!recordingSave));
  $('export-button').disabled=!!recordingSave||free&&(!lastFreeRecording||!!recording);$('export-button').title=free?'Export last free-play recording':'Export MIDI';
  const status=recordingSave?'Saving recording…':recording&&!recording.overdub?`Recording ${formatTime(recordTime())}`:lastFreeRecording?`Saved: ${lastFreeRecording.title}`:'Record something to save it to your library.';
  if($('free-recording-status').textContent!==status)$('free-recording-status').textContent=status;
  overdubButton.disabled=!!recording||!!recordingSave;for(const id of ['seek','restart','skip','loop-button','loop-a','loop-b','slower','faster','speed-reset','speed-slider'])if(recording?.overdub)$(id).disabled=true;else if($(id).dataset.recordingLock==='true'){$(id).disabled=transport.mode==='recital';delete $(id).dataset.recordingLock;}
  if(recording?.overdub)for(const id of ['seek','restart','skip','loop-button','loop-a','loop-b','slower','faster','speed-reset','speed-slider'])$(id).dataset.recordingLock='true';
  buttonChoices?.refresh();
  document.querySelectorAll('[data-hand]').forEach(b=>b.setAttribute('aria-pressed',String(transport.hands===b.dataset.hand)));
  // Keep the button's hit target alive between pointerdown and pointerup.
  // Replacing its SVG every animation update used to swallow normal clicks.
  if($('play').dataset.running!==String(transport.running)){
    $('play').dataset.running=String(transport.running);
    $('play').innerHTML=icon(transport.running?'pause':'play')+`<span>${transport.running?'Pause':'Play'}</span>`;
    $('play').setAttribute('aria-label',transport.running?'Pause':'Play');$('play').title=transport.running?'Pause (Space)':'Play (Space)';
  }
  $('speed-value').textContent=`${Math.round(transport.speed*100)}%`;
  const bpm=currentSong.tempos?.filter(t=>t.time<=transport.time).at(-1)?.bpm||currentSong.bpm;$('bpm').textContent=`${Math.round(bpm*transport.speed)} BPM`;
  if(!$('seek').matches(':active'))$('seek').value=transport.time;$('seek').style.setProperty('--progress',`${transport.time/currentSong.duration*100}%`);$('time-current').textContent=formatTime(transport.time);
  const s=transport.stats;$('score-live').textContent=['wait','rhythm','recital'].includes(transport.mode)?`${s.correct} correct  ·  ${s.missed} missed  ·  ${s.wrong} wrong${s.correct+s.missed+s.wrong?`  ·  ${accuracy(s)}%`:''}`:'';
  document.querySelector('main').classList.toggle('focus-playing',transport.running&&$('focus-mode').checked);
  let cue='';
  if(recording||recordingSave)cue='';
  else if(transport.mode==='free')cue=freePlayStarted?'':'Your piano. Your pace.';
  else if(transport.preRoll>0&&transport.running)cue=`Ready… ${Math.ceil(transport.preRoll*transport.preRollBpm/60*transport.preRollMeter[1]/4)}`;
  else if(transport.waiting.length)cue=`Play ${[...new Set(transport.waiting.map(n=>noteName(n.midi+transport.transpose)))].join(' + ')}`;
  else if(!transport.running)cue=transport.time>=currentSong.duration?'Song complete':transport.time>0?'Paused':'Press play to begin';
  const el=$('practice-cue');if(el.textContent!==cue)el.textContent=cue;el.hidden=!cue;
  $('chord-label').textContent=chordName([...transport.held])||(transport.mode==='free'?'Play a chord to see its name':`${roll.range[1]-roll.range[0]+1}-key view`);
  $('octave-label').textContent=`${noteName((octave+1)*12)}–${noteName((octave+1)*12+17)}`;
}

async function press(midi,velocity=.75,source=`live:${midi}`) {
  if(navigation&&!navigation.isPlayer()&&!(navigation.view()==='devices'&&source.startsWith('midi:')))return;
  if(navigation?.view()==='devices')$('midi-test').textContent=`Received ${noteName(midi)} · velocity ${Math.round(velocity*127)}`;
  if(sources.has(source))return;
  if(transport.mode==='free'&&(!navigation||navigation.view()==='free'))freePlayStarted=true;
  sources.set(source,midi);const already=[...sources.entries()].some(([k,v])=>k!==source&&v===midi);
  const live=advanced?.liveInput(midi,velocity)||{sound:true,velocity};
  // Capture the event before async audio initialization so a quick release cannot stick.
  if(!already){transport.press(midi);if(recording){const pending=recording.pending.get(midi);if(pending){pending.duration=Math.max(.03,recordTime()-pending.time);recording.pending.delete(midi);}const n={midi,time:recordTime(),duration:.1,velocity,track:0};recording.notes.push(n);recording.held.set(midi,n);}}
  try{if(audio.tone==='bank')await ensureSoundBank();await audio.ready();if(sources.get(source)===midi&&!already&&live.sound)audio.note(midi,live.velocity);}catch{toast('Could not start audio.');}
  updateUI();
}
function release(midi,source=`live:${midi}`) {
  if(!sources.has(source))return;sources.delete(source);
  if([...sources.values()].includes(midi))return;
  audio.stop(`live:${midi}`);transport.release(midi);
  const n=recording?.held.get(midi);if(n){n.duration=Math.max(.03,recordTime()-n.time);recording.held.delete(midi);if(audio.sustain)recording.pending.set(midi,n);}
}
function pedal(down){audio.pedal(down);if(!down&&recording){for(const n of recording.pending.values())n.duration=Math.max(.03,recordTime()-n.time);recording.pending.clear();}}
function releaseAll(){for(const [source,midi]of [...sources])release(midi,source);heldComputer.clear();pedal(false);audio.panic();transport.held.clear();}

function renderLibrary(){
  const focused=$('song-list').contains(document.activeElement)?document.activeElement:null;
  const focusAction=focused&&['favorite','song','delete'].find(key=>focused.dataset[key]!==undefined),focusId=focusAction&&focused.dataset[focusAction];
  const focusIndex=focused?[...$('song-list').querySelectorAll('.song-row')].indexOf(focused.closest('.song-row')):-1;
  const query=$('song-search').value.toLowerCase(),filter=$('library-filter').value;
  const list=songs.filter(s=>(readSetting('showIncluded',true)||s.source!=='Included')&&(`${s.title} ${s.composer} ${s.group||''}`).toLowerCase().includes(query)&&(filter==='all'||filter==='favorites'&&favorites.has(s.id)||filter==='included'&&s.source==='Included'||filter==='imported'&&s.source!=='Included'));
  const best=id=>Math.max(0,...history.filter(h=>h.songId===id).map(accuracy)),recent=id=>history.find(h=>h.songId===id)?.date||'';
  const counts=readSetting('playCounts',{}),levels=['','Beginner','Easy','Intermediate','Advanced','Expert'];
  list.sort((a,b)=>({'duration':()=>a.duration-b.duration,'notes':()=>a.notes.length-b.notes.length,'best':()=>best(b.id)-best(a.id),'recent':()=>recent(b.id).localeCompare(recent(a.id)),'rating':()=>(b.rating||0)-(a.rating||0),'difficulty':()=>levels.indexOf(a.level||'')-levels.indexOf(b.level||''),'group':()=>String(a.group||a.source).localeCompare(b.group||b.source)||a.title.localeCompare(b.title),'plays':()=>(counts[b.id]||0)-(counts[a.id]||0)}[$('library-sort').value]||(()=>a.title.localeCompare(b.title)))());
  $('song-list').innerHTML=list.length?list.map(s=>{const sessions=history.filter(h=>h.songId===s.id),best=sessions.length?Math.max(...sessions.map(accuracy)):null;return`<article class="song-row ${s.id===currentSong.id?'current':''}"><button data-favorite="${esc(s.id)}" class="favorite" aria-label="${favorites.has(s.id)?'Unfavorite':'Favorite'} ${esc(s.title)}" aria-pressed="${favorites.has(s.id)}">${favorites.has(s.id)?'★':'☆'}</button><button class="song-select" data-song="${esc(s.id)}"><span class="song-art">${icon('music')}</span><span class="song-info"><strong>${esc(s.title)}</strong><small>${esc(s.composer)}${s.group?` · ${esc(s.group)}`:''}${s.rating?` · ${'★'.repeat(s.rating)}`:''}</small></span><span class="song-level">${esc(s.level||s.source)}</span><span class="song-meta">${s.notes.length} notes<br>${formatTime(s.duration)}</span><span class="best-score">${best===null?'—':best+'%'}<small>${best===null?'Not practiced':'Best accuracy'}</small></span><span class="row-play">${icon('play')}</span></button>${s.source!=='Included'?`<button class="delete-song" data-delete="${esc(s.id)}" aria-label="Remove ${esc(s.title)} from library">${icon('close')}</button>`:''}</article>`;}).join(''):'<div class="empty"><h3>No songs here yet</h3><p>Import a MIDI or MusicXML file, or try another search.</p></div>';
  if(focusAction){const buttons=[...$('song-list').querySelectorAll(`[data-${focusAction}]`)];const target=buttons.find(b=>b.dataset[focusAction]===focusId)||$('song-list').querySelectorAll('.song-select')[Math.max(0,Math.min(focusIndex,list.length-1))]||$('song-search');target.focus({preventScroll:true});}
  $('library-summary').textContent=`${songs.length} songs · ${history.length} saved practice sessions`;
}
async function importFiles(files){
  if(recording||recordingSave)await stopRecording();
  let imported=0,last=null;const failures=[];$('import-button').disabled=true;
  for(const file of files){try{const song=await importSong(file);await songStore('put',song);songs.push(song);last=song;imported++;}catch(e){failures.push(`${file.name}: ${e.message}`);}}
  $('import-button').disabled=false;if(last){loadSong(last);if(transport.mode==='free')setMode('listen');renderLibrary();if(navigation&&!navigation.isPlayer())await navigation.selected();else $('library-dialog').close();}toast(`${imported?`Imported ${imported} song${imported>1?'s':''}. `:''}${failures.join(' ')}`);
}
async function download(data,name,type){try{await exportFile(data,name,type);return true;}catch(error){toast('Export was cancelled or could not complete. Your song remains in the library.');return false;}}

function recordTime(){return recording?.overdub?transport.time:(performance.now()-recording.start)/1000;}
async function startRecording(overdub=false){
  if(recording||recordingSave||(!overdub&&transport.mode!=='free')||(overdub&&transport.mode==='free'))return;overdubButton.disabled=true;
  try{const base=overdub?structuredClone(currentSong):null;setMode(overdub?'listen':'free');releaseAll();if(overdub){setSpeed(1);transport.seek(0);transport.loop=false;transport.countIn=false;$('count-in').checked=false;}
  recording={start:performance.now(),overdub,base,instrument:Number($('live-instrument').value)||0,notes:[],held:new Map(),pending:new Map()};transport.recording=overdub;$('record-button').classList.add('recording');$('record-button').innerHTML=icon('record')+'<span>Stop & save</span>';$('record-button').setAttribute('aria-label','Stop and save recording');const session=recording;updateUI();await audio.ready();if(overdub&&recording===session)transport.play();}catch{toast('Could not start recording audio.');overdubButton.disabled=false;}
}
async function stopRecording(){
  if(recordingSave)return recordingSave;if(!recording)return;
  recordingSave=saveRecording();updateUI();
  try{return await recordingSave;}finally{recordingSave=null;updateUI();}
}
async function saveRecording(){
  if(!recording)return;releaseAll();const take=recording;recording=null;transport.recording=false;if(take.overdub)transport.pause();$('record-button').classList.remove('recording');$('record-button').innerHTML=icon('record')+'<span>Record</span>';$('record-button').setAttribute('aria-label','Record');updateUI();
  if(!take.notes.length){toast('No notes recorded. Play a few notes before stopping.');return;}
  const trackId=take.overdub?Math.max(...take.base.tracks.map(t=>t.id))+1:0;
  const song=normalizeSong({...take.base,id:crypto.randomUUID(),xml:undefined,title:take.overdub?`${take.base.title} · new layer`:`Recording ${new Date().toLocaleString()}`,composer:'Your performance',source:'Recording',notes:[...(take.base?.notes||[]),...take.notes.map(n=>({...n,track:trackId}))],bpm:take.base?.bpm||120,tracks:[...(take.base?.tracks||[]),{id:trackId,name:take.overdub?`Recorded layer ${take.base.tracks.length+1}`:'Piano',role:'split',instrument:take.instrument}]});
  try{await songStore('put',song);songs.push(song);if(take.overdub){loadSong(song);setMode('listen');}else{lastFreeRecording=song;writeSetting('lastFreeRecording',song.id);updateUI();}toast('Recording saved to your library. Export MIDI to keep a separate copy.');}catch{toast('Recording could not be saved in browser storage. Downloading a MIDI copy.');download(exportMidi(song),`${song.title}.mid`,'audio/midi');}
}

async function renderScore(){
  const generation=++scoreGeneration;scoreReady=false;$('score-message').textContent='Preparing sheet music…';
  const song=currentSong;
  try{
    const module=await import('opensheetmusicdisplay');if(generation!==scoreGeneration)return;
    const OSMD=module.OpenSheetMusicDisplay||module.default?.OpenSheetMusicDisplay;
    scoreRenderer?.clear();$('score').replaceChildren();
    const renderer=new OSMD($('score'),{autoResize:false,backend:'svg',drawTitle:true,drawComposer:false,drawPartNames:true,drawMeasureNumbers:true,followCursor:false,cursorsOptions:[{type:0,color:'#51b048',alpha:.25,follow:false}]});
    scoreRenderer=renderer;
    await renderer.load(songToXML(song));if(generation!==scoreGeneration)return;
    renderer.zoom=.8;renderer.render();lastScoreBeat=-1;
    for(const measures of renderer.GraphicSheet.MeasureList)for(const measure of measures)for(const entry of measure.staffEntries)for(const voice of entry.graphicalVoiceEntries)for(const note of voice.notes){const element=note.getSVGGElement?.();if(!element)continue;const time=transport.timeAtBeat(entry.getAbsoluteTimestamp().RealValue*4);element.dataset.scoreTime=time;element.setAttribute('role','button');element.setAttribute('tabindex','0');element.setAttribute('aria-label',`Jump to ${formatTime(time)}`);element.style.cursor='pointer';}
    try{renderer.cursor.reset();renderer.cursor.show();scoreReady=!song.warning;syncScore();}catch{scoreReady=false;renderer.cursor.hide();}
    $('score-follow').disabled=!scoreReady;$('score-follow').title=scoreReady?'Follow playback position':'The score is readable, but cursor tracking is unavailable for this score.';
    $('score-message').textContent=song.xml?'Original MusicXML score':'MIDI notation · quantized to sixteenth notes · original pitch';
  }catch(e){console.warn('Sheet rendering failed',e.stack);scoreReady=false;if(generation===scoreGeneration){$('score').replaceChildren();$('score-message').textContent=`Score could not be displayed: ${e.message}`;}}
}
function syncScore(){
  if(!scoreReady||$('score-panel').hidden||!$('score-follow').checked)return;
  try{
  const cursor=scoreRenderer.cursor,beat=transport.beatAt(transport.time);
  if(beat<lastScoreBeat-.01)cursor.reset();
  lastScoreBeat=beat;
  let safety=0;
  while(!cursor.Iterator.EndReached&&safety++<10000){
    const next=cursor.Iterator.clone();next.moveToNext();
    if(next.EndReached||next.CurrentSourceTimestamp.RealValue*4>beat+.01)break;
    cursor.next();
  }
  cursor.show();
  if(transport.running){const panel=$('score-panel'),rect=cursor.cursorElement.getBoundingClientRect(),bounds=panel.getBoundingClientRect();if(rect.top<bounds.top+45||rect.bottom>bounds.bottom-15)panel.scrollTop+=rect.top-bounds.top-60;}
  }catch{scoreReady=false;scoreRenderer.cursor.hide();$('score-follow').disabled=true;$('score-follow').title='Cursor tracking is unavailable for this score.';}
}
function selectMidiOutput(id){audio.output=id==='__all__'?{id,send(message,time){for(const port of midiAccess.outputs.values())if(port.state!=='disconnected'){try{port.send(message,time);}catch{}}}}:midiAccess?.outputs.get(id)||null;}
$('score').onclick=e=>{const note=e.target.closest('[data-score-time]');if(note&&transport.mode!=='recital'&&!recording){transport.seek(Number(note.dataset.scoreTime));syncScore();updateUI();}};
$('score').onkeydown=e=>{if(e.code==='Enter'&&e.target.matches('[data-score-time]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}};
$('roll').addEventListener('wheel',e=>{if(transport.running||['recital','free'].includes(transport.mode)||recording)return;e.preventDefault();transport.seek(transport.time+Math.sign(e.deltaY)*.5);updateUI();},{passive:false});
function refreshMidi(){
  if(!midiAccess)return;const inputs=[...midiAccess.inputs.values()],outputs=[...midiAccess.outputs.values()];
  $('midi-input').innerHTML='<option value="all">All connected keyboards</option>'+inputs.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  if(selectedInput!=='all'&&!inputs.some(p=>p.id===selectedInput))selectedInput='all';$('midi-input').value=selectedInput;
  const oldOutput=audio.output?.id;
  $('midi-output').innerHTML='<option value="">Computer speakers only</option>'+(outputs.length>1?'<option value="__all__">All connected outputs</option>':'')+outputs.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  if(oldOutput&&(outputs.some(p=>p.id===oldOutput)||oldOutput==='__all__'&&outputs.length>1)){$('midi-output').value=oldOutput;selectMidiOutput(oldOutput);}else audio.output=null;
  for(const input of inputs)input.onmidimessage=e=>{
    if(selectedInput!=='all'&&selectedInput!==input.id)return;
    const[status,note,velocity]=e.data,type=status&0xf0,channel=status&0xf,source=`midi:${input.id}:${channel}:${note}`;
    if(type===0x90&&velocity>0)press(note,velocity/127,source);
    else if(type===0x80||type===0x90)release(note,source);
    else if(type===0xb0&&note===64)pedal(velocity>=64);
    else if(type===0xb0&&(note===120||note===123))releaseAll();
  };
  $('midi-message').textContent=inputs.length?`${inputs.length} input device${inputs.length===1?'':'s'} connected. Play a note to test.`:'MIDI access enabled. No input devices found. Connect your piano with a data-capable USB cable.';
  $('device-status').textContent=inputs.length?`MIDI ready · ${inputs.map(p=>p.name).join(', ')}`:'Computer keyboard ready · no MIDI input';
}

$('play').onclick=togglePlay;$('restart').onclick=()=>{releaseAll();transport.seek(transport.loop?transport.loopA:0);updateUI();};$('skip').onclick=()=>{transport.seek(transport.time+5);updateUI();};
$('slower').onclick=()=>setSpeed(transport.speed-.1);$('faster').onclick=()=>setSpeed(transport.speed+.1);$('speed-reset').onclick=()=>setSpeed(1);$('speed-slider').oninput=e=>setSpeed(Number(e.target.value)/100);
$('seek').oninput=e=>{transport.seek(Number(e.target.value));updateUI();};
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=async()=>{if(recording)await stopRecording();setMode(b.dataset.mode);});
$('hands').onchange=e=>{saveSession();transport.hands=e.target.value;transport.seek(transport.time);transport.resetStats();savedStats='';};
document.querySelectorAll('[data-hand]').forEach(b=>b.onclick=()=>{if(transport.mode==='listen')setMode('wait');$('hands').value=b.dataset.hand;$('hands').dispatchEvent(new Event('change'));updateUI();});
const showDialog=id=>{releaseAll();transport.pause();updateUI();$(id).showModal();};
$('library-button').onclick=()=>{saveSession();renderLibrary();showDialog('library-dialog');};
for(const[name,id]of[['settings','settings'],['help','help'],['midi','midi']])$(`${name}-button`).onclick=()=>showDialog(`${id}-dialog`);
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});d.addEventListener('close',()=>{$('play').focus();});});
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Fullscreen is unavailable in this window. Try F11.');}};
$('loop-button').onclick=()=>{transport.loop=!transport.loop;if(transport.loop&&transport.loopB-transport.loopA<.1){transport.loop=false;toast('Set an end point after the start point.');}if(transport.loop&&(transport.time<transport.loopA||transport.time>=transport.loopB))transport.seek(transport.loopA);updateLoop();};
$('loop-a').onclick=()=>{if(transport.time>=transport.loopB-.1){toast('The start point must be before B.');return;}transport.loopA=transport.time;updateLoop();};
$('loop-b').onclick=()=>{if(transport.time<=transport.loopA+.1){toast('Move the timeline after A before setting B.');return;}transport.loopB=transport.time;updateLoop();};
$('bookmark-button').onclick=()=>{saveSongPreferences();const list=songPrefs[currentSong.id].bookmarks;list.push({name:`Section ${list.length+1}`,time:transport.time});list.sort((a,b)=>a.time-b.time);persist('songs',songPrefs);updateBookmarks();toast('Bookmark saved.');};
$('bookmarks').onchange=e=>{if(e.target.value==='')return;transport.seek(songPrefs[currentSong.id].bookmarks[Number(e.target.value)].time);e.target.value='';updateUI();};
$('bookmark-editor').onchange=e=>{const i=e.target.dataset.renameBookmark;if(i===undefined)return;songPrefs[currentSong.id].bookmarks[Number(i)].name=e.target.value.trim()||`Section ${Number(i)+1}`;persist('songs',songPrefs);updateBookmarks();};
$('bookmark-editor').onclick=e=>{const b=e.target.closest('[data-delete-bookmark]');if(!b)return;songPrefs[currentSong.id].bookmarks.splice(Number(b.dataset.deleteBookmark),1);persist('songs',songPrefs);updateBookmarks();};
$('metronome').onchange=e=>{transport.metronome=e.target.checked;savePreferences();};$('count-in').onchange=e=>{transport.countIn=e.target.checked;savePreferences();};
$('labels').innerHTML=$('note-labels').innerHTML;
for(const id of ['labels','note-labels'])$(id).onchange=e=>{roll.label=e.target.value;$('labels').value=roll.label;$('note-labels').value=roll.label;savePreferences();};
$('lookahead').onchange=e=>{roll.window=Number(e.target.value);savePreferences();};
$('key-range').onchange=()=>{releaseAll();refreshRange();savePreferences();};$('volume').oninput=e=>{audio.setVolume(Number(e.target.value));$('volume-value').textContent=`${Math.round(audio.volume*100)}%`;savePreferences();};$('tone').onchange=async e=>{audio.panic();audio.tone=e.target.value;try{if(audio.tone==='bank')await ensureSoundBank();}catch{}savePreferences();};
$('key-labels').onchange=e=>{roll.keyLabel=e.target.value;roll.updateLabels();savePreferences();};
$('label-size').oninput=e=>{roll.labelSize=Number(e.target.value);roll.updateLabels();savePreferences();};
for(const[id,property]of[['show-measures','showMeasures'],['show-falling','showNotes'],['high-contrast','highContrast']])$(id).onchange=e=>{roll[property]=e.target.checked;savePreferences();};
$('input-offset').onchange=e=>{transport.inputOffset=Math.max(-300,Math.min(300,Number(e.target.value)||0));e.target.value=transport.inputOffset;savePreferences();};
$('play-my-part').onchange=e=>{transport.playMyPart=e.target.checked;savePreferences();};
for(const id of ['automatic-octave','focus-mode'])$(id).onchange=()=>{savePreferences();updateUI();};
$('load-soundfont').onclick=()=>soundfontInput.click();
soundfontInput.onchange=async()=>{const file=soundfontInput.files[0];if(!file)return;releaseAll();try{if(file.size>250*1024*1024)throw new Error('Please choose a soundbank smaller than 250 MB.');$('soundfont-status').textContent='Loading '+file.name+'…';const buffer=await file.arrayBuffer();const signature=new TextDecoder().decode(buffer.slice(0,4));if(signature!=='RIFF')throw new Error('This is not a supported SoundFont or DLS file.');await audio.loadBank(buffer.slice(0));await soundBankStore('put',{buffer,name:file.name});audio.bank.liveProgram=Number($('live-instrument').value);audio.tone='bank';$('tone').value='bank';$('soundfont-status').textContent=file.name;savePreferences();toast('Soundbank loaded and saved on this computer.');}catch(e){audio.bankReady=null;audio.tone='grand';$('tone').value='grand';$('soundfont-status').textContent=e.message;toast('Could not load this soundbank. '+e.message);}soundfontInput.value='';};
$('reset-soundfont').onclick=async()=>{releaseAll();try{await soundBankStore('delete');audio.bankReady=null;await ensureSoundBank();audio.tone='bank';$('tone').value='bank';savePreferences();}catch{}};
$('live-instrument').onchange=async()=>{try{await ensureSoundBank();audio.tone='bank';$('tone').value='bank';audio.bank.liveProgram=Number($('live-instrument').value);savePreferences();}catch{}};
$('volume-boost').onchange=e=>{audio.setBoost(Number(e.target.value));savePreferences();};
$('sound-test').onclick=async()=>{try{if(audio.tone==='bank')await ensureSoundBank();await audio.ready();audio.note(60,.8,.7,'test-sound');}catch{toast('Could not start the piano sound.');}};
$('transpose').onchange=e=>{releaseAll();transport.transpose=Number(e.target.value);transport.seek(transport.time);refreshRange();};
$('track-list').onchange=async e=>{if(!e.target.dataset.field)return;const track=currentSong.tracks.find(t=>t.id===Number(e.target.dataset.track));if(track){const field=e.target.dataset.field;track[field]=['muted','hidden'].includes(field)?e.target.checked:['instrument','volume','pan'].includes(field)?Number(e.target.value):e.target.value;transport.seek(transport.time);saveSongPreferences();try{if(field==='instrument'){audio.tone='bank';$('tone').value='bank';await ensureSoundBank();savePreferences();}audio.configureSong(currentSong);}catch{}updateTracks();}};
$('auto-colors').onclick=()=>{for(const t of currentSong.tracks){delete t.color;if(t.role!=='mute'&&!t.percussion)t.role='split';}if(currentSong.source==='MIDI')assignMidiHands(currentSong);saveSongPreferences();updateTracks();};
$('apply-split').onclick=()=>{currentSong.splitPoint=Number($('hand-split').value);for(const track of currentSong.tracks)if(!['mute','accompaniment'].includes(track.role))track.role='pitch';transport.seek(transport.time);saveSongPreferences();updateTracks();};
$('finger-buttons').onclick=e=>{const b=e.target.closest('[data-finger]');if(!b||!fingerNote)return;fingerNote.finger=Number(b.dataset.finger)||undefined;saveSongPreferences();$('finger-dialog').close();roll.label='fingers';$('labels').value='fingers';$('note-labels').value='fingers';savePreferences();};
$('sheet-button').onclick=()=>{$('score-panel').hidden=!$('score-panel').hidden;$('sheet-button').setAttribute('aria-pressed',String(!$('score-panel').hidden));if(!$('score-panel').hidden)renderScore();else{document.querySelector('main').classList.remove('score-only');$('score-expand').setAttribute('aria-pressed','false');}};$('score-close').onclick=()=>{$('score-panel').hidden=true;$('sheet-button').setAttribute('aria-pressed','false');document.querySelector('main').classList.remove('score-only');$('score-expand').setAttribute('aria-pressed','false');};$('score-print').onclick=()=>window.print();
$('score-expand').onclick=()=>{const expanded=document.querySelector('main').classList.toggle('score-only');$('score-expand').setAttribute('aria-pressed',String(expanded));};
$('song-search').oninput=renderLibrary;$('library-filter').onchange=renderLibrary;$('import-button').onclick=()=>$('file-input').click();$('file-input').onchange=async e=>{await importFiles([...e.target.files]);e.target.value='';};
$('library-sort').onchange=renderLibrary;$('import-folder').onclick=()=>folderInput.click();folderInput.onchange=async()=>{const files=[...folderInput.files].filter(f=>/\.(mid|midi|xml|musicxml|mxl)$/i.test(f.name));if(files.length)await importFiles(files);else toast('No MIDI or MusicXML files were found in that folder.');folderInput.value='';};
$('song-list').onclick=async e=>{
  const songButton=e.target.closest('[data-song]'),fav=e.target.closest('[data-favorite]'),del=e.target.closest('[data-delete]');
  if(songButton){loadSong(songs.find(s=>s.id===songButton.dataset.song));if(transport.mode==='free')setMode('listen');if(navigation)await navigation.selected();else $('library-dialog').close();}
  else if(fav){const id=fav.dataset.favorite;favorites.has(id)?favorites.delete(id):favorites.add(id);persist('favorites',[...favorites]);renderLibrary();}
  else if(del){const id=del.dataset.delete,song=songs.find(s=>s.id===id);if(!confirm(`Remove “${song.title}” from this browser’s library? Export MIDI first if you need a copy.`))return;try{await songStore('delete',id);songs=songs.filter(s=>s.id!==id);if(lastFreeRecording?.id===id){lastFreeRecording=null;writeSetting('lastFreeRecording',null);}if(currentSong.id===id)loadSong(songs[0]);renderLibrary();}catch{toast('The song could not be removed.');}}
};
$('record-button').onclick=()=>recording?stopRecording():startRecording();$('export-button').onclick=async()=>{const song=transport.mode==='free'?lastFreeRecording:currentSong;if(!song)return;if(await download(exportMidi(song),`${song.title}.mid`,'audio/midi'))toast(nativePlatform?'Choose where to save or share your MIDI.':'MIDI export ready.');};
function renderHistory(){
  $('history-content').innerHTML=history.length?`<div class="history-total">${history.length}<span>practice sessions for ${esc(profiles.name())}</span></div>`+history.map(h=>`<article class="history-row"><div><strong>${esc(h.song)}</strong><small>${new Date(h.date).toLocaleString()} · ${{wait:'Learn notes',rhythm:'Rhythm',recital:'Recital'}[h.mode]||h.mode} · ${h.hands} hands · ${Math.round(h.speed*100)}%</small></div><b>${accuracy(h)}%</b><span>${h.correct} correct / ${h.missed} missed / ${h.wrong} wrong</span></article>`).join(''):'<div class="empty"><h3>Your first session starts with a note.</h3><p>Try Learn notes or Practice rhythm. Sessions are saved when you finish or change songs and modes.</p></div>';
}
$('progress-button').onclick=()=>{renderHistory();$('history-dialog').showModal();};
$('practice-again').onclick=()=>{$('result-dialog').close();transport.seek(0);transport.resetStats();savedStats='';togglePlay();};
transport.onEnd=()=>{if(recording?.overdub){stopRecording();return;}advanced?.complete();saveSession();updateUI();if(transport.mode!=='listen'){$('result-content').innerHTML=`<div class="result-score">${accuracy(transport.stats)}%<span>accuracy</span></div><div class="result-details"><span>${transport.stats.correct} correct</span><span>${transport.stats.missed} missed</span><span>${transport.stats.wrong} wrong</span></div>`;$('result-dialog').showModal();}};
$('midi-connect').onclick=async()=>{
  if(!navigator.requestMIDIAccess){$('midi-message').textContent='MIDI is unavailable in this browser. Open Keyfall in Chrome or Edge.';return;}
  try{midiAccess=await navigator.requestMIDIAccess({sysex:false});midiAccess.onstatechange=()=>{releaseAll();refreshMidi();};refreshMidi();$('midi-connect').textContent='Refresh devices';}catch(e){$('midi-message').textContent=`MIDI access was not granted. Allow MIDI in the browser’s site permissions and try again. (${e.name})`;}
};
$('midi-input').onchange=e=>{releaseAll();selectedInput=e.target.value;};$('midi-output').onchange=e=>{releaseAll();selectMidiOutput(e.target.value);};

const keyOffsets={KeyA:0,KeyW:1,KeyS:2,KeyE:3,KeyD:4,KeyF:5,KeyT:6,KeyG:7,KeyY:8,KeyH:9,KeyU:10,KeyJ:11,KeyK:12,KeyO:13,KeyL:14,KeyP:15,Semicolon:16,Quote:17};
document.addEventListener('keydown',e=>{
  if(e.defaultPrevented||(navigation&&!navigation.isPlayer()))return;
  // Space is always the transport key in the piano view, regardless of focus.
  if(e.code==='Space'&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!document.querySelector('dialog[open]')){e.preventDefault();e.stopImmediatePropagation();for(const popover of document.querySelectorAll(':popover-open'))popover.hidePopover();if(!e.repeat)togglePlay();return;}
  if(e.target.closest('.choice-popup'))return;
  if(e.code==='Escape'){releaseAll();transport.pause();updateUI();return;}
  if(advanced?.key(e))return;
  if(e.ctrlKey||e.altKey||e.metaKey||document.querySelector('dialog[open]')||e.target.matches('textarea,input:not([type=range]):not([type=checkbox]):not([type=color]),[contenteditable=true]'))return;
  if(e.target.tagName==='BUTTON'&&e.target!==$('play')&&['Space','Enter'].includes(e.code))return;
  if(e.repeat)return;
  if(e.code in keyOffsets){e.preventDefault();const midi=(octave+1)*12+keyOffsets[e.code];heldComputer.set(e.code,midi);press(midi,.75,`computer:${e.code}`);}
  else if(e.code==='Space'){e.preventDefault();togglePlay();}
  else if(e.code==='KeyZ'||e.code==='KeyX'){releaseAll();octave=Math.max(1,Math.min(6,octave+(e.code==='KeyX'?1:-1)));roll.octave=octave;roll.updateLabels();savePreferences();updateUI();}
  else if(e.code==='ShiftLeft'||e.code==='ShiftRight')pedal(true);
},true);
document.addEventListener('keyup',e=>{if(heldComputer.has(e.code)){release(heldComputer.get(e.code),`computer:${e.code}`);heldComputer.delete(e.code);}if(e.code==='ShiftLeft'||e.code==='ShiftRight')pedal(false);});
window.addEventListener('blur',()=>{releaseAll();transport.pause();updateUI();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseAll();transport.pause();saveSession();}});
window.addEventListener('beforeunload',e=>{saveSession();if(recording?.notes.length||recordingSave){e.preventDefault();e.returnValue='';}});
let dragDepth=0;
document.addEventListener('dragenter',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();dragDepth++;$('drop-overlay').hidden=false;}});
document.addEventListener('dragover',e=>e.preventDefault());document.addEventListener('dragleave',()=>{if(--dragDepth<=0)$('drop-overlay').hidden=true;});
document.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;$('drop-overlay').hidden=true;importFiles([...e.dataTransfer.files]);});

function frame(now){const dt=Math.min((now-lastFrame)/1000,.15);lastFrame=now;transport.tick(dt);if(!navigation||navigation.isPlayer())roll.draw();if(now-lastUI>90){if($('automatic-octave').checked&&transport.running&&!heldComputer.size){const next=transport.waiting[0]||currentSong.notes[transport.index];if(next){const pitch=next.midi+transport.transpose;if(pitch<(octave+1)*12||pitch>(octave+1)*12+17){octave=Math.max(1,Math.min(6,Math.floor(pitch/12)-1));roll.octave=octave;roll.updateLabels();}}}updateUI();syncScore();lastUI=now;}advanced?.frame(now);requestAnimationFrame(frame);}

async function initialize(){
  try{songs.push(...await songStore('getAll'));}catch{toast('Your browser could not open local storage. Imported songs may not be saved.');}
  lastFreeRecording=songs.find(s=>s.id===readSetting('lastFreeRecording',null))||null;
  audio.setVolume(preferences.volume??.65);$('volume').value=audio.volume;$('volume-value').textContent=`${Math.round(audio.volume*100)}%`;audio.setBoost(preferences.boostDb??6);$('volume-boost').value=audio.boostDb;audio.tone=preferences.tone||'grand';$('tone').value=audio.tone;
  transport.speed=preferences.speed||1;$('speed-slider').value=transport.speed*100;octave=preferences.octave||4;
  roll.label=preferences.labels||'notes';$('labels').value=roll.label;roll.window=preferences.lookahead||5;$('lookahead').value=roll.window;$('key-range').value=preferences.range||'full';
  $('note-labels').value=roll.label;roll.keyLabel=preferences.keyLabels||'octaves';$('key-labels').value=roll.keyLabel;roll.labelSize=preferences.labelSize||12;$('label-size').value=roll.labelSize;roll.octave=octave;
  for(const[id,property]of[['show-measures','showMeasures'],['show-falling','showNotes'],['high-contrast','highContrast']]){roll[property]=preferences[property]??roll[property];$(id).checked=roll[property];}
  transport.inputOffset=preferences.inputOffset||0;$('input-offset').value=transport.inputOffset;transport.playMyPart=!!preferences.playMyPart;$('play-my-part').checked=transport.playMyPart;
  $('automatic-octave').checked=!!preferences.automaticOctave;$('focus-mode').checked=!!preferences.focusMode;$('live-instrument').value=preferences.liveInstrument||0;
  transport.metronome=preferences.metronome||false;$('metronome').checked=transport.metronome;transport.countIn=preferences.countIn||false;$('count-in').checked=transport.countIn;
  loadSong(songs.find(s=>s.id===readSetting('lastSong','ode'))||songs[0]);setMode('listen');requestAnimationFrame(frame);
  navigation=createNavigation({song:()=>currentSong,songs:()=>songs,history:()=>history,profiles,transport,roll,
    favorite:id=>favorites.has(id),toggleFavorite:id=>{favorites.has(id)?favorites.delete(id):favorites.add(id);persist('favorites',[...favorites]);},
    selectProfile:id=>{saveSession();if(profiles.select(id)){history=profiles.read('history',[]);favorites.clear();for(const id of profiles.read('favorites',[]))favorites.add(id);transport.resetStats();savedStats='';}},
    stop:async()=>{if(recording||recordingSave)await stopRecording();saveSession();releaseAll();transport.pause();updateUI();},
    mode:(mode,hands='both')=>{setMode(mode);transport.hands=hands;$('hands').value=hands;},renderLibrary,renderHistory,play:togglePlay,update:updateUI});
  advanced=createAdvanced({transport,roll,audio,navigation,songs:()=>songs,selectSong:id=>loadSong(songs.find(s=>s.id===id)||currentSong),toast});
  libraryTools=createLibraryTools({transport,audio,navigation,songs:()=>songs,song:()=>currentSong,toast,renderLibrary,canScan:()=>!transport.running&&!recording&&!recordingSave,selectSong:id=>loadSong(songs.find(s=>s.id===id)||currentSong),upsert:async song=>{await songStore('put',song);const index=songs.findIndex(s=>s.id===song.id);if(index<0)songs.push(song);else songs[index]=song;}});
  buttonChoices=installButtonChoices();
  await installNativeNavigation(navigation,()=>{releaseAll();transport.pause();saveSession();if(recording)stopRecording();updateUI();});
  audio.preload().then(()=>{if(audio.sampleFailed)toast('Grand piano samples could not load. Using the synthesized piano fallback.');});
}
initialize();


