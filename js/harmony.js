/* Harmony: key, mode and a slowly turning chord progression that every layer follows. */
const Harmony = (() => {
  const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const MODES = {
    minor:  [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    major:  [0, 2, 4, 5, 7, 9, 11],
    lydian: [0, 2, 4, 6, 7, 9, 11],
  };
  // Scale degrees (0 = tonic). Minor ones lean on the i–VI–III–VII family Richter loves;
  // major ones are the plain diatonic loops Glass and Eno build on.
  const PROGRESSIONS = {
    minor: [[0, 5, 2, 6], [0, 3, 5, 4], [0, 5, 3, 4], [5, 3, 0, 4], [0, 6, 5, 6], [0, 2, 5, 3], [0, 0, 5, 5]],
    major: [[0, 4, 5, 3], [0, 5, 3, 4], [3, 0, 4, 5], [0, 3, 5, 4], [5, 3, 0, 4], [0, 2, 3, 0]],
  };
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  // `pool` is an optional set of progressions a composer style draws from instead of the defaults.
  const state = { key: 9, mode: 'minor', chordBars: 2, prog: PROGRESSIONS.minor[0], index: 0, chord: null, pool: null };

  const scale = () => MODES[state.mode];
  const family = () => (state.mode === 'minor' || state.mode === 'dorian' ? 'minor' : 'major');
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function buildChord(degree) {
    const sc = scale();
    const tone = k => (state.key + sc[(degree + k) % 7]) % 12;
    const pcs = [tone(0), tone(2), tone(4)];
    const third = (pcs[1] - pcs[0] + 12) % 12, fifth = (pcs[2] - pcs[0] + 12) % 12;
    const quality = fifth === 6 ? 'dim' : third === 3 ? 'm' : '';
    const roman = quality === '' ? ROMAN[degree] : ROMAN[degree].toLowerCase();
    return { degree, root: pcs[0], pcs, seventh: tone(6), name: NOTE_NAMES[pcs[0]] + quality, roman };
  }

  function reset() {
    state.index = 0;
    state.chord = buildChord(state.prog[0]);
  }

  // Moves to the next chord. At the end of a cycle, `evolve` is the chance of a new progression.
  function advance(evolve) {
    state.index++;
    if (state.index >= state.prog.length) {
      state.index = 0;
      if (Math.random() < evolve) state.prog = pick(state.pool || PROGRESSIONS[family()]);
    }
    state.chord = buildChord(state.prog[state.index]);
    return state.chord;
  }

  function setKey(key, mode) {
    const changedFamily = mode && family() !== (mode === 'minor' || mode === 'dorian' ? 'minor' : 'major');
    state.key = key;
    if (mode) state.mode = mode;
    if (changedFamily) { state.pool = null; state.prog = pick(PROGRESSIONS[family()]); state.index = 0; }
    state.chord = buildChord(state.prog[state.index] ?? 0);
  }

  function newProgression() { state.pool = null; state.prog = pick(PROGRESSIONS[family()]); reset(); }

  // Switches to a style's progressions. The current chord keeps sounding and the new
  // progression starts from its first chord at the next chord change.
  function useStyle(pool) {
    state.pool = pool;
    state.prog = pick(pool);
    state.index = state.prog.length - 1;
  }

  function peek() { return buildChord(state.prog[(state.index + 1) % state.prog.length]); }

  // The five-note scale: drops the two notes most likely to clash (4th and 7th in major, 2nd and 6th in minor).
  function pentatonicPcs() {
    const drop = family() === 'major' ? [3, 6] : [1, 5];
    return scale().filter((_, i) => !drop.includes(i)).map(i => (state.key + i) % 12);
  }

  const inPcs = (m, pcs) => pcs.includes(((m % 12) + 12) % 12);
  function midisIn(pcs, lo, hi) { const out = []; for (let m = lo; m <= hi; m++) if (inPcs(m, pcs)) out.push(m); return out; }
  function scalePcs() { return scale().map(i => (state.key + i) % 12); }
  function nearest(list, target) { return list.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a), list[0]); }

  // Chooses `count` chord tones around `center`. With a previous voicing each voice moves to the
  // nearest chord tone (smooth voice-leading), and the root is kept in the lowest voice.
  function voice(pcs, count, center, lo, hi, prev) {
    const pool = midisIn(pcs, lo, hi);
    if (!pool.length) return [];
    let notes;
    if (prev && prev.length === count) {
      notes = [];
      for (const p of prev) {
        const options = pool.filter(m => !notes.includes(m));
        if (options.length) notes.push(nearest(options, p));
      }
    } else {
      const span = 4 + count * 4;
      notes = pool.filter(m => m >= center - span / 2 && m <= center + span / 2);
      while (notes.length > count) notes.splice(Math.floor(Math.random() * notes.length), 1);
      for (let m of pool) if (notes.length < count && !notes.includes(m)) notes.push(m);
    }
    notes.sort((a, b) => a - b);
    const lowest = notes[0];
    if (lowest !== undefined && (lowest % 12) !== pcs[0]) {
      const roots = midisIn([pcs[0]], lo, hi).filter(m => m <= lowest + 2 && !notes.includes(m));
      if (roots.length) notes[0] = nearest(roots, lowest);
    }
    return [...new Set(notes)].sort((a, b) => a - b);
  }

  function describe() { return `${NOTE_NAMES[state.key]} ${state.mode}`; }

  reset();
  return {
    NOTE_NAMES, MODES, state, reset, advance, setKey, newProgression, useStyle, peek, describe,
    current: () => state.chord, family, scalePcs, pentatonicPcs, midisIn, nearest, voice,
  };
})();
