/* Moods (built-in starting points) and the user's own saved presets. */
const MOODS = [
  { name: 'Empty', blurb: 'Start from a blank page', empty: true,
    key: 9, mode: 'minor', bpm: 60, chordBars: 2, evolve: 0.3, layers: [] },
  { name: 'Daylight', blurb: 'Slow strings over a cello line',
    key: 2, mode: 'minor', bpm: 52, chordBars: 2, evolve: 0.3,
    layers: [
      { type: 'pad', instrument: 'violins', params: { swell: 0.8, register: 0.45, density: 0.6 }, volume: 0.62, reverb: 0.6, pan: 0.15 },
      { type: 'pad', instrument: 'violas', params: { swell: 0.85, register: 0.4, density: 0.3 }, volume: 0.5, reverb: 0.6, pan: -0.15 },
      { type: 'bass', instrument: 'cellos', params: { register: 0.55, movement: 0.5, swell: 0.6 }, volume: 0.62, reverb: 0.45, pan: -0.25 },
      { type: 'bass', instrument: 'bass', params: { register: 0.4, movement: 0.15, swell: 0.7 }, volume: 0.45, reverb: 0.4, pan: 0.1 },
      { type: 'melody', instrument: 'solo-violin', params: { rarity: 0.5, range: 0.45, repeat: 0.65 }, volume: 0.55, reverb: 0.65 },
    ] },
  { name: 'Metamorphosis', blurb: 'Rolling piano figures',
    key: 4, mode: 'minor', bpm: 62, chordBars: 2, evolve: 0.25,
    layers: [
      { type: 'ostinato', instrument: 'piano', params: { pattern: 0.55, speed: 0.5, evolve: 0.3, register: 0.45 }, volume: 0.65, reverb: 0.45 },
      { type: 'bass', instrument: 'piano', params: { register: 0.3, movement: 0.5, swell: 0 }, volume: 0.55, reverb: 0.45 },
      { type: 'melody', instrument: 'piano', params: { rarity: 0.55, range: 0.4, repeat: 0.8, register: 0.7 }, volume: 0.5, reverb: 0.5 },
      { type: 'pad', instrument: 'cellos', params: { swell: 0.9, register: 0.4, density: 0.15 }, volume: 0.35, reverb: 0.6 },
    ] },
  { name: 'Snowfall', blurb: 'Harp, bells and a distant flute',
    key: 2, mode: 'lydian', bpm: 70, chordBars: 2, evolve: 0.4,
    layers: [
      { type: 'ostinato', instrument: 'harp', params: { pattern: 0.4, speed: 0.5, evolve: 0.5, register: 0.45 }, volume: 0.6, reverb: 0.6, pan: -0.2 },
      { type: 'sparkle', instrument: 'glock', params: { rarity: 0.6, register: 0.5, echo: 0.5 }, volume: 0.45, reverb: 0.75, pan: 0.3 },
      { type: 'melody', instrument: 'flute', params: { rarity: 0.65, range: 0.5, repeat: 0.5 }, volume: 0.45, reverb: 0.7, pan: 0.15 },
      { type: 'pad', instrument: 'violas', params: { swell: 0.9, register: 0.5, density: 0.45 }, volume: 0.4, reverb: 0.7 },
      { type: 'bass', instrument: 'cellos', params: { register: 0.4, movement: 0.2, swell: 0.8 }, volume: 0.45, reverb: 0.5 },
    ] },
  { name: 'Hymn', blurb: 'Horn and strings, warm and broad',
    key: 5, mode: 'major', bpm: 54, chordBars: 2, evolve: 0.3,
    layers: [
      { type: 'pad', instrument: 'violins', params: { swell: 0.7, register: 0.4, density: 0.55 }, volume: 0.55, reverb: 0.6, pan: 0.2 },
      { type: 'pad', instrument: 'horn', params: { swell: 0.6, register: 0.45, density: 0.25 }, volume: 0.5, reverb: 0.65, pan: -0.2 },
      { type: 'bass', instrument: 'bass', params: { register: 0.45, movement: 0.5, swell: 0.6 }, volume: 0.5, reverb: 0.45 },
      { type: 'melody', instrument: 'oboe', params: { rarity: 0.55, range: 0.45, repeat: 0.6 }, volume: 0.45, reverb: 0.6, pan: 0.1 },
    ] },
  { name: 'Pulse', blurb: 'Interlocking minimalist motion',
    key: 0, mode: 'dorian', bpm: 76, chordBars: 2, evolve: 0.35,
    layers: [
      { type: 'ostinato', instrument: 'marimba', params: { pattern: 0.85, speed: 0.9, evolve: 0.5, register: 0.5 }, volume: 0.5, reverb: 0.4, pan: -0.3 },
      { type: 'ostinato', instrument: 'clarinet', params: { pattern: 0.2, speed: 0.5, evolve: 0.3, register: 0.35 }, volume: 0.45, reverb: 0.5, pan: 0.3 },
      { type: 'pad', instrument: 'cellos', params: { swell: 0.5, register: 0.5, density: 0.4 }, volume: 0.45, reverb: 0.5 },
      { type: 'bass', instrument: 'cellos-pizz', params: { register: 0.3, movement: 0.8, swell: 0 }, volume: 0.55, reverb: 0.35 },
      { type: 'sparkle', instrument: 'violins-pizz', params: { rarity: 0.65, register: 0.6, echo: 0.3 }, volume: 0.45, reverb: 0.5, pan: 0.2 },
    ] },
  { name: 'Elegy', blurb: 'Very slow, low and spacious',
    key: 7, mode: 'minor', bpm: 44, chordBars: 4, evolve: 0.2,
    layers: [
      { type: 'pad', instrument: 'cellos', params: { swell: 1, register: 0.55, density: 0.5 }, volume: 0.6, reverb: 0.65, pan: -0.15 },
      { type: 'pad', instrument: 'violas', params: { swell: 1, register: 0.55, density: 0.35 }, volume: 0.45, reverb: 0.65, pan: 0.15 },
      { type: 'bass', instrument: 'bass', params: { register: 0.3, movement: 0, swell: 0.9 }, volume: 0.5, reverb: 0.5 },
      { type: 'melody', instrument: 'solo-violin', params: { rarity: 0.6, range: 0.35, repeat: 0.75 }, volume: 0.5, reverb: 0.7 },
    ] },
];

const Presets = (() => {
  const KEY = 'fakemax.presets.v1';

  function all() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  function write(map) {
    try { localStorage.setItem(KEY, JSON.stringify(map)); return true; } catch { return false; }
  }
  function save(name, piece) { const m = all(); m[name] = piece; return write(m); }
  function remove(name) { const m = all(); delete m[name]; write(m); }

  function exportFile(name, piece) {
    const blob = new Blob([JSON.stringify({ fakemax: 1, name, piece }, null, 2)], { type: 'application/json' });
    download(blob, `${name.replace(/[^\w -]+/g, '') || 'preset'}.fakemax.json`);
  }

  async function importFile(file) {
    const data = JSON.parse(await file.text());
    if (!data.piece || !Array.isArray(data.piece.layers)) throw new Error('Not a FakeMax preset file');
    save(data.name || file.name, data.piece);
    return data;
  }

  return { all, save, remove, exportFile, importFile };
})();

function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
