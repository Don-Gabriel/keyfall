# Keyfall 0.5.0 verification

This release adds native Android/iOS projects, a sandboxed Electron macOS shell, native MIDI-file sharing, and mobile lifecycle/navigation handling. Windows remains the primary platform.

- 34 Node tests passed; the production build passed.
- Current browser checks passed for playback/import/audio (14 groups), navigation (8), Free play separation (4), and UX regressions (6), with no uncaught browser errors.
- Four native Android check groups passed on a dedicated Android 15 emulator with WebView 124: secure local origin, touch audio measured at the output, recording/save, one-time welcome hint, valid MIDI export through the system share sheet, Back navigation, background pause, and landscape keyboard/record-control visibility. The release APK signature was verified independently with Android's apksigner.
- The Electron shell smoke check passed locally on Windows and on the macOS CI runner: secure origin, persistent storage, 88 keys, 88 bundled samples, Free play navigation and audio context startup.
- [GitHub Actions run 42499939920](https://github.com/Don-Gabriel/keyfall/actions/runs/42499939920) passed all four jobs: core, Android compilation, universal macOS packaging and iOS simulator compilation.
- The macOS app is unsigned and not notarized. The iOS build is a simulator compilation check, not a signed IPA or a physical-device test. Android USB MIDI is not implemented. Physical MIDI hardware and device-specific audio latency remain unverified.

Native Android checks are in `tests/native-android.mjs`; use Playwright's experimental Android API with a dedicated debug emulator. Set `KEYFALL_ANDROID_SERIAL` if the emulator differs from the default, and optionally `PLAYWRIGHT_MODULE` to an existing Playwright installation.

Earlier release verification follows for context.

# Keyfall 0.4.2 verification

This update fixes the recurring Free play welcome hint and a broader set of reproducible interaction issues. The hint dismisses on the first piano input and stays dismissed for the rest of that app session, including releases, settings, recording and returning to Free play.

Changes checked:
- Searchable button menus show an empty state, accept Enter, navigate with arrows, close with Escape and restore focus after track controls rebuild. Toolbar menus no longer trigger playback shortcuts while navigating options; Space remains the global transport key.
- A focused timeline continues to reflect playback. Note-label menus synchronize all available choices and restore them after reload.
- Recording status stays below the piano instead of covering it. Pending saves disable record/export, reject another recording, and finish before navigation; closing during a save requests the browser's unsaved-work warning.
- Favorites retain keyboard focus. Song previews reset their pressed state on completion and stop on window blur. Closing sheet music resets Score only. Settings categories start at the top, and toast notifications do not intercept clicks.

Validation: 34 Node tests passed. Browser suites passed: browser.py (14 groups), controls.py (10), remaining-controls.py (7), navigation.py (8), advanced-browser.py (11), freeplay-separation.py (4), and ux-polish.py (6): 60 browser check groups, with no uncaught browser errors. The new UX suite exercises a real blocked IndexedDB transaction to verify pending-save behavior. Native MIDI hardware and an actual printer were not exercised; MIDI devices are simulated and print dispatch is checked. Production build passed with the existing large notation-chunk notice. Desktop and 390px screenshots were inspected.

The final toolbar-key change was followed by a production rebuild and reruns of the UX and navigation suites. Earlier release verification follows for context.

# Keyfall 0.4.1 verification

Free play is now a separate workspace, reachable from the main menu. Only Listen, Learn notes, Practice rhythm and Recital appear in song practice. Free play has its own recording/export state, sound button and keyboard, with song controls and song-only shortcuts removed. Saving or leaving a recording does not replace the current song or its resume position. Starting recording captures keys immediately, including while audio is warming up.

For 0.4.1: 34 engine tests passed. Updated browser.py (14), navigation.py (8), remaining-controls.py (7), advanced-browser.py (11), and freeplay-separation.py (4) passed. The new separation checks cover both workspaces, blocked song shortcuts, independent record/export, autosave, resume after reload and 390px layout. Screenshots were inspected. The production build passed. Earlier 0.4.0 validation follows for reference.

# Keyfall 0.4.0 verification

Tested on Windows with Node.js 24.15.0 and installed Google Chrome in isolated Playwright contexts. Production checks used the built application on loopback port 5190. Normal browser data was not touched and autoplay restrictions were not disabled.

## Results

- 34 Node tests passed: held/sequential chord rules, unisons, wrong-note blocking, loop error thresholds, scoring/timing, meter/tempo grids, count-in, pause behavior, controller/pitch state restoration, MIDI round trips including expression and key signatures, changing-meter notation, output routing, hand inference, local profiles and malformed input.
- 50 browser check groups passed across browser.py (14), controls.py (10), remaining-controls.py (7), navigation.py (8), and advanced-browser.py (11), with no uncaught browser errors.
- The checks exercise entry/library/song options/player/free-play/settings flows, all practice modes, both hand buttons, profiles, every current settings choice, sound modes, SoundFont loading/reset, track controls, loops/bookmarks, recording/overdub/export, imports, favorites, ratings/groups/sorts, previews, exercise generation, custom range, themes, shortcuts, score rendering/seek/print dispatch, multiple simulated MIDI inputs/outputs and 390px layouts.
- The exact reported click regression passed 12 slow play/pause icon clicks. Space passed with timeline, checkbox, piano key, choice and button focus; held Space did not double-toggle.
- Watched-folder tests use real origin-private FileSystemDirectoryHandle objects and IndexedDB handle persistence. Only the native directory picker is substituted. Initial import, modified/new files, reload, rescan and removing the watcher passed. No real user folder permission was granted by these tests.
- The user's 7,036-note MIDI imported and played with 1,644 blue left-hand and 5,392 green right-hand notes. Manual correction remains available because imported hands can be inferred.
- Audio signal checks passed for all five tone choices and SoundFont piano, violin and flute. The output-chain measurement remains 5.49 times the earlier quiet C4 amplitude at the same master setting; a maximum-volume ten-note chord with +12 dB boost peaked at 0.920745. Master mute produced zero output.
- The new setting screens, home screen, themes and mobile layout were captured and inspected. A production build passed; the lazily loaded notation library still produces Vite's large-chunk size notice.
- The MIDI tests caught and fixed Tone 2.0.28 encoder mismatches for normalized pitch bends and key signatures. Export uses signed 14-bit bends and corrected key-signature events.

## Reproducing the checks

Run `npm test` and `npm run build`. Start `node server.mjs` with `KEYFALL_PORT=5190`. Set `KEYFALL_URL=http://127.0.0.1:5190` and run each of the five Python browser scripts above. Audio-level measurements import the source engine from a Vite server on port 5189. Real-song verification uses the MIDI named in tests/real-song.py.

The Inno Setup installer bundles the built assets, offline soundbanks, Node runtime, compiled console-free launcher, documentation and licenses. It supports per-user installation and uninstall without deleting the browser library. Release packaging is checked by installing to an isolated directory, comparing installed asset hashes with dist, testing the bundled server, and uninstalling the test copy.

## Limits

Physical MIDI devices, subjective laptop-speaker quality, real hardware latency, printer output, screen-reader behavior and multi-hour endurance are not certified by these checks. SF2 was tested; SF3/DLS support comes from the synthesis library and was not separately exercised. The real native folder picker/permission dialog remains a user interaction.

The open Synthesia 10.9.5903 app was inspected for its home, song, display, sound, gameplay, shortcuts, theme and advanced settings. Keyfall is not a complete Synthesia clone. FEATURE-COVERAGE.md and README.md describe the remaining differences. MIDI notation is approximate; some MusicXML scores cannot initialize cursor tracking, in which case Follow is disabled while the score remains readable.

Detailed test results, screenshots, audio measurements and packaging evidence are retained in the source checkout under test-results.
