/* App: wires the interface to the engine, layers, moods, presets and recorder. */
const $ = sel => document.querySelector(sel);
const MAX_LAYERS = 8;
let currentMood = null;

/* ---------- Knob ---------- */
function knob(label, value, onChange) {
  const el = document.createElement('div');
  el.className = 'knob';
  el.tabIndex = 0;
  el.setAttribute('role', 'slider');
  el.setAttribute('aria-label', label);
  el.innerHTML = `<svg viewBox="0 0 60 60">
      <path class="track" d="${arc(0, 1)}" fill="none" stroke-width="4" stroke-linecap="round"/>
      <path class="val" fill="none" stroke-width="4" stroke-linecap="round"/>
      <circle class="dot" r="3"/></svg><span>${label}</span>`;
  const valPath = el.querySelector('.val'), dot = el.querySelector('.dot');

  function draw(v) {
    valPath.setAttribute('d', arc(0, Math.max(0.001, v)));
    const [x, y] = point(v, 18);
    dot.setAttribute('cx', x); dot.setAttribute('cy', y);
    el.setAttribute('aria-valuenow', Math.round(v * 100));
  }
  function set(v) { value = Math.max(0, Math.min(1, v)); draw(value); onChange(value); }

  let startY = 0, startV = 0;
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); startY = e.clientY; startV = value; el.focus(); });
  el.addEventListener('pointermove', e => { if (el.hasPointerCapture(e.pointerId)) set(startV + (startY - e.clientY) / 150); });
  el.addEventListener('wheel', e => { e.preventDefault(); set(value - Math.sign(e.deltaY) * 0.03); }, { passive: false });
  el.addEventListener('keydown', e => {
    const d = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05 }[e.key];
    if (d) { e.preventDefault(); set(value + d); }
  });
  el.setAttribute('aria-valuemin', 0); el.setAttribute('aria-valuemax', 100);
  draw(value);
  return el;
}
function point(v, r) {
  const a = (-225 + v * 270) * Math.PI / 180;
  return [30 + r * Math.cos(a), 30 + r * Math.sin(a)];
}
function arc(a, b) {
  const [x1, y1] = point(a, 24), [x2, y2] = point(b, 24);
  return `M${x1} ${y1} A24 24 0 ${(b - a) * 270 > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

/* ---------- Bloom stage: soft circles for every note, like Eno's Bloom ---------- */
const Stage = (() => {
  const cv = $('#stage'), cx = cv.getContext('2d');
  const blooms = [];
  function size() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
  addEventListener('resize', size); size();
  function add(color, midi, count) {
    const x = ((midi - 24) / 84) * cv.width * 0.9 + cv.width * 0.05 + (Math.random() - 0.5) * 60;
    const y = cv.height * (0.15 + Math.random() * 0.75);
    blooms.push({ x, y, r: 4, max: (30 + Math.random() * 70) * devicePixelRatio * (count > 1 ? 1.4 : 1), color, a: 0.35 });
    if (blooms.length > 140) blooms.shift();
  }
  function frame() {
    cx.clearRect(0, 0, cv.width, cv.height);
    for (let i = blooms.length - 1; i >= 0; i--) {
      const b = blooms[i];
      b.r += (b.max - b.r) * 0.02; b.a *= 0.985;
      if (b.a < 0.01) { blooms.splice(i, 1); continue; }
      cx.beginPath(); cx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      cx.strokeStyle = b.color; cx.globalAlpha = b.a; cx.lineWidth = 1.5 * devicePixelRatio; cx.stroke();
      cx.globalAlpha = b.a * 0.18; cx.fillStyle = b.color; cx.fill();
    }
    cx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  frame();
  return { add };
})();

/* ---------- Layer cards ---------- */
const typeColor = type => getComputedStyle(document.documentElement).getPropertyValue('--' + type).trim();

function buildCard(layer) {
  const el = $('#cardTpl').content.firstElementChild.cloneNode(true);
  const def = layer.def;
  el.dataset.type = layer.type;
  const source = layer.isPhase() && Engine.layers.find(l => l.id === layer.p.follow);
  el.classList.toggle('phasing', !!source);
  el.querySelector('.type').textContent = source ? `${def.label} · Phase` : def.label;
  el.querySelector('.blurb').textContent = source
    ? `Follows the ${def.label.toLowerCase()} on ${InstrumentBank.get(source.instrument).name}, drifting out of step`
    : def.blurb;

  const inst = el.querySelector('.instrument');
  for (const fam of ['strings', 'keys', 'woodwinds', 'brass', 'percussion']) {
    const og = document.createElement('optgroup');
    og.label = fam[0].toUpperCase() + fam.slice(1);
    InstrumentBank.list.filter(i => i.family === fam).forEach(i => og.append(new Option(i.name, i.id)));
    inst.append(og);
  }
  inst.value = layer.instrument;
  inst.onchange = () => { layer.setInstrument(inst.value); markCustom(); };

  const knobs = el.querySelector('.knobs');
  const drawKnobs = () => {
    knobs.replaceChildren(...layer.controls().map(([k, label]) => knob(label, layer.p[k], v => { layer.set(k, v); markCustom(); })));
  };
  drawKnobs();

  const mute = el.querySelector('.mute'), solo = el.querySelector('.solo');
  // The mixer channel for this layer (linked below, once it's built) mirrors mute/solo state.
  const syncToggles = () => {
    mute.classList.toggle('on', layer.muted); solo.classList.toggle('on', layer.solo);
    el.classList.toggle('muted', layer.muted); el.classList.toggle('soloed', layer.solo);
    el.channel?.sync();
  };
  mute.onclick = () => { layer.muted = !layer.muted; syncToggles(); };
  solo.onclick = () => { layer.solo = !layer.solo; syncToggles(); };
  el.sync = syncToggles;
  syncToggles();
  el.querySelector('.dice').onclick = () => { layer.dice(); drawKnobs(); markCustom(); };
  el.querySelector('.remove').onclick = () => removeLayer(layer);
  const dup = el.querySelector('.dup');
  dup.hidden = Engine.layers.length >= MAX_LAYERS;
  dup.onclick = () => { duplicateLayer(layer); markCustom(); };
  const phase = el.querySelector('.phase');
  phase.hidden = dup.hidden;
  phase.onclick = () => { phaseLayer(layer); markCustom(); };

  const ch = el.querySelector('.midich select');
  for (let i = 1; i <= 16; i++) ch.append(new Option(i, i));
  ch.value = layer.midiCh;
  ch.onchange = () => { layer.midiCh = +ch.value; };

  const badge = el.querySelector('.badge'), pulse = el.querySelector('.pulse');
  layer.listeners.ready = (ready, sampled) => {
    badge.hidden = ready && sampled !== false;
    badge.textContent = ready ? 'synth' : 'loading';
  };
  layer.listeners.ready(layer.ready, layer.voice?.sampled);
  const color = typeColor(layer.type);
  layer.listeners.flash = midis => {
    pulse.classList.add('hit');
    requestAnimationFrame(() => requestAnimationFrame(() => pulse.classList.remove('hit')));
    if (!layer.muted) midis.forEach(m => Stage.add(color, m, midis.length));
  };
  return el;
}

// Mixer: a channel strip per layer, like a real desk — pan and reverb send as knobs,
// volume as a vertical fader, with the same mute/solo as the layer's card (and in sync with it).
function buildChannel(layer, card) {
  const el = $('#channelTpl').content.firstElementChild.cloneNode(true);
  const def = layer.def;
  el.dataset.type = layer.type;
  const source = layer.isPhase() && Engine.layers.find(l => l.id === layer.p.follow);
  el.querySelector('.chtype').textContent = source ? `${def.label} · Phase` : def.label;
  el.querySelector('.chinst').textContent = InstrumentBank.get(layer.instrument).name;

  el.querySelector('.chknobs').append(
    knob('Pan', (layer.pan + 1) / 2, v => { layer.set('pan', v * 2 - 1); markCustom(); }),
    knob('Space', layer.reverb, v => { layer.set('reverb', v); markCustom(); }),
  );

  const vol = el.querySelector('.vol');
  vol.value = layer.volume;
  vol.oninput = () => { layer.set('volume', +vol.value); markCustom(); };

  const mute = el.querySelector('.mute'), solo = el.querySelector('.solo');
  const syncToggles = () => {
    mute.classList.toggle('on', layer.muted); solo.classList.toggle('on', layer.solo);
    el.classList.toggle('muted', layer.muted); el.classList.toggle('soloed', layer.solo);
  };
  mute.onclick = () => { layer.muted = !layer.muted; card.sync(); };
  solo.onclick = () => { layer.solo = !layer.solo; card.sync(); };
  el.sync = syncToggles;
  card.channel = el;
  syncToggles();
  return el;
}

function addCard() {
  const el = document.createElement('div');
  el.className = 'addcard';
  el.innerHTML = '<h3>Add a layer</h3>';
  for (const [type, def] of Object.entries(LAYER_TYPES)) {
    const b = document.createElement('button');
    b.className = 'btn ghost';
    b.innerHTML = `<i style="background:${typeColor(type)}"></i>${def.label} <small style="color:var(--faint)">· ${def.blurb}</small>`;
    b.onclick = () => { addLayer({ type }); markCustom(); };
    el.append(b);
  }
  return el;
}

function renderLayers() {
  const cards = [], channels = [];
  for (const layer of Engine.layers) {
    const card = buildCard(layer);
    cards.push(card);
    channels.push(buildChannel(layer, card));
  }
  const host = $('#layers');
  host.replaceChildren(...cards);
  if (Engine.layers.length < MAX_LAYERS) host.append(addCard());
  $('#mixerChannels').replaceChildren(...channels);
}

function freeMidiChannel() {
  const used = new Set(Engine.layers.map(l => l.midiCh));
  return [...Array(16)].map((_, i) => i + 1).find(c => !used.has(c)) || 1;
}

function addLayer(cfg) {
  Engine.layers.push(new Layer({ midiCh: freeMidiChannel(), ...cfg }));
  renderLayers();
}

// The copy sits next to the original. Other layers keep playing untouched, and the copy
// reuses the already-loaded samples and joins in on its next beat.
function duplicateLayer(layer) {
  if (Engine.layers.length >= MAX_LAYERS) return;
  const copy = new Layer({ ...layer.toJSON(), id: undefined, midiCh: freeMidiChannel() });
  Engine.layers.splice(Engine.layers.indexOf(layer) + 1, 0, copy);
  renderLayers();
}

// A Reich-style copy: plays exactly what `layer` plays, slipping slowly out of step.
function phaseLayer(layer) {
  if (Engine.layers.length >= MAX_LAYERS) return;
  const source = layer.isPhase() ? Engine.layers.find(l => l.id === layer.p.follow) || layer : layer;
  const copy = new Layer({ ...layer.toJSON(), id: undefined, midiCh: freeMidiChannel(),
    params: { ...source.p, follow: source.id, rate: 0.5 }, pan: Math.max(-1, Math.min(1, -layer.pan || 0.3)) });
  Engine.layers.splice(Engine.layers.indexOf(layer) + 1, 0, copy);
  renderLayers();
  toast(`Phasing: the copy plays what ${source.def.label} plays, slipping a whole beat out of step about every minute.`);
}

function removeLayer(layer) {
  Engine.layers.splice(Engine.layers.indexOf(layer), 1);
  // Phase copies of a removed layer carry on as ordinary layers with the same settings.
  Engine.layers.forEach(l => { if (l.p.follow === layer.id) { delete l.p.follow; delete l.p.rate; } });
  layer.dispose();
  renderLayers();
}

/* ---------- Piece: load, save, surprise ---------- */
function currentPiece() {
  return {
    key: Harmony.state.key, mode: Harmony.state.mode, bpm: Engine.getBpm(),
    chordBars: Harmony.state.chordBars, evolve: Engine.settings.evolve,
    // What the Glass / Max / Eno buttons change beyond the visible controls.
    style: { prog: [...Harmony.state.prog], pool: Harmony.state.pool, arc: Engine.settings.arc, reverbDecay: Engine.settings.reverbDecay },
    layers: Engine.layers.map(l => l.toJSON()),
  };
}

function applyStyle(style) {
  Harmony.state.pool = style?.pool || null;
  Engine.settings.arc = style?.arc || 'none';
  Engine.setReverbDecay(style?.reverbDecay || 7);
}

function loadPiece(piece) {
  undoStack.length = 0;
  $('#undo').disabled = true;
  Engine.layers.splice(0).forEach(l => l.dispose());
  Harmony.state.chordBars = piece.chordBars || 2;
  Harmony.setKey(piece.key ?? 9, piece.mode || 'minor');
  Harmony.newProgression();
  applyStyle(piece.style);
  if (piece.style?.prog) { Harmony.state.prog = piece.style.prog; Harmony.reset(); }
  Engine.setBpm(piece.bpm || 60);
  Engine.settings.evolve = piece.evolve ?? 0.4;
  // Each layer gets its own MIDI channel unless the piece says otherwise.
  piece.layers.slice(0, MAX_LAYERS).forEach((cfg, i) => Engine.layers.push(new Layer({ midiCh: i + 1, ...cfg })));
  syncPieceControls();
  renderLayers();
}

function loadMood(mood) {
  currentMood = mood;
  loadPiece(mood);
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.name === mood.name));
}

function markCustom() {
  currentMood = null;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
}

function surprise() {
  const mode = choose(['minor', 'minor', 'dorian', 'major', 'lydian']);
  Harmony.setKey(Math.floor(Math.random() * 12), mode);
  Harmony.newProgression();
  Engine.setBpm(Math.round(rand(46, 80)));
  Harmony.state.chordBars = choose([1, 2, 2, 4]);
  Engine.layers.forEach(l => l.dice());
  syncPieceControls();
  renderLayers();
  markCustom();
}

/* ---------- Glass me / Max me / Eno me, with Undo ---------- */
const undoStack = [];

function transform(name) {
  undoStack.push({ ...currentPiece(), ids: Engine.layers.map(l => l.id) });
  if (undoStack.length > 20) undoStack.shift();
  const message = Composers.apply(name, $('#withStyle').checked);
  syncPieceControls(false);
  renderLayers();
  markCustom();
  toast(message);
  $('#undo').disabled = false;
}

// Puts the piece back in place, without stopping: surviving layers are restored, layers
// added since are removed, and removed ones come back.
function undo() {
  const s = undoStack.pop();
  if (!s) return;
  const byId = new Map(Engine.layers.map(l => [l.id, l]));
  for (const l of Engine.layers) if (!s.ids.includes(l.id)) l.dispose();
  const restored = s.layers.map((cfg, i) => {
    const l = byId.get(s.ids[i]);
    if (!l) return new Layer(cfg);
    l.restore(cfg);
    return l;
  });
  Engine.layers.splice(0, Engine.layers.length, ...restored);
  Harmony.setKey(s.key, s.mode);
  Harmony.state.chordBars = s.chordBars;
  applyStyle(s.style);
  Harmony.state.prog = s.style.prog;
  Harmony.state.index = s.style.prog.length - 1;   // the old progression resumes at the next chord
  Engine.settings.evolve = s.evolve;
  Engine.setBpm(s.bpm, 3);
  syncPieceControls(false);
  renderLayers();
  toast('Undone.');
  $('#undo').disabled = !undoStack.length;
}

let toastTimer = null;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 5000);
}

function syncPieceControls(updateChord = true) {
  $('#key').value = Harmony.state.key;
  $('#mode').value = Harmony.state.mode;
  $('#bpm').value = Engine.getBpm();
  $('#bpmOut').textContent = Engine.getBpm();
  $('#chordBars').value = Harmony.state.chordBars;
  $('#evolve').value = Engine.settings.evolve;
  $('#evolveOut').textContent = Math.round(Engine.settings.evolve * 100) + '%';
  if (updateChord || !Engine.isPlaying()) showChord(Harmony.current());
  else $('#keyline').textContent = `${Harmony.describe()} · ${Harmony.current().roman}`;
}

function showChord(chord) {
  const el = $('#chord');
  el.style.opacity = 0.2;
  setTimeout(() => { el.textContent = chord.name; el.style.opacity = 1; }, 150);
  $('#keyline').textContent = `${Harmony.describe()} · ${chord.roman}`;
}

/* ---------- Presets ---------- */
function refreshPresets(selected) {
  const list = $('#presetList'), names = Object.keys(Presets.all()).sort();
  list.replaceChildren(...(names.length ? names.map(n => new Option(n, n)) : [new Option('No saved presets yet', '')]));
  if (selected) list.value = selected;
}

/* ---------- Wiring ---------- */
function init() {
  Harmony.NOTE_NAMES.forEach((n, i) => $('#key').append(new Option(n, i)));
  MOODS.forEach(m => {
    const b = document.createElement('button');
    b.className = m.empty ? 'chip empty' : 'chip';
    b.dataset.name = m.name;
    b.innerHTML = `<b>${m.name}</b><small>${m.blurb}</small>`;
    b.onclick = () => loadMood(m);
    $('#moods').append(b);
  });

  $('#play').onclick = async () => {
    if (Engine.isPlaying()) Engine.stop(); else await Engine.play();
  };
  Engine.on('state', on => {
    document.body.classList.toggle('playing', on);
    $('#play').setAttribute('aria-label', on ? 'Stop' : 'Play');
  });
  Engine.on('chord', showChord);
  addEventListener('keydown', e => {
    if (e.code === 'Space' && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName) && !e.target.classList.contains('knob')) {
      e.preventDefault(); $('#play').click();
    }
  });

  $('#key').onchange = () => { Harmony.setKey(+$('#key').value); showChord(Harmony.current()); markCustom(); };
  $('#mode').onchange = () => { Harmony.setKey(Harmony.state.key, $('#mode').value); showChord(Harmony.current()); markCustom(); };
  $('#bpm').oninput = () => { Engine.setBpm(+$('#bpm').value); $('#bpmOut').textContent = $('#bpm').value; markCustom(); };
  $('#chordBars').onchange = () => { Harmony.state.chordBars = +$('#chordBars').value; markCustom(); };
  $('#evolve').oninput = () => {
    Engine.settings.evolve = +$('#evolve').value;
    $('#evolveOut').textContent = Math.round(Engine.settings.evolve * 100) + '%';
    markCustom();
  };
  $('#surprise').onclick = surprise;
  $('#glassMe').onclick = () => transform('glass');
  $('#maxMe').onclick = () => transform('max');
  $('#enoMe').onclick = () => transform('eno');
  $('#undo').onclick = undo;

  // While playing, a pending download means silent layers, so say so plainly.
  let load = { done: 0, total: 0 };
  const showLoading = () => {
    const busy = load.total > 0 && load.done < load.total;
    const waiting = busy && Engine.isPlaying();
    $('#loading').hidden = !busy;
    $('#loading').classList.toggle('waiting', waiting);
    $('#loadbar').style.width = load.total ? (load.done / load.total) * 100 + '%' : 0;
    $('#loadtext').textContent = waiting
      ? `Waiting for samples (${load.done} of ${load.total}). Each instrument joins in as soon as it arrives.`
      : `Loading orchestra samples… ${load.done} of ${load.total}`;
  };
  InstrumentBank.onProgress((done, total) => {
    load = { done, total }; showLoading();
    // Background preloading starts once what you asked for has arrived.
    if (total && done === total && $('#preload').checked) InstrumentBank.preloadAll();
  });

  // Preloading: on by default except on touch devices, where memory is tighter.
  const PRELOAD_KEY = 'fakemax.preload';
  let preloadPref = null;
  try { preloadPref = localStorage.getItem(PRELOAD_KEY); } catch {}
  $('#preload').checked = preloadPref === null ? !matchMedia('(pointer: coarse)').matches : preloadPref === '1';
  $('#preload').onchange = () => {
    const on = $('#preload').checked;
    try { localStorage.setItem(PRELOAD_KEY, on ? '1' : '0'); } catch {}
    if (on) InstrumentBank.preloadAll(); else InstrumentBank.stopPreload();
  };
  InstrumentBank.onPreload((ready, total, running) => {
    $('#preloadBar').style.width = (ready / total) * 100 + '%';
    $('#preloadText').textContent = ready === total ? `All ${total} instruments ready`
      : `${ready} of ${total} ready${running ? ' · loading…' : ''}`;
  });
  Engine.on('state', showLoading);

  // Presets
  refreshPresets();
  $('#presetSave').onclick = () => {
    const name = prompt('Name this preset', currentMood ? currentMood.name + ' variation' : 'My piece');
    if (!name) return;
    if (!Presets.save(name.trim(), currentPiece())) alert('Could not save: browser storage is unavailable.');
    refreshPresets(name.trim());
  };
  $('#presetLoad').onclick = () => {
    const p = Presets.all()[$('#presetList').value];
    if (p) { loadPiece(p); markCustom(); }
  };
  $('#presetDelete').onclick = () => {
    const name = $('#presetList').value;
    if (name && confirm(`Delete preset "${name}"?`)) { Presets.remove(name); refreshPresets(); }
  };
  $('#presetExport').onclick = () => {
    const name = $('#presetList').value || currentMood?.name || 'My piece';
    Presets.exportFile(name, Presets.all()[name] || currentPiece());
  };
  $('#presetImport').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try { const d = await Presets.importFile(file); refreshPresets(d.name); loadPiece(d.piece); markCustom(); }
    catch (err) { alert(err.message); }
    e.target.value = '';
  };

  // Recording
  if (!Recorder.supported()) $('#record').disabled = true;
  let recTimer = null;
  $('#record').onclick = async () => {
    const btn = $('#record');
    if (Recorder.isRecording()) {
      clearInterval(recTimer);
      $('#recLabel').textContent = 'Saving…';
      await Recorder.stop();
      btn.classList.remove('on');
      $('#recLabel').textContent = 'Record';
    } else {
      if (!Engine.isPlaying()) await Engine.play();
      await Recorder.start();
      btn.classList.add('on');
      $('#recLabel').textContent = 'Stop & save';
      recTimer = setInterval(() => {
        const s = Math.floor(Recorder.elapsed());
        $('#recTime').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      }, 250);
    }
  };

  // Output and MIDI
  $('#output').onchange = async () => {
    const mode = $('#output').value;
    Engine.settings.output = mode;
    document.body.classList.toggle('show-midi', mode !== 'audio');
    const port = $('#midiPort');
    port.hidden = mode === 'audio';
    if (mode === 'audio') { Midi.select(null); return; }
    try {
      const outs = await Midi.connect();
      port.replaceChildren(...(outs.length ? outs.map(o => new Option(o.name, o.id)) : [new Option('No MIDI outputs found', '')]));
      Midi.select(port.value);
      $('#midiHint').textContent = outs.length
        ? 'Each layer sends on its own channel (set “ch” on each card). Arm matching tracks in your DAW.'
        : 'No MIDI ports. On a Mac enable the IAC Driver in Audio MIDI Setup; on Windows install loopMIDI.';
    } catch (err) {
      $('#midiHint').textContent = err.message;
    }
  };
  $('#midiPort').onchange = () => Midi.select($('#midiPort').value);

  loadMood(MOODS.find(m => !m.empty));
}

init();
