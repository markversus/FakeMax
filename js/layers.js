/* Layers: each one is a simple generative "player" with three friendly controls.
   Every tick it looks at the current chord and decides whether to play. */
const rand = (a, b) => a + Math.random() * (b - a);
const chance = p => Math.random() < p;
const choose = a => a[Math.floor(Math.random() * a.length)];

// Glass-style cells, as indices into the chord tones (low to high).
const OSTINATO_PATTERNS = [
  { name: 'Rising',   cells: [0, 1, 2, 3, 4, 5] },
  { name: 'Alberti',  cells: [0, 2, 1, 2] },
  { name: 'Wave',     cells: [0, 1, 2, 3, 4, 3, 2, 1] },
  { name: 'Broken',   cells: [0, 2, 1, 3, 2, 4, 3, 5] },
  { name: '3 + 2',    cells: [0, 1, 2, 0, 1] },
  { name: 'Pendulum', cells: [0, 3, 1, 4, 2, 5] },
];
const MELODY_RHYTHMS = [[8, 8], [4, 4, 8], [6, 2, 8], [4, 4, 4, 4], [12, 4], [8, 4, 4], [16], [2, 2, 4, 8]];

const LAYER_TYPES = {
  pad: {
    label: 'Pad', blurb: 'Slow swelling chords',
    instrument: 'violins', registerBias: [0.35, 0.8],
    controls: [['swell', 'Swell'], ['register', 'Register'], ['density', 'Voices']],
    defaults: { swell: 0.6, register: 0.5, density: 0.5 },
    tick(l, c) {
      const chordDur = c.chordSteps * c.stepDur;
      const restrike = chordDur > 9 && c.stepInChord === c.chordSteps / 2;
      if (c.stepInChord !== 0 && !restrike) return;
      const count = 2 + Math.round(l.p.density * 3);
      if (!restrike || !l.s.voicing) l.s.voicing = Harmony.voice(c.chord.pcs, count, l.center(), l.lo, l.hi, l.s.voicing);
      l.s.phase = (l.s.phase || 0) + 1;
      const swellVel = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(l.s.phase * 0.9));
      const dur = restrike || chordDur > 9 ? chordDur / 2 + 0.6 : chordDur + 0.3;
      l.setAttack(0.05 + l.p.swell * 3);
      if (l.isPluck()) {
        // Plucked pads are rolled, low to high, like a harpist or a pianist spreading a chord.
        l.s.voicing.forEach((m, i) => l.play([m], Math.max(dur, 2), c.time + i * 0.09 * (0.5 + l.p.swell), swellVel));
      } else {
        l.play(l.s.voicing, dur, c.time, restrike ? swellVel * 0.8 : swellVel);
      }
    },
  },

  ostinato: {
    label: 'Ostinato', blurb: 'Repeating Glass-style figures',
    instrument: 'piano', registerBias: [0.3, 0.75],
    controls: [['pattern', 'Pattern'], ['speed', 'Speed'], ['evolve', 'Evolve']],
    defaults: { pattern: 0.3, speed: 0.5, evolve: 0.4 },
    tick(l, c) {
      const pat = OSTINATO_PATTERNS[Math.min(OSTINATO_PATTERNS.length - 1, Math.floor(l.p.pattern * OSTINATO_PATTERNS.length))];
      if (c.stepInChord === 0) {
        // Additive process: the active part of the cell grows and shrinks, a note at a time.
        if (l.s.pattern !== pat) { l.s.pattern = pat; l.s.len = pat.cells.length; l.s.dir = -1; }
        if (chance(l.p.evolve)) {
          l.s.len += l.s.dir;
          if (l.s.len <= 2 || l.s.len >= pat.cells.length) l.s.dir *= -1;
          l.s.len = Math.max(2, Math.min(pat.cells.length, l.s.len));
        }
        const center = l.center();
        l.s.pool = Harmony.midisIn(c.chord.pcs, center - 7, center + 14).slice(0, 6);
        l.s.pos = 0;
      }
      if (!l.s.pool || !l.s.pool.length) return;
      const cell = (time, len) => {
        const idx = l.s.pos % l.s.len;
        const note = l.s.pool[l.s.pattern.cells[idx] % l.s.pool.length];
        const vel = (idx === 0 ? 0.62 : 0.45) + rand(-0.05, 0.05);
        l.play([note], len * (l.isPluck() ? 3 : 0.95), time, vel);
        l.s.pos++;
      };
      // Triplets: three notes per beat, which set against duple layers gives Glass's 3-against-2.
      if (l.p.triplets) {
        if (c.step % 4 !== 0) return;
        const t = (4 * c.stepDur) / 3;
        for (let k = 0; k < 3; k++) cell(c.time + k * t, t);
        return;
      }
      const every = l.p.speed < 0.34 ? 4 : l.p.speed < 0.67 ? 2 : 1;
      if (c.step % every === 0) cell(c.time, every * c.stepDur);
    },
  },

  melody: {
    label: 'Melody', blurb: 'Sparse phrases that come back',
    instrument: 'solo-violin', registerBias: [0.4, 0.8],
    controls: [['rarity', 'Rarity'], ['range', 'Range'], ['repeat', 'Repeat']],
    defaults: { rarity: 0.5, range: 0.5, repeat: 0.6 },
    tick(l, c) {
      l.s.queue = l.s.queue || [];
      if (c.step % c.stepsPerBar === 0 && !l.s.queue.length) {
        if (l.s.rest > 0) { l.s.rest--; }
        else if (chance(0.9 - l.p.rarity * 0.75)) {
          if (!l.s.motif || !chance(l.p.repeat)) l.s.motif = newMotif();
          l.s.queue = realise(l, c, l.s.motif);
          l.s.rest = Math.round(l.p.rarity * 3);
        }
      }
      while (l.s.queue.length && l.s.queue[0].step <= c.step) {
        const n = l.s.queue.shift();
        l.play([n.midi], n.steps * c.stepDur * 1.1, c.time, n.vel);
      }
    },
  },

  bass: {
    label: 'Bass', blurb: 'Roots and long pedal notes',
    instrument: 'cellos', registerBias: [0, 0.4],
    controls: [['register', 'Depth'], ['movement', 'Movement'], ['swell', 'Swell']],
    defaults: { register: 0.4, movement: 0.5, swell: 0.5 },
    tick(l, c) {
      if (l.p.pulse) return pulseBass(l, c);
      if (l.p.walk) return walkingBass(l, c);
      const chordDur = c.chordSteps * c.stepDur;
      const pluck = l.isPluck();
      const half = c.chordSteps / 2;
      const strikeHalf = c.stepInChord === half && (pluck || l.p.movement > 0.66 || chordDur > 9);
      const strikeBar = pluck && c.stepInChord % c.stepsPerBar === 0 && c.stepInChord !== 0 && c.stepInChord !== half;
      if (c.stepInChord !== 0 && !strikeHalf && !strikeBar) return;
      // Low movement holds the tonic as a pedal; more movement follows roots, then adds fifths.
      const pc = l.p.movement < 0.33 ? Harmony.state.key : c.chord.root;
      const pcs = strikeHalf && l.p.movement > 0.66 ? [c.chord.pcs[2]] : [pc];
      const options = Harmony.midisIn(pcs, l.lo, l.hi);
      if (!options.length) return;
      const note = Harmony.nearest(options, l.s.last ?? l.center());
      l.s.last = note;
      l.setAttack(0.05 + l.p.swell * 1.5);
      const dur = pluck ? 2.5 : (c.stepInChord === 0 && !strikeHalf ? (chordDur > 9 ? chordDur / 2 : chordDur) : chordDur / 2) + 0.3;
      l.play([note], dur, c.time, 0.5 + rand(0, 0.1));
    },
  },

  sparkle: {
    label: 'Sparkle', blurb: 'Eno-like scattered bells',
    instrument: 'glock', registerBias: [0.4, 1],
    controls: [['rarity', 'Rarity'], ['register', 'Register'], ['echo', 'Echo']],
    defaults: { rarity: 0.6, register: 0.6, echo: 0.4 },
    tick(l, c) {
      l.s.echoes = l.s.echoes || [];
      while (l.s.echoes.length && l.s.echoes[0].step <= c.step) {
        const e = l.s.echoes.shift();
        l.play([e.midi], 2, c.time, e.vel);
      }
      if (c.step % 2 !== 0 || !chance((1 - l.p.rarity) * 0.14)) return;
      const center = l.center();
      const pcs = chance(0.7) ? c.chord.pcs : Harmony.scalePcs();
      const options = Harmony.midisIn(pcs, center - 6, center + 6);
      if (!options.length) return;
      const midi = choose(options), vel = rand(0.25, 0.5);
      l.play([midi], 2.5, c.time, vel);
      if (chance(l.p.echo)) l.s.echoes.push({ step: c.step + choose([3, 6]), midi, vel: vel * 0.55 });
    },
  },

  drift: {
    label: 'Drift', blurb: 'Eno-style loop on its own clock',
    instrument: 'piano', registerBias: [0.35, 0.85],
    controls: [['length', 'Loop'], ['notes', 'Notes'], ['register', 'Register']],
    defaults: { length: 0.5, notes: 0.4, register: 0.5 },
    // Like the tape loops of Music for Airports: a short phrase repeats every N seconds,
    // ignoring bars, so layers with different lengths drift in and out of alignment.
    tick(l, c) {
      const loopSec = 9 + l.p.length * 28;
      l.s.queue = l.s.queue || [];
      if (l.s.next === undefined) l.s.next = c.time + rand(0.5, 4);
      if (c.time >= l.s.next) {
        if (!l.s.phrase || l.s.loopSec !== loopSec || l.s.notes !== l.p.notes || l.s.register !== l.p.register) {
          l.s.phrase = driftPhrase(l, loopSec);
          Object.assign(l.s, { loopSec, notes: l.p.notes, register: l.p.register });
        }
        l.s.queue.push(...l.s.phrase.map(n => ({ ...n, time: l.s.next + n.at })));
        l.s.queue.sort((a, b) => a.time - b.time);
        l.s.next += loopSec;
      }
      // Notes wait in a queue until their moment, so Stop silences them cleanly.
      while (l.s.queue.length && l.s.queue[0].time < c.time + c.stepDur) {
        const n = l.s.queue.shift();
        l.play([n.midi], n.dur, Math.max(c.time, n.time), n.vel);
      }
    },
  },
};

