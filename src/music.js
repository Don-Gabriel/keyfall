import * as midiPackage from '@tonejs/midi';
import { unzipSync, strFromU8 } from 'fflate';
import * as midiFilePackage from 'midi-file';
const { Midi } = midiPackage.default || midiPackage;
const {parseMidi:parseMidiBytes,writeMidi:writeMidiBytes}=midiFilePackage.default||midiFilePackage;
export const instrumentNames=(()=>{const instrument=new Midi().addTrack().instrument;return Array.from({length:128},(_,i)=>{instrument.number=i;return instrument.name;});})();

export const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const noteName = n => `${names[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
export const isBlack = n => [1, 3, 6, 8, 10].includes(n % 12);
export const formatTime = t => `${Math.floor(Math.max(0, t) / 60)}:${Math.floor(Math.max(0, t) % 60).toString().padStart(2, '0')}`;
export const escapeXML = str => String(str).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

export function normalizeSong(song) {
  song.notes = song.notes.filter(n => Number.isFinite(n.time) && n.time >= 0 && n.midi >= 0 && n.midi <= 127 && n.duration > 0)
    .sort((a, b) => a.time - b.time || a.midi - b.midi).map((n, i) => ({ ...n, id: i, velocity: n.velocity ?? 0.7, hand: n.hand || (n.midi < 60 ? 'left' : 'right') }));
  if (!song.notes.length) throw new Error('This file contains no playable notes.');
  if (song.notes.length > 100000) throw new Error('This song exceeds the 100,000-note limit. Please split it into smaller files.');
  song.duration = song.notes.reduce((end, n) => Math.max(end, n.time + n.duration), 0) + 1;
  song.bpm = song.bpm || 120;
  song.meter = song.meter || [4, 4];
  song.tempos = song.tempos || [{ time: 0, bpm: song.bpm }];
  song.id = song.id || crypto.randomUUID();
  song.tracks = song.tracks || [{ id: 0, name: 'Piano', role: 'split' }];
  return song;
}

export function assignMidiHands(song) {
  const median = values => { const sorted = [...values].sort((a,b)=>a-b); return sorted[Math.floor(sorted.length/2)]; };
  const tracks = song.tracks.filter(t=>t.role !== 'mute'&&!t.percussion);
  const explicit = new Map();
  for (const track of tracks) {
    const name = track.name.toLowerCase();
    if (/\b(left(?:[ _-]*hand)?|l[ ._-]*h|bass|lower)\b/.test(name)) explicit.set(track.id,'left');
    else if (/\b(right(?:[ _-]*hand)?|r[ ._-]*h|treble|upper)\b/.test(name)) explicit.set(track.id,'right');
  }
  // Two piano parts commonly represent two hands even if both are above C4.
  const piano = tracks.filter(t=>(t.instrument ?? 0) <= 7);
  if (piano.length === 2) {
    const ranked = piano.map(t=>({id:t.id,pitch:median(song.notes.filter(n=>n.track===t.id).map(n=>n.midi))})).sort((a,b)=>a.pitch-b.pitch);
    if (ranked[1].pitch-ranked[0].pitch>=3) {
      if(!explicit.has(ranked[0].id))explicit.set(ranked[0].id,'left');
      if(!explicit.has(ranked[1].id))explicit.set(ranked[1].id,'right');
    }
  }
  song.splitPoint ??= 60;
  for (const n of song.notes) n.hand = explicit.get(n.track) || (n.midi < song.splitPoint ? 'left' : 'right');
  // Combined piano tracks can move both hands above middle C during a passage.
  // Infer registers locally, while keeping single melodies in one hand.
  if (tracks.length===1 && !explicit.has(tracks[0].id)) {
    const notes=song.notes.filter(n=>n.track===tracks[0].id), pitches=notes.map(n=>n.midi);
    const threshold=group=>{
      const pitches=group.map(n=>n.midi),min=pitches.reduce((a,b)=>Math.min(a,b),128),max=pitches.reduce((a,b)=>Math.max(a,b),0);
      let overlap=0,end=0;
      for(const n of group){if(n.time<end-.03)overlap++;end=Math.max(end,n.time+n.duration);}
      if(!((min>=60||max<60)&&max-min>=7&&overlap>=Math.max(2,group.length*.15)))return 60;
      let low=min,high=max;
      for(let i=0;i<8;i++){
        const midpoint=(low+high)/2,left=pitches.filter(p=>p<midpoint),right=pitches.filter(p=>p>=midpoint);
        if(!left.length||!right.length)break;
        low=left.reduce((a,b)=>a+b,0)/left.length;high=right.reduce((a,b)=>a+b,0)/right.length;
      }
      return Math.ceil((low+high)/2);
    };
    const splits=new Map();let start=0,end=0;
    for(const n of notes){const section=Math.floor(n.time/2);if(!splits.has(section)){while(start<notes.length&&notes[start].time<section*2-2)start++;end=Math.max(end,start);while(end<notes.length&&notes[end].time<section*2+4)end++;splits.set(section,threshold(notes.slice(start,end)));}n.hand=n.midi<splits.get(section)?'left':'right';}
    const allAbove=pitches.every(p=>p>=60),allBelow=pitches.every(p=>p<60);if(allAbove||allBelow)song.splitPoint=threshold(notes);
  }
  song.handAssignmentVersion=3;
  return song;
}

export function parseMidi(buffer, filename = 'Imported song') {
  const bytes = new Uint8Array(buffer);
  if (String.fromCharCode(...bytes.slice(0, 4)) !== 'MThd') throw new Error('This is not a valid MIDI file. Choose a .mid or .midi file.');
  if ((bytes[12] & 128) !== 0) throw new Error('SMPTE-timed MIDI is not supported. Export the song with musical (PPQ) timing.');
  if (bytes[9] === 2) throw new Error('MIDI format 2 contains independent sequences. Export as MIDI format 0 or 1.');
  const midi = new Midi(buffer);
  const tracks = [], notes = [], events=[];
  midi.tracks.forEach((track, index) => {
    if (!track.notes.length) return;
    tracks.push({ id: index, name: track.name || track.instrument.name || `Track ${index + 1}`, role: track.channel === 9 ? 'accompaniment' : 'split', instrument: track.instrument.number, channel:track.channel, percussion:track.channel===9, volume:1 });
    const pedal = track.controlChanges[64] || [];
    for(const controller of [1,7,10,11,91,93])for(const cc of track.controlChanges[controller]||[])events.push({type:'cc',controller,value:cc.value,time:cc.time,track:index});
    for(const bend of track.pitchBends||[])events.push({type:'bend',value:bend.value,time:bend.time,track:index});
    track.notes.forEach(n => {
      let end = n.time + n.duration;
      let down = false;
      for (const cc of pedal) { if (cc.time > end) break; down = cc.value >= 0.5; }
      if (down) {
        const up = pedal.find(cc => cc.time > end && cc.value < 0.5);
        if (up) end = up.time;
      }
      notes.push({ midi: n.midi, time: n.time, duration: Math.max(0.035, end - n.time), velocity: n.velocity, track: index, ticks: n.ticks, durationTicks: n.durationTicks });
    });
  });
  return assignMidiHands(normalizeSong({ title: midi.name || filename.replace(/\.[^.]+$/, ''), composer: 'Your library', notes, tracks,
    bpm: midi.header.tempos[0]?.bpm || 120, tempos: midi.header.tempos.map(t => ({ time: midi.header.ticksToSeconds(t.ticks), bpm: t.bpm })),
    meters:midi.header.timeSignatures.map(t=>({time:midi.header.ticksToSeconds(t.ticks),meter:t.timeSignature})),
    keySignatures:midi.header.keySignatures.map(t=>({time:midi.header.ticksToSeconds(t.ticks),key:t.key,scale:t.scale})),
    events:events.sort((a,b)=>a.time-b.time),meter: midi.header.timeSignatures[0]?.timeSignature || [4, 4], source: 'MIDI' }));
}

export async function importSong(file) {
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a file smaller than 20 MB.');
  if (/\.(mid|midi)$/i.test(file.name)) return parseMidi(await file.arrayBuffer(), file.name);
  let xml = await file.text();
  if (/\.mxl$/i.test(file.name)) {
    let expanded = 0;
    const files = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: f => { expanded += f.originalSize; if (expanded > 40 * 1024 * 1024) throw new Error('The uncompressed score is too large (40 MB limit).'); return f.originalSize <= 20 * 1024 * 1024; } });
    const container = files['META-INF/container.xml'];
    const root = container ? new DOMParser().parseFromString(strFromU8(container), 'text/xml').querySelector('rootfile')?.getAttribute('full-path') : null;
    const name = root || Object.keys(files).find(k => /\.(xml|musicxml)$/i.test(k) && !k.startsWith('META-INF'));
    if (!name || !files[name]) throw new Error('No readable MusicXML score was found in this archive.');
    xml = strFromU8(files[name]);
  }
  return parseMusicXML(xml, file.name);
}

export function parseMusicXML(xml, filename) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror') || !doc.querySelector('score-partwise')) throw new Error('Choose a valid partwise MusicXML (.xml, .musicxml or .mxl) score.');
  const num = (el, sel, fallback = 0) => Number(el.querySelector(sel)?.textContent ?? fallback);
  const tempos = [{ beat: 0, bpm: 120 }], raw = [], tracks = [], ties = new Map();
  let meter = [4, 4];
  doc.querySelectorAll('score-partwise > part').forEach((part, track) => {
    const partInfo = [...doc.querySelectorAll('score-part')].find(p => p.id === part.id);
    tracks.push({ id: track, name: partInfo?.querySelector('part-name')?.textContent || `Part ${track + 1}`, role: 'split' });
    let measureStart = 0, divisions = 1, transpose = 0;
    for (const measure of part.querySelectorAll(':scope > measure')) {
      let cursor = measureStart, end = measureStart, lastStart = cursor;
      for (const el of measure.children) {
        if (el.tagName === 'attributes') {
          divisions = num(el, 'divisions', divisions);
          transpose = num(el, 'transpose > chromatic', transpose);
          if (el.querySelector('time')) meter = [num(el, 'beats', 4), num(el, 'beat-type', 4)];
        } else if (el.tagName === 'direction') {
          const bpm = Number(el.querySelector('sound[tempo]')?.getAttribute('tempo')) || num(el, 'per-minute');
          if (bpm > 0) tempos.push({ beat: cursor, bpm });
        } else if (el.tagName === 'backup') cursor -= num(el, 'duration') / divisions;
        else if (el.tagName === 'forward') { cursor += num(el, 'duration') / divisions; end = Math.max(end, cursor); }
        else if (el.tagName === 'note') {
          if (el.querySelector('grace')) continue;
          const length = num(el, 'duration') / divisions;
          const chord = !!el.querySelector('chord');
          const start = chord ? lastStart : cursor;
          if (!el.querySelector('rest') && el.querySelector('pitch')) {
            const step = el.querySelector('step')?.textContent;
            const midi = (num(el, 'octave', 4) + 1) * 12 + ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[step] ?? 0) + num(el, 'alter') + transpose;
            const key = `${track}:${el.querySelector('voice')?.textContent || 1}:${midi}`;
            const stop = !!el.querySelector('tie[type="stop"]');
            const old = ties.get(key);
            const n = { midi, beat: start, length, track, hand: num(el, 'staff', midi < 60 ? 2 : 1) === 2 ? 'left' : 'right', finger: el.querySelector('fingering')?.textContent };
            if (stop && old) old.length = start + length - old.beat;
            else raw.push(n);
            if (el.querySelector('tie[type="start"]')) ties.set(key, stop && old ? old : n); else ties.delete(key);
          }
          if (!chord) { lastStart = cursor; cursor += length; }
          end = Math.max(end, start + length, cursor);
        }
      }
      measureStart = end;
    }
  });
  tempos.sort((a, b) => a.beat - b.beat);
  const seconds = beat => {
    let time = 0, prev = 0, bpm = 120;
    for (const t of tempos) { if (t.beat > beat) break; time += (t.beat - prev) * 60 / bpm; prev = t.beat; bpm = t.bpm; }
    return time + (beat - prev) * 60 / bpm;
  };
  return normalizeSong({ title: doc.querySelector('work-title, movement-title')?.textContent || filename.replace(/\.[^.]+$/, ''),
    composer: doc.querySelector('creator[type="composer"]')?.textContent || 'Your library', tracks, meter,
    bpm: tempos.filter(t => t.beat === 0).at(-1).bpm, tempos: tempos.map(t => ({ time: seconds(t.beat), bpm: t.bpm })),
    notes: raw.map(n => ({ ...n, time: seconds(n.beat), duration: seconds(n.beat + n.length) - seconds(n.beat) })),
    xml, source: 'MusicXML', warning: doc.querySelector('repeat, ending') ? 'MusicXML repeats and alternate endings are shown in the score; playback follows the written measures once.' : '' });
}

export function exportMidi(song) {
  const midi = new Midi(); midi.name = song.title;
  midi.header.setTempo(song.bpm || 120);
  if (song.tempos?.length) { midi.header.tempos = song.tempos.map(t => ({ ticks: 0, bpm: t.bpm, time: t.time }));
    let ticks = 0, prev = 0, bpm = song.tempos[0].bpm;
    midi.header.tempos.forEach(t => { ticks += (t.time - prev) * bpm / 60 * midi.header.ppq; t.ticks = Math.round(ticks); prev = t.time; bpm = t.bpm; }); midi.header.update(); }
  midi.header.timeSignatures=(song.meters?.length?song.meters:[{time:0,meter:song.meter||[4,4]}]).map(m=>({ticks:midi.header.secondsToTicks(m.time),timeSignature:m.meter}));
  midi.header.keySignatures=(song.keySignatures||[]).map(k=>({ticks:midi.header.secondsToTicks(k.time),key:k.key,scale:k.scale}));midi.header.update();
  for (const track of song.tracks) {
    const out = midi.addTrack(); out.name = track.name; out.instrument.number = track.instrument || 0;
    const index=song.tracks.indexOf(track)%15;out.channel=track.percussion?9:track.channel??(index>=9?index+1:index);
    song.notes.filter(n => n.track === track.id).forEach(n => out.addNote({ midi: n.midi, time: n.time, duration: n.duration, velocity: n.velocity }));
    // Tone's reader normalizes bends, but its encoder expects signed 14-bit units.
    for(const event of song.events||[])if(event.track===track.id){if(event.type==='bend')out.addPitchBend({time:event.time,value:Math.max(-8192,Math.min(8191,Math.round(event.value*8192)))});else out.addCC({number:event.controller,time:event.time,value:event.value});}
  }
  if(!song.keySignatures?.length)return midi.toArray();
  // Correct Tone 2.0.28's key-signature encoding (+7 instead of -7).
  const data=parseMidiBytes(midi.toArray()),keys=[...midi.header.keySignatures].sort((a,b)=>a.ticks-b.ticks);let keyIndex=0;
  const fifths={Cb:-7,Gb:-6,Db:-5,Ab:-4,Eb:-3,Bb:-2,F:-1,C:0,G:1,D:2,A:3,E:4,B:5,'F#':6,'C#':7};
  for(const event of data.tracks[0])if(event.type==='keySignature')event.key=fifths[keys[keyIndex++]?.key]??0;
  return Uint8Array.from(writeMidiBytes(data));
}

export function makeDemos() {
  const build = (id, title, composer, melody, bpm, bass = [48, 43, 45, 41]) => {
    let beat = 2; const notes = [];
    for (const [pitch, length = 1] of melody) { if (pitch) notes.push({ midi: pitch, time: beat * 60 / bpm, duration: length * 60 / bpm * 0.88, track: 0, hand: 'right', velocity: 0.75 }); beat += length; }
    for (let b = 2; b < beat; b += 4) {
      const root = bass[Math.floor((b - 2) / 4) % bass.length];
      [root, root + 7, root + 12, root + 7].forEach((pitch, j) => notes.push({ midi: pitch, time: (b + j) * 60 / bpm, duration: 0.8 * 60 / bpm, track: 1, hand: 'left', velocity: 0.48 }));
    }
    return normalizeSong({ id, title, composer, bpm, notes, source: 'Included', level: bpm > 100 ? 'Intermediate' : 'Beginner', tracks: [{ id: 0, name: 'Right hand', role: 'right' }, { id: 1, name: 'Left hand', role: 'left' }] });
  };
  return [
    build('ode', 'Ode to Joy', 'Ludwig van Beethoven', [64,64,65,67,67,65,64,62,60,60,62,64,[64,1.5],[62,.5],[62,2],64,64,65,67,67,65,64,62,60,60,62,64,[62,1.5],[60,.5],[60,2]].map(n=>Array.isArray(n)?n:[n]), 96, [48,43,48,43]),
    build('twinkle', 'Twinkle, Twinkle, Little Star', 'Traditional', [60,60,67,67,69,69,[67,2],65,65,64,64,62,62,[60,2],67,67,65,65,64,64,[62,2],67,67,65,65,64,64,[62,2],60,60,67,67,69,69,[67,2],65,65,64,64,62,62,[60,2]].map(n=>Array.isArray(n)?n:[n]), 80),
    build('elise', 'Für Elise · opening', 'Ludwig van Beethoven', [[76,.5],[75,.5],[76,.5],[75,.5],[76,.5],[71,.5],[74,.5],[72,.5],[69,2],[60,.5],[64,.5],[69,.5],[71,1.5],[64,.5],[68,.5],[71,.5],[72,1.5],[64,.5],[76,.5],[75,.5],[76,.5],[75,.5],[76,.5],[71,.5],[74,.5],[72,.5],[69,2]], 112, [45,52,45,52]),
    build('canon', 'Canon · practice study', 'After Johann Pachelbel', [66,64,62,61,59,57,59,61,62,61,59,57,55,54,55,52,54,57,62,66,64,57,61,64,62,54,59,62,61,57,61,64].map(n=>[n,1]), 92, [50,45,47,42,43,50,43,45]),
    build('scale', 'C major · two-octave study', 'Keyfall exercises', [...Array.from({length:15},(_,i)=>[60,62,64,65,67,69,71][i%7]+12*Math.floor(i/7)),...Array.from({length:14},(_,i)=>[60,62,64,65,67,69,71][(13-i)%7]+12*Math.floor((13-i)/7))].map(n=>[n,.5]), 76, [48,53,55,48])
  ];
}

// MIDI has no notation spelling. Quantize to sixteenths and engrave each track
// as a staff. Original MusicXML is retained unchanged for accurate notation.
export function songToXML(song) {
  if (song.xml) return song.xml;
  const div = 4;
  const beatAt = time => {
    let beat = 0, prev = 0, bpm = song.bpm;
    for (const t of song.tempos || []) { if (t.time > time) break; beat += (t.time - prev) * bpm / 60; prev = t.time; bpm = t.bpm; }
    return beat + (time - prev) * bpm / 60;
  };
  const parts = song.tracks.filter(t => song.notes.some(n => n.track === t.id));
  const meters=(song.meters?.length?song.meters:[{time:0,meter:song.meter}]).map(m=>({...m,tick:Math.round(beatAt(m.time)*div)}));
  const keys=(song.keySignatures||[]).map(k=>({...k,tick:Math.round(beatAt(k.time)*div)}));
  const measureMap=[];let start=0;const total=Math.ceil(beatAt(song.duration)*div);
  while(start<total){const meter=meters.filter(m=>m.tick<=start).at(-1)?.meter||song.meter,next=meters.find(m=>m.tick>start),size=Math.max(1,Math.round(meter[0]*4/meter[1]*div)),end=Math.min(start+size,next?.tick??Infinity);measureMap.push({start,end,meter,key:keys.filter(k=>k.tick<=start).at(-1)});start=end;if(measureMap.length>1500)throw new Error('This score is too long to engrave at once. Split the MIDI into smaller songs.');}
  const max=measureMap.length;
  const partList = parts.map((t,i)=>`<score-part id="P${i}"><part-name>${escapeXML(t.name)}</part-name></score-part>`).join('');
  const body = parts.map((track, i) => {
    const notes = song.notes.filter(n=>n.track===track.id).map(n=>({ ...n, start: Math.round(beatAt(n.time)*div), end: Math.max(Math.round(beatAt(n.time)*div)+1,Math.round(beatAt(n.time+n.duration)*div)) }));
    const onsets = [...new Set(notes.map(n=>n.start))].sort((a,b)=>a-b);
    for (const n of notes) { const next = onsets.find(start=>start>n.start); if(next && next >= n.end && next - n.end <= 1) n.end=next; }
    const grouped = new Map();
    for(const n of notes){const key=`${n.start}:${n.end}`;if(!grouped.has(key))grouped.set(key,{start:n.start,end:n.end,notes:[]});grouped.get(key).notes.push(n);}
    const voices=[];
    for(const group of [...grouped.values()].sort((a,b)=>a.start-b.start)){
      let voice=voices.find(v=>v.at(-1).end<=group.start);if(!voice){voice=[];voices.push(voice);}voice.push(group);
    }
    const values=[[16,'whole',false],[12,'half',true],[8,'half',false],[6,'quarter',true],[4,'quarter',false],[3,'eighth',true],[2,'eighth',false],[1,'16th',false]];
    const renderSpan=(start,end,voice,group=null)=>{
      let text='';
      while(start<end){
        const[length,type,dot]=values.find(([length])=>length<=end-start);
        for(const [index,n]of(group?group.notes:[null]).entries()){
          const pc=n?.midi%12,step=['C','C','D','D','E','F','F','G','G','A','A','B'][pc];
          const stop=group&&group.start<start,begin=group&&group.end>start+length;
          text+=`<note>${index?'<chord/>':''}${n?`<pitch><step>${step}</step>${isBlack(n.midi)?'<alter>1</alter>':''}<octave>${Math.floor(n.midi/12)-1}</octave></pitch>`:'<rest/>'}<duration>${length}</duration>${stop?'<tie type="stop"/>':''}${begin?'<tie type="start"/>':''}<voice>${voice}</voice><type>${type}</type>${dot?'<dot/>':''}${stop||begin||n?.finger?`<notations>${stop?'<tied type="stop"/>':''}${begin?'<tied type="start"/>':''}${n?.finger?`<technical><fingering>${escapeXML(n.finger)}</fingering></technical>`:''}</notations>`:''}</note>`;
        }
        start+=length;
      }
      return text;
    };
    let measures = '';
    const low = notes.filter(n=>n.midi<60).length > notes.length/2;
    for (let m=0;m<max;m++) {
      const {start,end,meter,key}=measureMap[m],size=end-start,previous=measureMap[m-1];
      const meterChanged=!previous||previous.meter.join(':')!==meter.join(':'),keyChanged=!previous||previous.key!==key;
      const fifths={Cb:-7,Gb:-6,Db:-5,Ab:-4,Eb:-3,Bb:-2,F:-1,C:0,G:1,D:2,A:3,E:4,B:5,'F#':6,'C#':7}[key?.key]??0;
      let content=(m===0||meterChanged||keyChanged)?`<attributes>${m===0?`<divisions>${div}</divisions>`:''}${keyChanged?`<key><fifths>${fifths}</fifths><mode>${key?.scale==='minor'?'minor':'major'}</mode></key>`:''}${meterChanged?`<time><beats>${meter[0]}</beats><beat-type>${meter[1]}</beat-type></time>`:''}${m===0?`<clef><sign>${low?'F':'G'}</sign><line>${low?4:2}</line></clef>`:''}</attributes>`:'';
      voices.forEach((voice,j)=>{
        if(j)content+=`<backup><duration>${size}</duration></backup>`;
        let cursor=start;
        for(const group of voice.filter(n=>n.start<end&&n.end>start)){
          const noteStart=Math.max(start,group.start),noteEnd=Math.min(end,group.end);
          if(noteStart>cursor)content+=renderSpan(cursor,noteStart,j+1);
          content+=renderSpan(noteStart,noteEnd,j+1,group);cursor=noteEnd;
        }
        if(cursor<end)content+=renderSpan(cursor,end,j+1);
      });
      measures+=`<measure number="${m+1}">${content}</measure>`;
    }
    return `<part id="P${i}">${measures}</part>`;
  }).join('');
  return `<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0"><work><work-title>${escapeXML(song.title)}</work-title></work><part-list>${partList}</part-list>${body}</score-partwise>`;
}
