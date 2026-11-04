# FakeMax: a generative orchestra

Layers of real orchestral samples that write themselves, in the spirit of Max Richter and Philip Glass.
It has Wotja-style layers and Eno-app-style simple controls.

## Run it
The browser needs to load the page from a small local server, not straight from the file:

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open http://localhost:8642 in Chrome, Edge, Safari or Firefox and press the big play button (or Space).
It needs an internet connection: the samples stream from the VSCO 2 Community Edition library, and your browser caches them after the first load.

## How it works
- **Moods** are starting points: Daylight, Metamorphosis, Snowfall, Hymn, Pulse and Elegy.
- **Key, mode, tempo and "chords every"** set the harmony that every layer follows. **Evolve** controls how often the chord progression changes.
- **Glass me / Max me / Eno me** each add that composer's signature layer, leaving what's already playing alone. Repeated presses add the next signature in turn, and **Undo** steps back:
  - **Glass:** a triplet piano figure (3 against 2), a 16th-note marimba figure, a pulsing bass, or a rocking clarinet figure.
  - **Max:** a solo violin lament, a cello line that sinks into each chord, swelling string chords, or a slow piano arpeggio.
  - **Eno:** Drift loops (piano, glockenspiel, harp, flute), each with a different loop length.
  - Tick **Also change key, chords & tempo** to move the harmony, tempo, dynamics and reverb towards the style as well.
- **Phase** on a layer card adds a Steve Reich-style copy. It plays exactly the same notes but runs slightly slow, slipping a whole beat out of step every 15 s to 2 minutes (set by the Phase speed knob) before coming back into unison. Give the copy a different instrument to make a canon.
- **Layers** (up to 8) come in six kinds, including **Drift**, the Eno-style loop. Each has an instrument and three knobs:
  - **Pad**: swelling chords with smooth voice-leading.
  - **Ostinato**: Glass-style repeating cells that grow and shrink (additive process).
  - **Melody**: sparse motifs that come back over new chords.
  - **Bass**: tonic pedal, then roots, then roots and fifths.
  - **Sparkle**: scattered bell notes with echoes.
- Drag the knobs up and down, or use the mouse wheel or arrow keys. 🎲 re-rolls a layer, and **Surprise me** re-rolls the whole piece.
- **Presets** are saved in the browser. **Export file** and **Import file** move them between devices.
- **Record** saves exactly what you hear as a 16-bit stereo WAV file.

## Using it with a DAW (Spitfire, BBC SO, LABS…)
Set **Output** to "MIDI only" or "Samples + MIDI", pick a port, and set each card's **ch** (MIDI channel).
- **Mac:** enable the IAC Driver in Audio MIDI Setup, then use it as the input of Logic or MainStage tracks.
- **Windows:** install loopMIDI and select its port in Cubase, Ableton or Reaper.

Web MIDI works in Chrome and Edge, but not in Safari.

## Files
- `js/instruments.js`: the sample map. Octave offsets were measured by pitch detection.
- `js/harmony.js`: keys, modes, progressions and voice-leading.
- `js/layers.js`: the five layer behaviours.
- `js/engine.js`: the clock, the master bus (hall reverb, compressor, limiter) and MIDI out.
- `js/presets.js`: the moods and saved presets.
- `js/recorder.js`: WAV capture.
- `js/app.js`: the interface.

Samples: VSCO 2 Community Edition by Versilian Studios (CC0).