function driftPhrase(l, loopSec) {
  const center = l.center();
  const options = Harmony.midisIn(Harmony.pentatonicPcs(), center - 7, center + 7);
  const count = 1 + Math.round(l.p.notes * 4);
  return [...Array(count)].map(() => ({
    at: rand(0, loopSec * 0.6), midi: choose(options),
    dur: rand(2.5, 5), vel: rand(0.3, 0.5),
  })).sort((a, b) => a.at - b.at);
}

// Glass-style bass: the chord root repeated on every beat, accented on the downbeat.
function pulseBass(l, c) {
  if (c.step % 4 !== 0) return;
  const options = Harmony.midisIn([c.chord.root], l.lo, l.hi);
  if (!options.length) return;
  const note = Harmony.nearest(options, l.s.last ?? l.center());
  l.s.last = note;
  l.setAttack(0.02);
  l.play([note], 4 * c.stepDur * (l.isPluck() ? 2 : 0.85), c.time, c.step % c.stepsPerBar === 0 ? 0.62 : 0.48);
}

// Richter-style bass: each root is taken at or below the last note, and a passing note
// leads down into the next chord, so the line keeps sinking like a lament.
function walkingBass(l, c) {
  const chordDur = c.chordSteps * c.stepDur;
  const passAt = Math.round(c.chordSteps * 0.75);
  l.setAttack(0.05 + l.p.swell * 1.5);
  if (c.stepInChord === 0) {
    const options = Harmony.midisIn([c.chord.root], l.lo, l.hi);
    if (!options.length) return;
    const last = l.s.last ?? l.center() + 7;
    const below = options.filter(m => m <= last + 1);
    // When the line reaches the bottom, it starts again higher up.
    const note = below.length && Math.max(...below) >= l.lo + 3 ? Math.max(...below) : Harmony.nearest(options, l.center() + 5);
    l.s.last = note;
    l.play([note], c.chordSteps * 0.75 * c.stepDur + 0.2, c.time, 0.55);
  } else if (c.stepInChord === passAt && chordDur > 3) {
    const target = Harmony.midisIn([Harmony.peek().root], l.lo, l.hi).filter(m => m < l.s.last);
    if (!target.length) return;
    const t = Math.max(...target);
    const between = Harmony.midisIn(Harmony.scalePcs(), t + 1, l.s.last - 1);
    if (!between.length) return;
    const pass = Harmony.nearest(between, (t + l.s.last) / 2);
    l.s.last = pass + 1;   // lets the next root land just below the passing note
    l.play([pass], (c.chordSteps - passAt) * c.stepDur + 0.2, c.time, 0.45);
  }
}

