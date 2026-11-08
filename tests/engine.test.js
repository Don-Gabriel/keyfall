import test from 'node:test';
import assert from 'node:assert/strict';
import { Transport } from '../src/engine.js';
import { makeDemos, parseMidi, exportMidi, normalizeSong, songToXML } from '../src/music.js';

function fixture(notes) {
  const played = [], audio = { panic() {}, note(...args) { played.push(args); }, click() {} };
  const t = new Transport(audio);
  t.load(normalizeSong({ title: 'Test', notes: notes.map(n => ({ duration: .4, track: 0, ...n })), bpm: 120,
    tracks: [{ id: 0, name: 'Piano', role: 'split' }] }));
  return { t, played };
}

test('wait mode stops at a chord until all pitches have been played', () => {
  const { t } = fixture([{ time: 1, midi: 60 }, { time: 1, midi: 64 }, { time: 2, midi: 67 }]);
  t.mode = 'wait'; t.play(); t.tick(1.2);
  assert.equal(t.time, 1); assert.equal(t.waiting.length, 2);
  t.press(61); assert.equal(t.stats.wrong, 1); t.tick(1); assert.equal(t.time, 1);
  t.press(60); assert.equal(t.waiting.length, 1); t.tick(1); assert.equal(t.time, 1);
  t.press(64); t.tick(.1); assert.equal(t.time, 1.1); assert.equal(t.stats.correct, 2);
});
test('unison pitches in different parts require one key press', () => {
  const { t } = fixture([{ time: 1, midi: 60 }, { time: 1, midi: 60 }]);
  t.mode = 'wait';t.play();t.tick(1);t.press(60);
  assert.equal(t.waiting.length, 0);assert.equal(t.stats.correct,2);
});
test('unselected hand plays automatically while selected hand waits', () => {
  const { t, played } = fixture([{ time: 1, midi: 48 }, { time: 1, midi: 64 }]);
  t.mode='wait'; t.hands='right'; t.play(); t.tick(1.1);
  assert.equal(played[0][0],48); assert.deepEqual(t.waiting.map(n=>n.midi),[64]);
});
test('rhythm mode scores hit window and misses exactly once', () => {
  const { t } = fixture([{ time: 1, midi: 60 }, { time: 2, midi: 62 }]);
  t.mode='rhythm';t.play();t.tick(.9);t.press(60);t.tick(1.4);t.tick(.1);
  assert.deepEqual(t.stats,{correct:1,wrong:0,missed:1});
});
test('seeking skips earlier notes and clears pending practice', () => {
  const { t, played } = fixture([{ time: 1, midi: 60 }, { time: 2, midi: 62 }]);
  t.mode='wait';t.play();t.tick(1);assert.equal(t.waiting.length,1);
  t.seek(1.5);t.mode='listen';t.tick(.6);assert.equal(t.waiting.length,0);assert.deepEqual(played.map(n=>n[0]),[62]);
});
test('loop restarts and transpose affects both playback and scoring', () => {
  const { t, played } = fixture([{ time: .5, midi: 60 }]);
  t.transpose=2;t.loopA=.25;t.loopB=1;t.loop=true;t.play();t.tick(.75);
  assert.equal(t.time,.25);assert.equal(played[0][0],62);
  t.loop=false;t.mode='wait';t.seek(0);t.tick(.6);t.press(62);assert.equal(t.stats.correct,1);
});
test('playback speed and count-in do not consume notes early', () => {
  const { t, played } = fixture([{ time: .5, midi: 60 }]);
  t.speed=.5;t.countIn=true;t.play();t.tick(1);assert.equal(t.time,0);assert.equal(played.length,0);
  t.preRoll=0;t.tick(1);assert.equal(t.time,.5);assert.equal(played[0][2],.8);
});
test('demo songs export and import with track, pitch, tempo and timing preserved', () => {
  for(const demo of makeDemos()){
    const restored=parseMidi(exportMidi(demo));assert.equal(restored.notes.length,demo.notes.length);assert.equal(restored.tracks.length,2);
    assert.ok(Math.abs(restored.bpm-demo.bpm)<.01);
    for(let i=0;i<demo.notes.length;i++){assert.equal(restored.notes[i].midi,demo.notes[i].midi);assert.ok(Math.abs(restored.notes[i].time-demo.notes[i].time)<.005);}
  }
});
test('tempo-map MIDI round-trip preserves absolute time', () => {
  const song=normalizeSong({title:'Tempo changes',bpm:120,tempos:[{time:0,bpm:120},{time:2,bpm:60}],notes:[{midi:60,time:1,duration:.5,track:0},{midi:64,time:3,duration:1,track:0}]});
  const result=parseMidi(exportMidi(song));assert.equal(result.notes[1].time,3);assert.equal(result.notes[1].duration,1);assert.equal(result.tempos[1].bpm,60);
});
test('bad MIDI and empty songs fail clearly', () => {
  assert.throws(()=>parseMidi(new TextEncoder().encode('not music')),/not a valid MIDI/);
  assert.throws(()=>normalizeSong({notes:[]}),/no playable notes/);
});
test('notation escapes titles and retains imported scores', () => {
  const song=makeDemos()[0];song.title='A < B & C';const xml=songToXML(song);assert.ok(xml.includes('A &lt; B &amp; C'));assert.ok(xml.includes('<part id="P0">'));
  song.xml='<score-partwise/>';assert.equal(songToXML(song),song.xml);
});
