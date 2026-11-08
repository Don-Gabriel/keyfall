# Third-party components

Keyfall uses original application code and the following freely available components. It contains no Synthesia application code, artwork, branded assets, or bundled Synthesia song arrangements.

- **@tonejs/midi**, Yotam Mann and contributors — MIT. https://github.com/Tonejs/Midi
- **midi-file**, Carter Thaxton and contributors — MIT. https://github.com/carter-thaxton/midi-file
- **fflate**, Arjun Barrett — MIT. https://github.com/101arrowz/fflate
- **OpenSheetMusicDisplay**, PhonicScore and contributors — BSD-3-Clause. https://github.com/opensheetmusicdisplay/opensheetmusicdisplay
- **VexFlow**, Mohit Muthanna and contributors — MIT. Included through OpenSheetMusicDisplay. https://github.com/0xfe/vexflow
- **Vite**, contributors — MIT (development/build tool). https://github.com/vitejs/vite
- **Node.js 24.15.0**, Node.js contributors — MIT and bundled dependency licenses. The Windows installer redistributes the runtime with its complete license in `runtime/LICENSE.txt`. https://github.com/nodejs/node/tree/v24.15.0
- **Inno Setup 6.7.3**, Jordan Russell and Martijn Laan — installer compiler and setup runtime used for this noncommercial personal application. https://jrsoftware.org/
- **SpessaSynth 4.4.7 / spessasynth_core 4.4.9**, Spessasus and contributors — Apache-2.0. Includes the local AudioWorklet processor. https://github.com/spessasus/SpessaSynth
- **GeneralUser GS 2.0.3**, S. Christian Collins — GeneralUser license 2.0, permitting software bundling. Unmodified SoundFont included at `dist/general-user.sf2`; its full license is `dist/GeneralUser-LICENSE.txt` and is also included in `LICENSES.txt`. https://www.schristiancollins.com/generaluser.php

## Grand piano samples

`public/piano.json` contains the acoustic grand piano samples from the FluidR3_GM collection, rendered to MP3 and packaged for MIDI.js by Benjamin Gleitzman and contributors. The upstream project identifies this collection as Creative Commons Attribution 3.0.

- Source: https://github.com/gleitz/midi-js-soundfonts
- Original converted instrument: https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/acoustic_grand_piano-mp3.js
- License: https://creativecommons.org/licenses/by/3.0/
- Modification: removed the JavaScript assignment wrapper and stored the same 88 base64-encoded MP3 samples as JSON. The sound recordings themselves are unchanged. Samples are bundled locally; playback does not contact the source server.

Included melodies are short new practice arrangements of public-domain works or original scale exercises. They are not the complete arrangements supplied with Synthesia.

Full installed dependency license texts are collected in `LICENSES.txt` for distribution with the built app.

## Native packaging in 0.5.0

- Capacitor core, Android/iOS runtimes and App/Filesystem/Share plugins — MIT, Ionic/OutSystems and contributors. https://capacitorjs.com/
- Electron — MIT, Electron contributors; the packaged macOS runtime includes its Chromium and third-party notices. https://www.electronjs.org/
- electron-builder — MIT, contributors (packaging tool). https://www.electron.build/
- AndroidX and Gradle components retain their upstream Apache-2.0 and other applicable licenses. The native projects declare these dependencies in their build files.
