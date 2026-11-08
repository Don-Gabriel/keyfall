# Keyfall

A local piano practice application inspired by the falling-note workflow in Synthesia. Original application code, no account, no subscription, no paid API, and no internet connection required after installation. **This is a functional independent implementation, not a complete feature-for-feature Synthesia clone.**

## Install on Windows

Download the Windows installer from the repository Releases page. The Inno Setup installer places Keyfall under your local Programs folder, includes Node.js and all piano/notation assets, and creates Start Menu and optional desktop shortcuts. Launch **Keyfall** from either shortcut. Windows Settings > Apps provides the uninstaller.

The installer requires 64-bit Windows 10 or later and Chrome or Edge. It does not need administrator rights or a separately installed Node.js runtime. It is a locally built, unsigned installer. The app opens in a browser-powered application window.

## Run the source checkout

Double-click **Start Keyfall.vbs** in the source checkout. It starts a local server and opens the app in a Chrome or Edge application window. The launcher uses Node directly and does not override PowerShell execution policy. If Windows blocks VBS, run `node Start-Keyfall.mjs`, or run `npm start` and open http://127.0.0.1:5188.

Run `npm ci` and `npm run build` to create the `dist` folder. Running the source checkout needs Node.js, which is already installed on the development computer. The installer instead includes its own runtime and a compiled, console-free `Keyfall.exe` launcher. The local server listens only on `127.0.0.1:5188`.

Opening the same URL and port in the same browser profile preserves your library. A different browser/profile uses a different library. The browser stores imported songs in IndexedDB and settings, bookmarks, finger hints, favorites, and practice history in localStorage. Export recordings and imported songs as MIDI for separate backups; clearing browser data removes the local library.

## What works

- Entry screen with Play a song, Free play, Settings, music devices, progress, help and Continue. Song selection opens a dedicated practice-options screen with hand choices, favorites, counts and a recent accuracy chart.
- Full-page song library and categorized settings. Consistent Back/Main menu controls pause playback and save practice progress. Continue restores the last piano position (recitals restart from the beginning).
- Local player profiles, creation, switching and renaming. Practice history and favorites are separate per player; imported songs and audio/display settings are shared. Existing history remains with Player 1.
- Left/Both/Right buttons replace the hand dropdown. Other option choices use button lists, with search for long instrument lists. Space always controls playback while in the piano view, even when the timeline or another control has focus.



- Full 88-key falling-note display, velocity-sensitive sound, note labels, and hand colors.
- Offline sampled FluidR3 grand piano, plus synthesized piano, soft keys, and organ sounds. Louder output, 0/+6/+12 dB boost, master volume and a soft peak ceiling.
- Bundled GeneralUser GS soundbank with General MIDI instruments and percussion. Custom SF2/SF3/DLS import, persistent soundbank selection, free-play instrument and per-track instrument, volume, mute and color controls.
- Playback, pause, restart, seeking, 10–200% speed, ±12-semitone transposition, volume, metronome, and count-in.
- Learn notes: waits for each selected-hand note/chord. The unselected hand plays automatically.
- Rhythm practice: scores hits, missed notes and wrong notes with a ±180 ms song-time window. Adjustable input timing offset. Recital mode fixes original speed and disables seeking/loops for a complete attempt.
- Practice left, right, or both hands. Assign individual tracks to a hand, split by pitch, accompaniment, or mute.
- A/B loops, named/deletable song bookmarks, manual finger-number hints, and configurable look-ahead/range. Separate keyboard/falling-note labels: note names, computer mapping, fixed Do, scale numbers, finger hints and octaves where applicable. Label size, contrast, grid/note visibility, automatic computer octave and focus mode.
- MIDI hand inference uses explicit track names, two-part pitch registers, and local registers for combined polyphonic tracks. It can distinguish both hands above C4. Manual hand assignments and split point override estimates.
- MIDI format 0/1 import/export with tempo and meter changes, key signatures, multiple tracks, sustain durations, pitch bend and CC 1/7/10/11/91/93 automation.
- Partwise MusicXML and compressed MXL import. Basic pitch, duration, chords, voices, staff hand assignment, transposition, tempo changes, and tied notes.
- Sheet music through OpenSheetMusicDisplay. Original MusicXML notation is retained; MIDI notation is quantized to sixteenths. Score-only display and printing are available. Playback cursor and scroll-follow work for supported scores.
- USB/MIDI keyboard input, multiple simultaneous inputs, single or all-device MIDI output with category routing and velocity scaling, note-on/off, input sustain pedal, and hot-plug refresh.
- Computer keyboard and mouse/touch piano input. Free play with chord names and live rising-note trails, without the selected song's falling notes.
- Record a performance or add another recording layer over any song, retain it in the local library, replay it, and export MIDI. Sustain is baked into recorded note durations.
- Searchable local song library, folder import, favorites, nine sorting choices, five short included public-domain melody arrangements/exercises, and practice history.
- Responsive interface, native modal focus handling, visible keyboard focus, named controls, and fullscreen.

