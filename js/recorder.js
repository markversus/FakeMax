/* Recorder: taps the master output sample-by-sample and saves a 16-bit stereo WAV file.
   Capturing raw PCM avoids lossy codecs and browser differences in MediaRecorder. */
const Recorder = (() => {
  // Runs on the audio thread and posts blocks of 4096 stereo frames back to the page.
  const WORKLET = `
    class Tap extends AudioWorkletProcessor {
      constructor() { super(); this.l = new Float32Array(4096); this.r = new Float32Array(4096); this.n = 0; }
      process([input]) {
        if (!input || !input.length) return true;
        const l = input[0], r = input[1] || input[0];
        for (let i = 0; i < l.length; i++) {
          this.l[this.n] = l[i]; this.r[this.n] = r[i];
          if (++this.n === 4096) { this.port.postMessage([this.l, this.r]); this.l = new Float32Array(4096); this.r = new Float32Array(4096); this.n = 0; }
        }
        return true;
      }
    }
    registerProcessor('fakemax-tap', Tap);`;
  let moduleReady = null, tap = null, sink = null, chunks = [], startedAt = 0;

  async function start() {
    moduleReady = moduleReady || Tone.context.addAudioWorkletModule(
      URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' })), 'fakemax-tap');
    await moduleReady;
    chunks = [];
    tap = Tone.context.createAudioWorkletNode('fakemax-tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
    tap.port.onmessage = e => chunks.push(e.data);
    sink = new Tone.Gain(0).toDestination();   // keeps the tap running without being heard twice
    Tone.connect(Engine.init().limiter, tap);
    Tone.connect(tap, sink);
    startedAt = Date.now();
  }

  async function stop() {
    Engine.init().limiter.disconnect(tap);
    tap.disconnect();
    sink.dispose();
    tap = null;
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    download(encodeWav(chunks, Tone.context.sampleRate), `fakemax-${stamp}.wav`);
    chunks = [];
  }

  function encodeWav(blocks, rate) {
    const len = blocks.reduce((n, b) => n + b[0].length, 0), chans = 2;
    const data = new DataView(new ArrayBuffer(44 + len * chans * 2));
    const str = (o, s) => [...s].forEach((ch, i) => data.setUint8(o + i, ch.charCodeAt(0)));
    str(0, 'RIFF'); data.setUint32(4, 36 + len * chans * 2, true); str(8, 'WAVE');
    str(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, chans, true);
    data.setUint32(24, rate, true); data.setUint32(28, rate * chans * 2, true); data.setUint16(32, chans * 2, true);
    data.setUint16(34, 16, true); str(36, 'data'); data.setUint32(40, len * chans * 2, true);
    let o = 44;
    for (const [left, right] of blocks) {
      for (let i = 0; i < left.length; i++) {
        for (const s of [left[i], right[i]]) {
          const v = Math.max(-1, Math.min(1, s));
          data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
          o += 2;
        }
      }
    }
    return new Blob([data], { type: 'audio/wav' });
  }

  return {
    start, stop,
    isRecording: () => !!tap,
    elapsed: () => (tap ? (Date.now() - startedAt) / 1000 : 0),
    supported: () => true,
  };
})();
