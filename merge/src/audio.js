// Web Audio로 효과음과 배경음을 합성한다 (음원 파일 없음). 첫 사용자 입력 뒤에 시작된다.
const NOTE = (n) => 440 * 2 ** ((n - 69) / 12);

export class Sound {
  constructor() {
    this.ctx = null;
    this.sfxVol = 0.8;
    this.musicVol = 0.5;
    this.muted = false; // 광고 중
    this.last = new Map();
    this.musicOn = false;
  }

  /** 사용자 입력 이벤트 안에서 호출해야 한다 */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    const len = this.ctx.sampleRate * 0.5;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    this.applyVolume();
  }

  applyVolume() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, now, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.sfxVol * 0.5, now, 0.02);
    this.musicBus.gain.setTargetAtTime(this.musicVol * 0.22, now, 0.05);
  }

  setVolumes(sfx, music) { this.sfxVol = sfx; this.musicVol = music; this.applyVolume(); }

  /** 탭이 숨겨지면 오디오를 멈추고, 다시 보이면 재개한다 (광고 음소거와 별개) */
  setHidden(hidden) {
    this.hidden = hidden;
    if (!this.ctx) return;
    if (hidden) this.ctx.suspend().catch(() => {});
    else if (!this.muted) this.ctx.resume().catch(() => {});
  }
  mute(on) { this.muted = on; this.applyVolume(); }

  tone({ type = 'square', f = 440, f2 = null, dur = 0.1, vol = 0.3, attack = 0.005, delay = 0, bus = this.sfxBus }) {
    const c = this.ctx;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(bus);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  hiss({ dur = 0.15, vol = 0.3, freq = 1200, q = 0.8, type = 'lowpass', delay = 0 }) {
    const c = this.ctx;
    const t0 = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(this.sfxBus);
    s.start(t0);
    s.stop(t0 + dur + 0.02);
  }

  /** 같은 소리가 너무 자주 겹치지 않게 최소 간격을 둔다 */
  play(name) {
    if (!this.ctx || this.muted || this.hidden || this.sfxVol <= 0) return;
    const gap = { merge: 0.04, drop: 0.05, warn: 0.5 }[name] ?? 0.02;
    const now = this.ctx.currentTime;
    if (now - (this.last.get(name) || 0) < gap) return;
    this.last.set(name, now);
    const r = Math.random();
    switch (name) {
      case 'click': this.tone({ type: 'square', f: 600, dur: 0.04, vol: 0.06 }); break;
      case 'drop': this.tone({ type: 'sine', f: 520 + r * 60, f2: 300, dur: 0.1, vol: 0.12 }); break;
      case 'merge': {
        // 단계가 클수록 낮고 풍성한 소리
        const tier = this.mergeTier || 0;
        const base = 84 - tier * 2.5;
        [0, 7, 12].forEach((n, i) => this.tone({ type: i ? 'triangle' : 'sine', f: NOTE(base + n), dur: 0.14 + tier * 0.02, vol: 0.12 - i * 0.03, delay: i * 0.035 }));
        if (tier >= 5) this.hiss({ dur: 0.2 + tier * 0.03, vol: 0.05 + tier * 0.01, freq: 900 });
        break;
      }
      case 'big': [67, 71, 74, 79, 83, 86].forEach((n, i) => this.tone({ type: 'square', f: NOTE(n), dur: 0.2, vol: 0.08, delay: i * 0.06 })); break;
      case 'nova': this.hiss({ dur: 1.2, vol: 0.3, freq: 600 }); [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => this.tone({ type: 'square', f: NOTE(n), dur: 0.26, vol: 0.09, delay: 0.1 + i * 0.08 })); break;
      case 'warn': this.tone({ type: 'square', f: 880, dur: 0.08, vol: 0.06 }); break;
      case 'pop': this.hiss({ dur: 0.3, vol: 0.2, freq: 2400, type: 'highpass' }); this.tone({ type: 'sine', f: 300, f2: 1200, dur: 0.3, vol: 0.12 }); break;
      case 'over': [64, 60, 57, 52].forEach((n, i) => this.tone({ type: 'triangle', f: NOTE(n), dur: 0.3, vol: 0.14, delay: i * 0.16 })); break;
      case 'revive': this.tone({ type: 'sine', f: 300, f2: 1200, dur: 0.5, vol: 0.14 }); break;
      default:
    }
  }

  /* ───────── 배경음: 단조 아르페지오 + 베이스, 강도(intensity)에 따라 드럼이 붙는다 ───────── */

  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.intensity = 0;
    const tick = () => {
      if (!this.musicOn) return;
      while (this.nextTime < this.ctx.currentTime + 0.25) {
        this.scheduleStep(this.step, this.nextTime);
        this.nextTime += 60 / 88 / 4; // 88 BPM, 16분음표
        this.step += 1;
      }
      this.musicTimer = setTimeout(tick, 60);
    };
    tick();
  }

  stopMusic() {
    this.musicOn = false;
    clearTimeout(this.musicTimer);
  }

  scheduleStep(step, time) {
    const c = this.ctx;
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    const roots = [50, 47, 43, 45]; // D B G A
    const root = roots[bar];
    const play = (type, f, dur, vol, bus = this.musicBus) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, time);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(vol, time + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      o.connect(g).connect(bus);
      o.start(time);
      o.stop(time + dur + 0.02);
    };
    if (s % 4 === 0) play('sawtooth', NOTE(root - 12), 0.22, 0.5);
    if (s % 4 === 2 && this.intensity > 0.3) play('sawtooth', NOTE(root - 12), 0.12, 0.3);
    const arp = [0, 4, 7, 11, 12, 11, 7, 4];
    if (s % 2 === 0) play('square', NOTE(root + 12 + arp[(s / 2) % 8]), 0.12, 0.12);
    if (this.intensity > 0.5 && s % 8 === 4) {
      // 스네어 비슷한 소리
      const src = c.createBufferSource();
      src.buffer = this.noise;
      const f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 1800;
      const g = c.createGain();
      g.gain.setValueAtTime(0.25, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
      src.connect(f).connect(g).connect(this.musicBus);
      src.start(time);
      src.stop(time + 0.15);
    }
    if (this.intensity > 0.05 && s % 4 === 0) play('sine', 60, 0.15, 0.7);
  }
}