// A motif is a rhythm plus a contour (scale steps between notes), so it can be replayed
// over a different chord and still fit.
function newMotif() {
  const bars = chance(0.4) ? 2 : 1;
  const rhythm = [];
  for (let b = 0; b < bars; b++) rhythm.push(...choose(MELODY_RHYTHMS));
  const contour = rhythm.map((_, i) => (i === 0 ? 0 : choose([-2, -1, -1, 1, 1, 2, -3, 3])));
  return { rhythm, contour };
}

function realise(l, c, motif) {
  const width = 5 + l.p.range * 14;
  const center = l.center();
  const lo = Math.max(l.lo, Math.round(center - width / 2)), hi = Math.min(l.hi, Math.round(center + width / 2));
  const scaleNotes = Harmony.midisIn(Harmony.scalePcs(), lo, hi);
  const chordNotes = Harmony.midisIn(c.chord.pcs, lo, hi);
  if (!scaleNotes.length || !chordNotes.length) return [];
  let idx = scaleNotes.indexOf(Harmony.nearest(chordNotes, l.s.lastNote ?? center));
  let at = c.step;
  const out = motif.rhythm.map((steps, i) => {
    idx = Math.max(0, Math.min(scaleNotes.length - 1, idx + motif.contour[i]));
    let midi = scaleNotes[idx];
    // Long notes and the last note land on chord tones so phrases resolve.
    if (steps >= 8 || i === motif.rhythm.length - 1) {
      // Snap to a chord tone, but in the direction the contour was heading so the line keeps moving.
      const dir = Math.sign(motif.contour[i]);
      const ahead = chordNotes.filter(m => (dir >= 0 ? m >= midi : m <= midi));
      midi = Harmony.nearest(ahead.length ? ahead : chordNotes, midi);
      idx = scaleNotes.indexOf(midi);
    }
    const n = { step: at, midi, steps, vel: (i === 0 ? 0.55 : 0.45) + rand(-0.05, 0.08) };
    at += steps;
    return n;
  });
  l.s.lastNote = out[out.length - 1].midi;
  return out;
}

