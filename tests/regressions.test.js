import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSong, assignMidiHands, exportMidi, parseMidi } from '../src/music.js';
import { Transport } from '../src/engine.js';
import { noteColor, labelFor } from '../src/roll.js';
const make=(notes,tracks=[{id:0,name:'Piano',role:'split'}])=>normalizeSong({title:'Regression',bpm:120,tracks,notes:notes.map(n=>({track:0,duration:.5,velocity:.8,...n}))});
test('imported two piano parts above middle C get distinct hands',()=>{
 const song=make([{midi:64,time:0,track:0},{midi:67,time:1,track:0},{midi:76,time:0,track:1},{midi:79,time:1,track:1}],[{id:0,name:'Piano',role:'split'},{id:1,name:'Piano',role:'split'}]);
 const imported=parseMidi(exportMidi(song));
 assert.deepEqual(new Set(imported.notes.filter(n=>n.track===0).map(n=>n.hand)),new Set(['left']));
 assert.deepEqual(new Set(imported.notes.filter(n=>n.track===1).map(n=>n.hand)),new Set(['right']));
});
test('single high polyphonic part splits but monophonic melody stays one hand',()=>{
 const chords=make(Array.from({length:4},(_,i)=>[{midi:64,time:i},{midi:79,time:i}]).flat());
 assignMidiHands(chords);assert.deepEqual(new Set(chords.notes.map(n=>n.hand)),new Set(['left','right']));
 const melody=make([60,67,72,79].map((midi,time)=>({midi,time})));assignMidiHands(melody);assert.ok(melody.notes.every(n=>n.hand==='right'));
});
test('explicit hand names take priority over pitch and drums do not skew inference',()=>{
 const song=make([{midi:80,time:0},{midi:48,time:0,track:1},{midi:36,time:0,track:2}],[{id:0,name:'Left Hand',role:'split'},{id:1,name:'Right Hand',role:'split'},{id:2,name:'Drums',role:'accompaniment',percussion:true}]);
 assignMidiHands(song);assert.equal(song.notes.find(n=>n.track===0).hand,'left');assert.equal(song.notes.find(n=>n.track===1).hand,'right');
});
test('a combined piano track keeps both hands when a later passage moves above C4',()=>{
 const song=make([{midi:48,time:0},{midi:67,time:0},...Array.from({length:8},(_,i)=>[{midi:72,time:20+i},{midi:84,time:20+i}]).flat()]);assignMidiHands(song);assert.ok(song.notes.filter(n=>n.time>=20&&n.midi===72).every(n=>n.hand==='left'));assert.ok(song.notes.filter(n=>n.time>=20&&n.midi===84).every(n=>n.hand==='right'));
});
test('recital scores delayed input with timing compensation and misses once',()=>{
 const t=new Transport({panic(){},note(){},click(){}});t.load(make([{time:1,midi:60},{time:2,midi:62}]));t.mode='recital';t.inputOffset=250;t.play();t.tick(1.25);t.press(60);t.tick(1.3);t.tick(.1);assert.deepEqual(t.stats,{correct:1,missed:1,wrong:0});
});
test('muted practice part still waits and background part preview is audible',()=>{
 const played=[],t=new Transport({panic(){},note(...a){played.push(a);},click(){}});t.load(make([{time:1,midi:60}]));t.song.tracks[0].muted=true;t.mode='wait';t.play();t.tick(1.1);assert.equal(t.waiting.length,1);assert.equal(played.length,0);t.press(60);assert.equal(t.stats.correct,1);
 t.song.tracks[0].muted=false;t.seek(0);t.playMyPart=true;t.tick(1.1);assert.equal(played.length,1);assert.equal(t.waiting.length,1);
});
test('manual split and color labels preserve hand distinctions',()=>{
 const t=new Transport({panic(){}});t.load(make([{time:0,midi:64},{time:0,midi:76}]));t.song.splitPoint=72;t.song.tracks[0].role='pitch';assert.deepEqual(t.song.notes.map(n=>t.role(n)),['left','right']);assert.notEqual(noteColor('left',false,true),noteColor('right',false,true));assert.notEqual(noteColor('left',true),noteColor('right',true));
 assert.equal(labelFor(60,'mapping',4),'A');assert.equal(labelFor(61,'mapping',4),'W');assert.equal(labelFor(72,'octaves'),'C5');assert.equal(labelFor(64,'solfege'),'Mi');assert.equal(labelFor(67,'numbers'),'5');
});
test('MIDI export preserves drum channel and melodic instrument programs',()=>{
 const s=make([{time:0,midi:36,track:0},{time:0,midi:60,track:1}],[{id:0,name:'Drums',role:'accompaniment',percussion:true,instrument:0},{id:1,name:'Violin',role:'split',instrument:40,channel:2}]);const restored=parseMidi(exportMidi(s));assert.equal(restored.tracks[0].channel,9);assert.equal(restored.tracks[0].percussion,true);assert.equal(restored.tracks[1].channel,2);assert.equal(restored.tracks[1].instrument,40);
});
test('beat grid inverse follows tempo changes and compound meter count-in',()=>{
 const t=new Transport({panic(){},click(){}});t.load(make([{time:5,midi:60}]));t.song.tempos=[{time:0,bpm:120},{time:2,bpm:60}];for(const time of [0,1,2,3,5])assert.ok(Math.abs(t.timeAtBeat(t.beatAt(time))-time)<1e-8);t.song.meter=[6,8];t.countIn=true;t.play();assert.equal(t.preRoll,1.5);
});