- Gameplay choices: hold a chord together or press its notes in sequence, wrong-note blocking, selective live sound, song/input/fixed loudness, silence-on-pause, helper dots, live statistics and feedback. A/B loops can automatically restart after a selected error count.
- Four color themes; title, statistics and paused-message visibility; idle pointer hiding; reduced decorative motion; touch sizing; optional particles, completion sound and actual frame-rate display.
- Movable Do, key-aware scale numbers, simple white-key labels, selected-hand-only note labels and a custom visible keyboard range. Reverb choices and pan/hidden-notes controls for individual tracks.
- Editable keyboard shortcuts with conflict checking. Space remains dedicated to transport. Pause and scroll the falling notes with the mouse wheel; click a sheet-music note to seek (outside recital/recording).
- Recent songs, play counts, ratings, editable title/composer/difficulty/group, short previews, optional included-song hiding, and new scale/arpeggio/chord exercises in all 12 keys.
- Watched folders through Chrome/Edge's folder picker. Folder handles are stored locally; granted folders are scanned every 30 seconds while stopped. Reconnect when browser permissions expire. Original files are never modified, and removed files remain in your imported library.

## Getting started

1. On the entry screen, choose **Play a song**, then select an included song or **Import songs** to load `.mid`, `.midi`, `.xml`, `.musicxml`, or `.mxl` files. You can also drop files onto the app.
2. Choose **Watch and listen**, **Learn the notes**, **Practice the rhythm**, or **Play a recital**. Choose a hand for practice and use the Start button. The player also lets you switch modes and hands directly.
3. To use your digital piano, click **Connect piano**, then **Enable MIDI access**, and allow the browser permission. Your instrument must send MIDI; an audio-only USB connection is not sufficient.
4. To repeat a section, seek to its start and press **A**, seek to its end and press **B**, then enable **Loop**.
5. To record, open **Free play** from the main menu, press **Record**, play, then press **Stop & save**. You stay in Free play; Export MIDI exports that recording. Your selected practice song and resume position are preserved. **Add recording layer** plays the current song at original speed while recording a new part; Space pauses both. The original song is retained and a new layered song is saved. **Export MIDI** downloads a separate copy.
6. Use **Settings → Songs & folders** for watched folders and generated exercises. Use **Song details & rating** on the song-options screen to organize your music.

## Keyboard shortcuts

| Input | Action |
|---|---|
| A W S E D F T G Y H U J K O L P ; ' | C4 through F5, including black keys |
| Z / X | Lower / raise the computer keyboard octave |
| Shift (hold) | Sustain pedal |
| Space | Play / pause |
| Left / Right arrow | Seek backward / forward five seconds |
| Escape | Stop playback and silence held notes |
| Up / Down arrow | Increase / decrease speed |
| F2 / F3 / F4 / F5 | Sheet music / falling notes / measure lines / labels |
| B / R / M / Q | Bookmark / record / metronome / loop |
| Home / Alt+Enter | Restart / fullscreen |

Space is dedicated to play/pause in the piano view, regardless of which piano, slider, checkbox or button has focus. Piano letters, octave and seek shortcuts also work with slider/checkbox focus; ordinary typing works in search/name fields and menus. On-screen piano buttons accept Enter. A physical keyboard's rollover limit may restrict large chords; MIDI input avoids that restriction.

## Known gaps from Synthesia

This version should **not** be described as a complete clone:

- No Synthesia-owned songs, arrangements, logos, lesson assets, user accounts, store integration or compatibility with its proprietary settings files.
- Five short practice arrangements and generators for 48 scale/arpeggio/chord studies are included; Synthesia's lesson collection and scoring formula are not reproduced.
- No SFZ import, device-specific keyboard light protocols, or accompaniment style generator. Select **Song instruments · SoundFont** for MIDI orchestration/drums; the other tone choices apply the selected tone to all tracks. Custom SF3 and DLS formats are supported by the synthesis library but only SF2 was exercised in the local tests.
- MusicXML playback does not expand repeats, alternate endings, D.C./D.S./coda navigation, grace notes, ornaments, swing, or all expressive directions. It follows written measures once. Scores with repeats display a notice. Only `score-partwise` is accepted.
- MIDI sheet music is an approximation, not a full engraving editor. It uses sixteenth-note quantization, imported meter/key signatures, and automatic voice allocation. Cursor tracking is disabled when the notation library cannot track a particular score. Score pitches remain the original pitches when playback is transposed.
- MIDI format 2 and SMPTE timing are rejected. Pitch bend assumes the standard two-semitone range. Aftertouch, bank-select/RPN/NRPN, raw SysEx and pedal types other than sustain are not reproduced. Modulation/effect controllers affect the SoundFont engine; sampled/synthesized tones reproduce volume, expression, pan and pitch bend. Previously imported songs need re-importing to obtain the new MIDI controller/meter data.
- Recording captures note data and sustain-expanded durations, not audio or every MIDI controller message.
- Rhythm scoring checks note-on accuracy, not note length or release timing. Manual input timing compensation is available; automatic latency measurement is not implemented.
- No cloud sync, translated interface, device-specific key lights, Synthesia-format metadata import, accompaniment style generator, or native USB MIDI support on mobile. Folder scanning uses browser-granted handles, has a 2,000-file/20-level scan limit, and pauses while playing or recording.
- Note imports are limited to 20 MB / 100,000 notes. Compressed MusicXML has a 40 MB total expansion cap. MIDI notation engraving is limited to 1,500 measures.
- Physical MIDI hardware, audio quality on the user's speakers, screen-reader behavior and long practice sessions still need hands-on testing. Simulated MIDI passing is not a real-hardware certification.

## Development

Requires Node.js 20.19+ or 22.12+.

```powershell
npm install
npm run dev
```

The development server and production server both use port 5188. Stop one before starting the other.

```powershell
npm test
npm run build
npm start
```

Browser verification uses Python Playwright with the installed Chrome executable:

```powershell
python tests/browser.py
```

Run a development server on port 5189 for the default browser tests, or set `KEYFALL_URL` to the running production URL. The tests use isolated browser contexts; they do not change the user's regular browser library. `tests/controls.py` and `tests/remaining-controls.py` exercise the additional controls. Screenshots and results are saved under `test-results/`.

The large build chunk is the sheet-music renderer. It is loaded only when sheet music is opened; the main app bundle remains separate.

## Rebuild the installer

After `npm run build`, run `./installer/build-installer.ps1` in PowerShell. This uses the installed Inno Setup 6/7 compiler and Windows .NET Framework C# compiler, bundles the current Node runtime and its license, and writes the installer to `release/`. The runtime license is fetched from the matching official Node.js release tag the first time it is needed.

## Code map

- `src/music.js`: MIDI/MusicXML import, normalization, included arrangements, MIDI export, notation generation.
- `src/engine.js`: transport, practice scoring, loop behavior, synthesized and sampled audio.
- `src/roll.js`: canvas note display and playable keyboard.
- `src/app.js`: application UI, device integration, recording, score display, history.
- `src/storage.js`: local settings and IndexedDB library.
- `src/navigation.js`, `profiles.js`: home/song/settings navigation and local players.
- `src/advanced.js`: gameplay, themes, shortcuts, input/output preferences and recent songs.
- `src/library-tools.js`: folder scanning, song metadata, previews and exercise generation.
- `src/button-choices.js`: keyboard-accessible button menus for options.
- `server.mjs`: production loopback-only static server.

## References and attribution

Feature research: https://synthesiagame.com/ and https://www.synthesiagame.com/support

MIDI interface reference: https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API

See **THIRD-PARTY-NOTICES.md** and **LICENSES.txt** for the piano samples, notation renderer, parser, and other dependencies.