let layerSeq = 0;
class Layer {
  constructor(cfg) {
    const type = LAYER_TYPES[cfg.type];
    // Saved ids are kept so Phase copies stay linked to their source across presets and Undo.
    this.id = cfg.id ?? ++layerSeq;
    layerSeq = Math.max(layerSeq, this.id);
    this.type = cfg.type;
    this.p = { ...type.defaults, ...(cfg.params || {}) };
    this.s = {};
    this.volume = cfg.volume ?? 0.7;
    this.pan = cfg.pan ?? 0;
    this.reverb = cfg.reverb ?? 0.5;
    this.muted = !!cfg.muted;
    this.solo = false;
    this.midiCh = cfg.midiCh ?? 1;
    this.voice = null;
    this.ready = false;
    this.listeners = { flash: () => {}, ready: () => {} };
    this.channel = new Tone.Channel({ volume: this.dbFor(this.volume), pan: this.pan });
    this.channel.connect(Engine.init().master);
    this.send = this.channel.send('reverb', this.sendDb());
    this.setInstrument(cfg.instrument || type.instrument);
  }

  get def() { return LAYER_TYPES[this.type]; }
  dbFor(v) { return v <= 0.001 ? -Infinity : 30 * Math.log10(v); }
  sendDb() { return this.reverb <= 0.001 ? -60 : -24 + this.reverb * 24; }
  isPluck() { return this.voice?.inst.kind === 'pluck'; }

  setInstrument(id) {
    this.instrument = id;
    [this.lo, this.hi] = InstrumentBank.range(id);
    this.ready = false;
    this.listeners.ready(false);
    const old = this.voice;
    InstrumentBank.createVoice(id).then(v => {
      if (this.instrument !== id || this.disposed) { v.node.dispose(); return; }
      v.node.connect(this.channel);
      this.voice = v;
      this.ready = true;
      this.listeners.ready(true, v.sampled);
      if (old) { old.node.releaseAll(); setTimeout(() => old.node.dispose(), 4000); }
    });
  }

