# Keyfall 0.4.2 feature coverage

Compared with the visible Synthesia 10.9.5903 screens and its public support guides. This records implemented behavior, not a claim of complete parity or identical scoring.

| Area | Keyfall implementation |
|---|---|
| Entry and navigation | Home, recent songs, library, song options, settings, devices, local players, progress, help and resume |
| Song library | MIDI/MusicXML import, folder import, permission-based watched folders, search, favorites, rating, difficulty, groups, nine sorts, preview and deletion |
| Practice choices | Watch/listen, learn notes, rhythm, recital; left, right or both hands; background accompaniment |
| Song parts | Automatic/manual hand split, instruments, volume, pan, colors, mute and independent hidden-note display |
| Transport | Play/pause, restart, timeline, speed, transpose, A/B loops, error-triggered loop restart, bookmarks, metronome and count-in |
| Keyboard input | Mouse/touch, 18 computer keys with octave shift, USB MIDI, multiple inputs and sustain |
| Practice rules | Simultaneous-held or sequential chords; wrong-key blocking; input loudness/source; selective input sound; timing offset; feedback and statistics |
| Sound | Offline sampled piano, synthesized tones, bundled/custom SoundFonts, boost/limiter, reverb, General MIDI instruments and percussion |
| MIDI expression | Pitch bend, volume, expression and pan; modulation/reverb/chorus controllers in SoundFont mode; seek-state restoration; MIDI export preserves these events |
| MIDI output | One output or all outputs, separate my-notes/background/percussion/metronome routing, program-change toggle and velocity scaling |
| Display | Falling notes, sheet music, measure lines, current-key labels, finger hints, helper dots, custom key range, contrast, label size, title/statistics toggles |
| Appearance | Four themes, reduced decorative motion, larger touch controls, idle pointer hiding, optional note particles, completion sound and FPS |
| Sheet music | Imported MusicXML, generated MIDI notation with meter/key changes, cursor/follow, score-only mode, print, click-to-seek |
| Shortcuts | Editable transport/display shortcuts, conflict checking and reset; Space always controls transport in the piano view |
| Free play | Separate main-menu workspace with independent recording/export state; live note trails, chord names, instrument choice, recording, layered overdubs with pause/resume, MIDI export |
| Progress and exercises | Local profiles and histories, best-accuracy chart, five arrangements, generators for scales/arpeggios/chords in 12 keys |

## Differences still present

- The interface and scoring are independent implementations. Synthesia's licensed songs/assets, proprietary metadata formats, account/store integration, translations and exact layout are not reproduced.
- No device-specific keyboard lighting or accompaniment styles. Physical MIDI hardware has not been exercised; simulated input/output tests are listed in VERIFICATION.md.
- No MIDI aftertouch, bank-select/RPN/NRPN, raw SysEx, or pedals beyond sustain. Pitch bends use a two-semitone range. Multiple outputs share the same routing choices.
- Computer piano-note key mappings remain fixed; the action shortcuts are editable. MIDI files without hand metadata still require inference or manual hand assignment.
- MusicXML repeats/endings/navigation, ornaments and grace-note playback are not expanded. MIDI sheet music remains quantized; automatic fingering and note-release scoring are not implemented.
- Folder access uses browser permissions rather than an unrestricted background filesystem service. Folder checks stop during playback/recording and are capped at 2,000 matching files per scan and 20 directory levels.
- Recordings capture notes and sustain-expanded duration, not audio/controller automation. Browser storage holds the library, and Export MIDI provides separate copies.

Public reference guides: [Synthesia support](https://www.synthesiagame.com/support), [song setup](https://www.synthesiagame.com/support/guide/songSetup), [recording](https://www.synthesiagame.com/support/guide/recording).
