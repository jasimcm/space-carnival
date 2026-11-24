/* Space Carnival sound effects, synthesized with the Web Audio API (no audio files).
   Every sound starts from a click or tap, so browsers allow it. A speaker button mutes them. */
(() => {
  let ac = null, master = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('sc-muted') === '1'; } catch (_) {}

  const audio = () => {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };
  const ready = () => !muted && audio();

  // building blocks
  const gain = (t, peak, attack, decay, dest = master) => {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(dest); return g;
  };
  const tone = (t, type, f0, f1, dur, peak, attack = .004) => {
    const o = ac.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    o.connect(gain(t, peak, attack, dur)); o.start(t); o.stop(t + attack + dur + .05);
  };
  const noise = (t, dur, peak, type, freq, q = 1, attack = .002) => {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    s.connect(f); f.connect(gain(t, peak, attack, dur));
    s.start(t, Math.random() * .5); s.stop(t + attack + dur + .05);
  };
  const at = (delay = 0) => ac.currentTime + delay;

  const sfx = {
    // short mechanical tick
    click(delay = 0, loud = 1) {
      if (!ready()) return; const t = at(delay);
      noise(t, .03, .35 * loud, 'bandpass', 2600, 2);
      tone(t, 'sine', 190, 70, .05, .25 * loud);
    },
    // wire pushed into a terminal
    snap() {
      if (!ready()) return; const t = at();
      noise(t, .02, .5, 'highpass', 3000);
      tone(t, 'triangle', 900, 300, .06, .18);
      noise(t + .03, .05, .12, 'bandpass', 1200, 3);
    },
    // chunky toggle switch
    clack() { this.click(0, 1.4); this.click(.045, .9); },
    // circuit not closed
    nope() {
      if (!ready()) return; const t = at(.06);
      tone(t, 'square', 110, 90, .16, .07); tone(t + .19, 'square', 95, 80, .2, .07);
    },
    // power coming on: hum swells, a little crackle
    powerUp() {
      if (!ready()) return; const t = at(.05);
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(120, t + .5);
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.09, t + .25); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 1.2);
      for (let i = 0; i < 7; i++) noise(t + .05 + Math.random() * .5, .015, .12, 'highpass', 4000);
    },
    powerDown() {
      if (!ready()) return; const t = at(.05);
      tone(t, 'sawtooth', 220, 45, .45, .06); tone(t, 'sine', 600, 90, .35, .05);
    },
    // fairy lights coming on in a wave: a rising run of tinks
    sparkle(start = .3, span = 1.2) {
      if (!ready()) return;
      const notes = [784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637];
      const n = 16;
      for (let i = 0; i < n; i++) {
        const t = at(start + span * i / n + Math.random() * .03);
        const f = notes[Math.min(notes.length - 1, Math.floor(i / n * notes.length + Math.random() * 2))];
        tone(t, 'sine', f, f, .28, .06); tone(t, 'triangle', f * 2, f * 2, .12, .015);
      }
    },
    // a character springing onto the roof
    boing(delay = 0) {
      if (!ready()) return; const t = at(delay);
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(520, t + .09); o.frequency.exponentialRampToValueAtTime(300, t + .28);
      const lfo = ac.createOscillator(); lfo.frequency.value = 28; const lg = ac.createGain(); lg.gain.value = 35; lfo.connect(lg); lg.connect(o.frequency);
      o.connect(gain(t, .16, .01, .3)); o.start(t); lfo.start(t); o.stop(t + .4); lfo.stop(t + .4);
    },
    // party popper: a round 'thup', a soft whoosh, a little chime and confetti pattering down
    pop() {
      if (!ready()) return; const t = at();
      tone(t, 'sine', 320, 70, .14, .42, .002);                 // body of the pop
      noise(t, .05, .22, 'lowpass', 1800, .7, .001);             // short, soft crack
      noise(t + .015, .32, .07, 'bandpass', 2600, .6, .03);      // whoosh of paper
      [1568, 2093, 2637].forEach((f, i) => {                     // sparkle chime
        const s = t + .06 + i * .045; tone(s, 'sine', f, f, .35, .045, .003); tone(s, 'sine', f * 2.01, f * 2.01, .18, .012, .003);
      });
      for (let i = 0; i < 12; i++) noise(t + .18 + Math.random() * .8, .025, .018, 'bandpass', 4500 + Math.random() * 3500, 5);
    },
    // ticket machine: button, motor whirr with a ratchet tick per step, then a bell
    press() { this.click(0, 1.2); },
    print(dur = 2.2, steps = 11) {
      if (!ready()) return; const t = at(.05);
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 58;
      const trem = ac.createOscillator(); trem.frequency.value = steps / dur; const tg = ac.createGain(); tg.gain.value = .025;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.06, t + .08);
      g.gain.setValueAtTime(.06, t + dur - .1); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + .05);
      trem.connect(tg); tg.connect(g.gain); o.connect(f); f.connect(g); g.connect(master);
      o.start(t); trem.start(t); o.stop(t + dur + .1); trem.stop(t + dur + .1);
      for (let i = 0; i < steps; i++) {
        const s = t + i * dur / steps;
        noise(s, .025, .28, 'bandpass', 3400, 3);
        tone(s, 'square', 140, 90, .035, .05);
      }
      noise(t, dur, .02, 'bandpass', 1800, .6, .1); // paper sliding
    },
    ding(delay = 0) {
      if (!ready()) return; const t = at(delay);
      noise(t, .07, .18, 'bandpass', 6000, 2);                       // ka-
      [[1568, .22, 1.3], [2352, .09, .9], [3136, .05, .6], [4186, .03, .4]]
        .forEach(([f, p, d]) => tone(t + .05, 'sine', f, f, d, p, .002)); // -ching
    },
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      try { localStorage.setItem('sc-muted', m ? '1' : '0'); } catch (_) {}
      if (!m) { audio(); this.click(); }
    }
  };
  window.sfx = sfx;

  // speaker toggle
  const btn = document.querySelector('.snd');
  if (btn) {
    const paint = () => { btn.setAttribute('aria-pressed', String(!muted)); btn.title = muted ? 'Sound off' : 'Sound on'; btn.classList.toggle('off', muted); };
    btn.addEventListener('click', () => { sfx.setMuted(!muted); paint(); });
    paint();
  }
})();
