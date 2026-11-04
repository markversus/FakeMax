/* Engine: the master bus (hall reverb, glue compressor, limiter), the 16th-note clock that
   drives every layer, and optional Web MIDI output to a DAW. */
const Engine = (() => {
  const STEPS_PER_BAR = 16;
  const layers = [];
  const listeners = { chord: new Set(), state: new Set() };
  // output: 'audio' | 'midi' | 'both'. arc: 'none' | 'build' (Glass crescendo over each
  // progression) | 'swell' (Richter-style rise and fall every 8 bars).
  const settings = { evolve: 0.4, output: 'audio', arc: 'none', bpm: 60, reverbDecay: 7 };
  let bus = null, step = 0, chordPos = 0, arcNow = 1, playing = false;

  function emit(kind, value) { listeners[kind].forEach(fn => fn(value)); }

  function arcGain(chordSteps) {
    if (settings.arc === 'build') {
      const cycle = Harmony.state.prog.length * chordSteps;
      return 0.72 + 0.4 * ((Harmony.state.index * chordSteps + chordPos) / cycle);
    }
    if (settings.arc === 'swell') return 0.68 + 0.42 * (0.5 - 0.5 * Math.cos((2 * Math.PI * step) / (8 * STEPS_PER_BAR)));
    return 1;
  }

  function init() {
    if (bus) return bus;
    const limiter = new Tone.Limiter(-1).toDestination();
    const comp = new Tone.Compressor({ threshold: -20, ratio: 2.5, attack: 0.08, release: 0.5 }).connect(limiter);
    const master = new Tone.Volume(10).connect(comp);
    const reverb = new Tone.Reverb({ decay: settings.reverbDecay, preDelay: 0.04, wet: 1 }).connect(master);
    const reverbIn = new Tone.Channel().connect(reverb);
    reverbIn.receive('reverb');
    bus = { master, reverb, limiter };
    new Tone.Loop(tick, '16n').start(0);
    return bus;
  }

  function tick(time) {
    const chordSteps = Harmony.state.chordBars * STEPS_PER_BAR;
    // A running counter (not step % chordSteps) so changing "chords every" mid-piece
    // simply lengthens or shortens the current chord instead of jumping.
    if (chordPos >= chordSteps) chordPos = 0;
    if (chordPos === 0) {
      if (step > 0) Harmony.advance(settings.evolve);
      const chord = Harmony.current();
      Tone.Draw.schedule(() => emit('chord', chord), time);
    }
    arcNow = arcGain(chordSteps);
    const ctx = {
      step, time, stepInChord: chordPos, chordSteps, chord: Harmony.current(),
      stepDur: Tone.Time('16n').toSeconds(), stepsPerBar: STEPS_PER_BAR,
    };
    const anySolo = layers.some(l => l.solo);
    for (const l of layers) l.tick(ctx, !l.muted && (!anySolo || l.solo));
    step++;
    chordPos++;
  }

  async function play() {
    await Tone.start();
    init();
    if (playing) return;
    step = 0;
    chordPos = 0;
    Harmony.reset();
    Tone.Transport.start('+0.1');
    playing = true;
    emit('state', true);
  }

  function stop() {
    Tone.Transport.stop();
    Tone.Draw.cancel(0);   // drop chord and flash updates already queued for the screen
    layers.forEach(l => l.releaseAll());
    Midi.allOff();
    playing = false;
    emit('state', false);
  }

  // One place where every layer's notes are sounded, so output routing stays in one spot.
  function sound(layer, midis, dur, time, vel) {
    for (const f of layers) if (f.p.follow === layer.id) f.echo(midis, dur, time, vel);   // Phase copies
    vel = Math.min(1, vel * arcNow);
    if (settings.output !== 'midi' && layer.voice) {
      layer.voice.node.triggerAttackRelease(midis.map(m => Tone.Frequency(m, 'midi').toFrequency()), dur, time, vel);
    }
    if (settings.output !== 'audio') midis.forEach(m => Midi.note(layer.midiCh, m, vel, time, dur));
    Tone.Draw.schedule(() => layer.flash(midis), time);
  }

  return {
    layers, settings, init, play, stop, sound,
    isPlaying: () => playing,
    // `glide` seconds eases the tempo over a few beats instead of jumping.
    setBpm: (bpm, glide = 0) => {
      settings.bpm = bpm;
      if (glide && playing) Tone.Transport.bpm.rampTo(bpm, glide); else Tone.Transport.bpm.value = bpm;
    },
    getBpm: () => Math.round(settings.bpm),
    setReverbDecay: sec => { settings.reverbDecay = sec; if (bus) bus.reverb.decay = sec; },
    on: (kind, fn) => listeners[kind].add(fn),
  };
})();

const Midi = (() => {
  let access = null, out = null;
  const held = new Set();

  async function connect() {
    if (!navigator.requestMIDIAccess) throw new Error('This browser has no Web MIDI (use Chrome or Edge).');
    access = access || await navigator.requestMIDIAccess();
    return [...access.outputs.values()].map(o => ({ id: o.id, name: o.name }));
  }

  function select(id) { out = access && id ? access.outputs.get(id) : null; }

  // Converts a Tone audio-clock time to a performance.now() timestamp for the MIDI port.
  function stamp(time) { return performance.now() + Math.max(0, time - Tone.immediate()) * 1000; }

  function note(ch, midi, vel, time, dur) {
    if (!out || midi < 0 || midi > 127) return;
    const c = (ch - 1) & 15, t = stamp(time);
    out.send([0x90 | c, midi, Math.max(1, Math.round(vel * 127))], t);
    out.send([0x80 | c, midi, 0], t + dur * 1000);
    held.add(c);
  }

  function allOff() {
    if (!out) return;
    held.forEach(c => out.send([0xb0 | c, 123, 0]));
    held.clear();
  }

  return { connect, select, note, allOff, available: () => !!navigator.requestMIDIAccess };
})();
