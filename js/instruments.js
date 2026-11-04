/* Instrument bank: VSCO 2 Community Edition samples (CC0) streamed from jsDelivr,
   with a synth fallback when a sample set can't be loaded (e.g. offline). */
const VSCO_BASE = 'https://cdn.jsdelivr.net/gh/sgossner/VSCO-2-CE@master/';
const VSCO_FALLBACK = 'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/';

// `notes` are the note names written in the VSCO file names. `shift` (semitones, measured by pitch detection) corrects
// libraries whose file names use a different octave convention from scientific pitch.
// `kind`: 'sustain' instruments swell and hold, 'pluck' instruments decay on their own.
const INSTRUMENTS = [
  { id: 'piano', name: 'Upright Piano', family: 'keys', kind: 'pluck',
    dir: 'Keys/Upright Nr1/', file: n => `UR1_${n}_mf_RR1.wav`,
    notes: ['C2', 'G2', 'C3', 'G3', 'C4', 'G4', 'C5', 'G5', 'C6'],
    shift: 0, release: 1.2, gain: 0 },
  { id: 'violins', name: 'Violins', family: 'strings', kind: 'sustain',
    dir: 'Strings/Violin Section/susVib/', file: n => `VlnEns_susVib_${n}_v1.wav`,
    notes: ['G2', 'D3', 'A3', 'E4', 'B4', 'D5'],
    shift: 12, release: 1.6, gain: 0 },
  { id: 'violas', name: 'Violas', family: 'strings', kind: 'sustain',
    dir: 'Strings/Viola Section/susvib/', file: n => `ViolaEns_susvib_${n}_v1_1.wav`,
    notes: ['C2', 'G2', 'D3', 'A3', 'E4', 'G4'],
    shift: 12, release: 1.6, gain: 0 },
  { id: 'cellos', name: 'Cellos', family: 'strings', kind: 'sustain',
    dir: 'Strings/Cello Section/susvib/', file: n => `susvib_${n}_v1_1.wav`,
    notes: ['C1', 'G1', 'D2', 'A2', 'E3', 'B3'],
    shift: 12, release: 1.6, gain: 0 },
  { id: 'bass', name: 'Contrabass', family: 'strings', kind: 'sustain',
    dir: 'Strings/Solo Contrabass/SusVib/', file: n => `BKCtbss_SusVib_${n}_v1_rr1.wav`,
    notes: ['F#0', 'D1', 'A1', 'E2', 'G#2'],
    shift: 12, release: 1.4, gain: 2 },
  { id: 'solo-violin', name: 'Solo Violin', family: 'strings', kind: 'sustain',
    dir: 'Strings/Solo Violin/Arco Vib/', file: n => `LLVln_ArcoVib_${n}_p.wav`,
    notes: ['G3', 'C4', 'E4', 'A4', 'C5', 'E5', 'G5'],
    shift: 0, release: 1.2, gain: 0 },
  { id: 'violins-pizz', name: 'Violins Pizzicato', family: 'strings', kind: 'pluck',
    dir: 'Strings/Violin Section/Pizz/', file: n => `VlnEns_Pizz_${n}_v1_rr1.wav`,
    notes: ['G2', 'B2', 'D3', 'F#3', 'A3', 'C4', 'E4', 'G4', 'B4', 'D5'],
    shift: 12, release: 0.6, gain: 0 },
  { id: 'cellos-pizz', name: 'Cellos Pizzicato', family: 'strings', kind: 'pluck',
    dir: 'Strings/Cello Section/pizzT/', file: n => `pizzT_${n}_v1_RR1.wav`,
    notes: ['C1', 'E1', 'G1', 'B1', 'D2', 'F2', 'A2', 'C3', 'E3', 'G3'],
    shift: 12, release: 0.6, gain: 0 },
  { id: 'harp', name: 'Harp', family: 'strings', kind: 'pluck',
    dir: 'Strings/Harp/', file: n => `KSHarp_${n}_mf.wav`,
    notes: ['B1', 'F2', 'C3', 'G3', 'D4', 'A4', 'E5', 'B5', 'F6'],
    shift: 0, release: 2, gain: 0 },
  { id: 'horn', name: 'French Horn', family: 'brass', kind: 'sustain',
    dir: 'Brass/F Horn/sus/', file: n => `MOHorn_sus_${n}_v1_1.wav`,
    notes: ['C1', 'G1', 'D2', 'A2', 'C3'],
    shift: 12, release: 1.2, gain: 0 },
  { id: 'flute', name: 'Flute', family: 'woodwinds', kind: 'sustain',
    dir: 'Woodwinds/Flute/susvib/', file: n => `LDFlute_susvib_${n}_v1_1.wav`,
    notes: ['C3', 'E3', 'A3', 'C4', 'E4', 'A4', 'C5', 'E5', 'A5', 'C6'],
    shift: 12, release: 0.8, gain: 0 },
  { id: 'clarinet', name: 'Clarinet', family: 'woodwinds', kind: 'sustain',
    dir: 'Woodwinds/Clarinet/susLong/', file: n => `DCClar_susLong_${n}_v1_rr1_sum.wav`,
    notes: ['D2', 'A#2', 'F3', 'D4', 'A#4', 'F#5'],
    shift: 12, release: 0.8, gain: 0 },
  { id: 'oboe', name: 'Oboe', family: 'woodwinds', kind: 'sustain',
    dir: 'Woodwinds/Oboe/Vib/', file: n => `Oboe_Vib_${n}_v1_Main.wav`,
    notes: ['A#2', 'D3', 'F3', 'A#3', 'D4', 'F4', 'A#4', 'D5', 'F5'],
    shift: 12, release: 0.8, gain: 0 },
  { id: 'bassoon', name: 'Bassoon', family: 'woodwinds', kind: 'sustain',
    dir: 'Woodwinds/Bassoon/sus/', file: n => `PSBassoon_${n}_v1_1.wav`,
    notes: ['A#0', 'F1', 'C2', 'G2', 'C3', 'G#3'],
    shift: 12, release: 0.8, gain: 0 },
  { id: 'glock', name: 'Glockenspiel', family: 'percussion', kind: 'pluck',
    dir: 'Percussion/Glock/', file: n => `glock_medium_${n}.wav`,
    notes: ['G4', 'C5', 'G5', 'C6', 'G6', 'C7'],
    shift: 12, release: 2, gain: -6 },
  { id: 'marimba', name: 'Marimba', family: 'percussion', kind: 'pluck',
    dir: 'Percussion/Marimba/', file: n => `Marimba_hit_Outrigger_${n}_loud_01.wav`,
    notes: ['F1', 'C2', 'G2', 'B2', 'F3', 'C4', 'G4', 'B4', 'F5', 'C6'],
    shift: 12, release: 1, gain: -4 },
];

