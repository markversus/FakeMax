/* Composer buttons: "Glass me", "Max me" and "Eno me" each add that composer's signature
   layer, leaving everything already playing alone. Repeated presses work through a rotation
   of signatures. With "Also change key, chords & tempo" on, the piece-wide harmony, tempo,
   dynamics and reverb move towards the style too (existing layers are still untouched). */
const Composers = (() => {
  const SIGNATURES = {
    glass: [
      { what: 'a piano figure in threes against the twos', type: 'ostinato', instrument: 'piano',
        params: { pattern: 0, evolve: 0.6, register: 0.55, triplets: true }, volume: 0.5, reverb: 0.35, pan: 0.2 },
      { what: 'a 16th-note marimba figure that grows and shrinks', type: 'ostinato', instrument: 'marimba',
        params: { pattern: 0.55, speed: 0.9, evolve: 0.75, register: 0.5 }, volume: 0.45, reverb: 0.35, pan: -0.25 },
      { what: 'a pulsing bass on every beat', type: 'bass', instrument: 'cellos',
        params: { pulse: true, register: 0.35 }, volume: 0.5, reverb: 0.3 },
      { what: 'a rocking clarinet figure', type: 'ostinato', instrument: 'clarinet',
        params: { pattern: 0.7, speed: 0.5, evolve: 0.7, register: 0.35 }, volume: 0.45, reverb: 0.4, pan: 0.3 },
    ],
    max: [
      { what: 'a solo violin lament', type: 'melody', instrument: 'solo-violin',
        params: { rarity: 0.4, repeat: 0.8, range: 0.45 }, volume: 0.5, reverb: 0.7 },
      { what: 'a cello line that sinks into each chord', type: 'bass', instrument: 'cellos',
        params: { walk: true, swell: 0.8, register: 0.45 }, volume: 0.55, reverb: 0.6 },
      { what: 'slowly swelling string chords', type: 'pad', instrument: 'violins',
        params: { swell: 0.95, density: 0.65, register: 0.45 }, volume: 0.5, reverb: 0.65 },
      { what: 'a slow, soft piano arpeggio', type: 'ostinato', instrument: 'piano',
        params: { pattern: 0.2, speed: 0.1, evolve: 0.15, register: 0.45 }, volume: 0.45, reverb: 0.6 },
    ],
    eno: [
      { what: 'a piano loop', type: 'drift', instrument: 'piano', params: { notes: 0.35, register: 0.55 }, volume: 0.5, reverb: 0.9 },
      { what: 'a glockenspiel loop', type: 'drift', instrument: 'glock', params: { notes: 0.25, register: 0.5 }, volume: 0.4, reverb: 0.9 },
      { what: 'a harp loop', type: 'drift', instrument: 'harp', params: { notes: 0.4, register: 0.5 }, volume: 0.5, reverb: 0.9 },
      { what: 'a flute loop', type: 'drift', instrument: 'flute', params: { notes: 0.3, register: 0.5 }, volume: 0.4, reverb: 0.9 },
    ],
  };
  // Drift loop lengths with no simple ratios between them, so loops never line up the same way twice.
  const DRIFT_LENGTHS = [0.31, 0.52, 0.73, 0.17, 0.89, 0.42, 0.63, 0.24];
  const turn = { glass: 0, max: 0, eno: 0 };

  function signature(name) {
    if (Engine.layers.length >= MAX_LAYERS) return null;
    const sig = SIGNATURES[name][turn[name]++ % SIGNATURES[name].length];
    const params = { ...sig.params };
    if (sig.type === 'drift') {
      const used = Engine.layers.filter(l => l.type === 'drift').map(l => l.p.length);
      params.length = DRIFT_LENGTHS.find(x => !used.includes(x)) ?? rand(0.1, 0.9);
    }
    addLayer({ type: sig.type, instrument: sig.instrument, params, volume: sig.volume, reverb: sig.reverb, pan: sig.pan ?? rand(-0.3, 0.3) });
    const loop = sig.type === 'drift' ? ` (${Math.round(9 + params.length * 28)} s)` : '';
    return sig.what + loop;
  }

  // Piece-wide changes, used only when the style switch is on.
  const STYLES = {
    glass() {
      Harmony.useStyle(Harmony.family() === 'minor'
        ? [[0, 5], [0, 6], [0, 5, 2, 6], [0, 3, 5, 6], [0, 5, 0, 6]]
        : [[0, 3], [0, 4], [0, 5, 3, 4], [0, 3, 0, 4]]);
      Harmony.state.chordBars = choose([1, 1, 2]);
      Object.assign(Engine.settings, { evolve: 0.15, arc: 'build' });
      Engine.setReverbDecay(4);
      const bpm = Math.round(rand(104, 132));
      Engine.setBpm(bpm, 4);
      return `${bpm} bpm, rocking chords, building each cycle`;
    },
    max() {
      if (Harmony.family() !== 'minor') Harmony.setKey(Harmony.state.key, 'minor');
      Harmony.useStyle([[0, 5, 2, 6], [0, 4, 5, 3], [0, 6, 5, 4], [5, 3, 0, 4], [0, 6, 5, 3]]);
      Harmony.state.chordBars = choose([2, 2, 4]);
      Object.assign(Engine.settings, { evolve: 0.2, arc: 'swell' });
      Engine.setReverbDecay(9);
      const bpm = Math.round(rand(40, 56));
      Engine.setBpm(bpm, 5);
      return `${bpm} bpm lament in ${Harmony.describe()}, swelling every 8 bars`;
    },
    eno() {
      const mode = choose(['lydian', 'major']);
      Harmony.setKey(Harmony.state.key, mode);
      Harmony.useStyle(mode === 'lydian' ? [[0], [0, 1], [0, 0, 1]] : [[0], [0, 3], [0, 0, 4], [0, 3, 0]]);
      Harmony.state.chordBars = 4;
      Object.assign(Engine.settings, { evolve: 0.05, arc: 'none' });
      Engine.setReverbDecay(12);
      Engine.setBpm(Math.round(rand(54, 66)), 4);
      return `near-still ${Harmony.describe()} harmony with a long reverb`;
    },
  };

  const NAMES = { glass: 'Glass', max: 'Max', eno: 'Eno' };

  function apply(name, withStyle) {
    const added = signature(name);
    const style = withStyle ? STYLES[name]() : null;
    if (!added && !style) return 'All 8 layers are in use. Remove one to add another.';
    const parts = [added && `added ${added}`, style].filter(Boolean);
    const full = added ? '' : ' (no room for another layer)';
    return `${NAMES[name]}: ${parts.join('; ')}${full}.`;
  }

  return { apply };
})();