  // Register maps the 0..1 control into the part of the instrument's range that suits this layer.
  center() {
    const [a, b] = this.def.registerBias;
    const r = this.p.register ?? 0.5;
    return Math.round(this.lo + (this.hi - this.lo) * (a + (b - a) * r));
  }

  setAttack(sec) {
    const n = this.voice?.node;
    if (!n) return;
    if (n instanceof Tone.Sampler) n.attack = sec;
    else n.set({ envelope: { attack: Math.max(0.005, sec) } });
  }

  play(midis, dur, time, vel) {
    const notes = midis.filter(m => m >= this.lo - 2 && m <= this.hi + 2);
    if (notes.length && this.audible) Engine.sound(this, notes, dur, time, Math.min(1, vel));
  }

  tick(ctx, audible) {
    if (!this.ready && Engine.settings.output !== 'midi') return;
    this.audible = audible;
    if (this.isPhase()) {
      if (Engine.layers.some(l => l.id === this.p.follow)) { this.beat = 4 * ctx.stepDur; return; }
      delete this.p.follow;   // its source was removed, so it carries on as an ordinary layer
    }
    this.def.tick(this, ctx);
  }

  /* ---------- Phase (Steve Reich): a copy that plays exactly what its source plays, but
     runs slightly slow, so it slides out of step a fraction at a time. Once it has slipped a
     whole beat it is back in unison, and the cycle starts again. ---------- */
  isPhase() { return this.p.follow !== undefined; }

  // Seconds this copy currently lags behind its source.
  phaseLag(time) {
    if (this.s.phaseStart === undefined) this.s.phaseStart = time;
    const beat = this.beat || 0.5;
    const cycleSec = 15 + (1 - (this.p.rate ?? 0.5)) * 105;   // time to slip a whole beat: 15 s to 2 min
    return ((Math.max(0, time - this.s.phaseStart) / cycleSec) * beat) % beat;
  }

  // Called by the engine whenever the source sounds a note.
  echo(midis, dur, time, vel) {
    if (!this.audible || (!this.ready && Engine.settings.output !== 'midi')) return;
    // If this copy has a different instrument, move notes by octaves into its range.
    const fit = m => { while (m < this.lo) m += 12; while (m > this.hi) m -= 12; return m; };
    this.play(midis.map(fit), dur, time + this.phaseLag(time), vel);
  }

  controls() { return this.isPhase() ? [['rate', 'Phase speed']] : this.def.controls; }

  set(key, value) {
    if (key === 'volume') { this.volume = value; this.channel.volume.rampTo(this.dbFor(value), 0.1); }
    else if (key === 'pan') { this.pan = value; this.channel.pan.rampTo(value, 0.1); }
    else if (key === 'reverb') { this.reverb = value; this.send.gain.rampTo(this.sendDb(), 0.1); }
    else this.p[key] = value;
  }

  // Changes what kind of player this is without touching its sound, so it carries on
  // seamlessly and picks up its new role at its next musical moment.
  setType(type, params = {}) {
    if (type !== this.type) {
      const register = this.p.register;
      this.type = type;
      this.p = { ...LAYER_TYPES[type].defaults, ...(register !== undefined ? { register } : {}) };
      this.s = {};
    }
    Object.assign(this.p, params);
  }

  // Puts the layer back to a saved state (used by Undo), only reloading samples if needed.
  restore(cfg) {
    this.type = cfg.type;
    this.p = { ...cfg.params };
    this.s = {};
    for (const k of ['volume', 'pan', 'reverb']) this.set(k, cfg[k]);
    this.muted = !!cfg.muted;
    this.midiCh = cfg.midiCh;
    if (cfg.instrument !== this.instrument) this.setInstrument(cfg.instrument);
  }

  dice() {
    for (const [key] of this.controls()) this.p[key] = Math.round(rand(0.15, 0.85) * 100) / 100;
    this.s = {};
  }

  flash(midis) { this.listeners.flash(midis); }
  releaseAll() { this.voice?.node.releaseAll(); this.s = {}; }

  dispose() {
    this.disposed = true;
    this.releaseAll();
    setTimeout(() => { this.voice?.node.dispose(); this.channel.dispose(); }, 3000);
  }

  toJSON() {
    return { id: this.id, type: this.type, instrument: this.instrument, params: { ...this.p }, volume: this.volume,
             pan: this.pan, reverb: this.reverb, muted: this.muted, midiCh: this.midiCh };
  }
}