const InstrumentBank = (() => {
  const byId = Object.fromEntries(INSTRUMENTS.map(i => [i.id, i]));
  const buffers = {};   // id -> Promise<{ [midi]: AudioBuffer }>
  const progress = { total: 0, done: 0, listeners: new Set() };

  function emit() { progress.listeners.forEach(fn => fn(progress.done, progress.total)); }

  function noteToMidi(n) {
    const m = /^([A-G])(#?)(-?\d)$/.exec(n);
    const pc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
    return pc + (parseInt(m[3], 10) + 1) * 12;
  }

  function urlFor(inst, note, base = VSCO_BASE) {
    const path = inst.dir.split('/').map(encodeURIComponent).join('/');
    return base + path + encodeURIComponent(inst.file(note));
  }

  // jsDelivr occasionally refuses individual files, so fall back to GitHub's raw host.
  async function fetchSample(inst, note) {
    for (const base of [VSCO_BASE, VSCO_FALLBACK]) {
      try {
        const res = await fetch(urlFor(inst, note, base));
        if (res.ok) return await Tone.context.decodeAudioData(await res.arrayBuffer());
      } catch (e) { /* try the next host */ }
    }
    return null;
  }

  function peakOf(buf) {
    let peak = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i += 4) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
    }
    return peak;
  }

  // Resolves to { buffers: { midi: AudioBuffer }, trim: dB }. Missing notes are skipped (the
  // sampler stretches its neighbours); `trim` brings each instrument up to a common level.
  // `background` loads (preloading) stay out of the progress count, so the page never says
  // it is waiting for samples nobody has asked for yet.
  function load(id, background = false) {
    if (buffers[id]) return buffers[id];
    const inst = byId[id];
    const count = !background;
    if (count) { progress.total += inst.notes.length; emit(); }
    buffers[id] = Promise.all(inst.notes.map(async n => {
      try { return [noteToMidi(n) + inst.shift, await fetchSample(inst, n)]; }
      finally { if (count) { progress.done++; emit(); } }
    })).then(pairs => {
      const ok = pairs.filter(([, b]) => b);
      if (!ok.length) throw new Error(`No samples could be loaded for ${inst.name}`);
      const peak = Math.max(...ok.map(([, b]) => peakOf(b)));
      return { buffers: Object.fromEntries(ok), trim: Math.min(24, -20 * Math.log10(peak || 1) - 3) };
    });
    buffers[id].then(() => { loaded.add(id); emitPreload(); },
                     err => console.warn(`Using synth for ${inst.name}:`, err.message));
    return buffers[id];
  }

  /* ---------- Background preloading ---------- */
  const loaded = new Set();
  const preloadListeners = new Set();
  let preloading = false, run = 0;   // `run` retires an older loop if preloading is restarted

  function emitPreload() { preloadListeners.forEach(fn => fn(loaded.size, INSTRUMENTS.length, preloading)); }
  const busy = () => progress.done < progress.total;

  // Fetches every remaining instrument, one at a time, pausing while anything you actually
  // asked for is still loading so it never slows down the music you're about to hear.
  async function preloadAll() {
    if (preloading) return;
    const me = ++run;
    preloading = true; emitPreload();
    for (const inst of INSTRUMENTS) {
      while (busy() && me === run) await new Promise(r => setTimeout(r, 500));
      if (me !== run) return;
      if (!buffers[inst.id]) await load(inst.id, true).catch(() => {});
    }
    if (me === run) { preloading = false; emitPreload(); }
  }

  function stopPreload() { run++; preloading = false; emitPreload(); }

  // The playable midi range: from the lowest to the highest sample, plus a few semitones.
  function range(id) {
    const inst = byId[id];
    const ms = inst.notes.map(n => noteToMidi(n) + inst.shift);
    return [Math.min(...ms) - 2, Math.max(...ms) + 4];
  }

  function fallbackSynth(inst) {
    const sustain = inst.kind === 'sustain';
    return new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: sustain ? 1 : 3, modulationIndex: sustain ? 1.5 : 6,
      envelope: sustain ? { attack: 0.6, decay: 0.3, sustain: 0.8, release: inst.release }
                        : { attack: 0.005, decay: 1.2, sustain: 0, release: inst.release },
      volume: -10,
    });
  }

  // Resolves to a playable voice. Each layer gets its own Sampler, sharing the decoded buffers.
  async function createVoice(id) {
    const inst = byId[id];
    let node, sampled = true;
    try {
      const { buffers: bufs, trim } = await load(id);
      const urls = {};
      for (const [midi, buf] of Object.entries(bufs)) urls[Tone.Frequency(+midi, 'midi').toNote()] = buf;
      node = new Tone.Sampler({ urls, release: inst.release, volume: inst.gain + trim });
    } catch (e) {
      node = fallbackSynth(inst); sampled = false;
    }
    return { inst, node, sampled };
  }

  return {
    list: INSTRUMENTS, get: id => byId[id], load, range, createVoice, noteToMidi, urlFor,
    preloadAll, stopPreload, busy,
    onProgress: fn => { progress.listeners.add(fn); fn(progress.done, progress.total); },
    onPreload: fn => { preloadListeners.add(fn); fn(loaded.size, INSTRUMENTS.length, preloading); },
  };
})();
