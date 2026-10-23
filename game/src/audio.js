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
      // iOS는 백그라운드에서 돌아오면 'interrupted' 상태일 수 있다
      if (this.ctx.state !== 'running' && !this.hidden) this.ctx.resume().catch(() => {});
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
    clearTimeout(this.resumeTimer);
    if (hidden) { this.ctx.suspend().catch(() => {}); return; }
    // 앱으로 돌아오면 소리를 다시 켠다. 웹뷰가 바로 받아 주지 않을 때를 대비해 잠시 뒤 한 번 더 시도한다
    const resume = () => { if (!this.hidden && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); };
    resume();
    this.resumeTimer = setTimeout(resume, 400);
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
    const gap = { shoot: 0.07, gem: 0.035, die: 0.03, zap: 0.08, coin: 0.05, boom: 0.06, hurt: 0.15, bossfire: 0.2, tick: 0.09, graze: 0.045, spit: 0.12 }[name] ?? 0.05;
    const now = this.ctx.currentTime;
    if (now - (this.last.get(name) || 0) < gap) return;
    this.last.set(name, now);
    const r = Math.random();
    switch (name) {
      case 'shoot': this.tone({ f: 880 + r * 120, f2: 440, dur: 0.06, vol: 0.06 }); break;
      case 'gem': this.tone({ type: 'sine', f: 1400 + r * 400, f2: 2200, dur: 0.05, vol: 0.05 }); break;
      case 'die': this.hiss({ dur: 0.08, vol: 0.12, freq: 900 + r * 600 }); break;
      case 'zap': this.hiss({ dur: 0.12, vol: 0.12, freq: 3000, type: 'highpass' }); this.tone({ type: 'sawtooth', f: 1800, f2: 300, dur: 0.1, vol: 0.05 }); break;
      case 'missile': this.tone({ type: 'triangle', f: 300, f2: 900, dur: 0.15, vol: 0.06 }); break;
      case 'boom': this.hiss({ dur: 0.35, vol: 0.25, freq: 400 }); this.tone({ type: 'sine', f: 120, f2: 40, dur: 0.3, vol: 0.25 }); break;
      case 'beam': this.tone({ type: 'sawtooth', f: 200, f2: 1600, dur: 0.22, vol: 0.06 }); break;
      case 'wave': this.tone({ type: 'sine', f: 180, f2: 60, dur: 0.4, vol: 0.18 }); this.hiss({ dur: 0.3, vol: 0.06, freq: 600 }); break;
      case 'hurt': this.tone({ type: 'square', f: 140, f2: 70, dur: 0.18, vol: 0.18 }); break;
      case 'coin': this.tone({ type: 'square', f: 1320, dur: 0.06, vol: 0.06 }); this.tone({ type: 'square', f: 1760, dur: 0.1, vol: 0.06, delay: 0.06 }); break;
      case 'heal': [660, 880, 1100].forEach((f, i) => this.tone({ type: 'sine', f, dur: 0.14, vol: 0.1, delay: i * 0.06 })); break;
      case 'magnet': this.tone({ type: 'sine', f: 300, f2: 1500, dur: 0.4, vol: 0.12 }); break;
      case 'levelup': [72, 76, 79, 84].forEach((n, i) => this.tone({ type: 'square', f: NOTE(n), dur: 0.16, vol: 0.09, delay: i * 0.07 })); break;
      case 'chest': [67, 71, 74, 79, 83].forEach((n, i) => this.tone({ type: 'triangle', f: NOTE(n), dur: 0.22, vol: 0.14, delay: i * 0.08 })); break;
      case 'boss': [40, 40, 36].forEach((n, i) => this.tone({ type: 'sawtooth', f: NOTE(n), dur: 0.5, vol: 0.18, delay: i * 0.55 })); break;
      case 'bossfire': this.tone({ type: 'sawtooth', f: 220, f2: 110, dur: 0.2, vol: 0.08 }); break;
      case 'bossdie': this.hiss({ dur: 1.2, vol: 0.35, freq: 500 }); [60, 64, 67, 72].forEach((n, i) => this.tone({ type: 'square', f: NOTE(n), dur: 0.3, vol: 0.1, delay: 0.3 + i * 0.12 })); break;
      case 'death': this.tone({ type: 'sawtooth', f: 400, f2: 50, dur: 0.9, vol: 0.2 }); break;
      case 'win': [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => this.tone({ type: 'square', f: NOTE(n), dur: 0.25, vol: 0.1, delay: i * 0.1 })); break;
      case 'tick': this.tone({ type: 'triangle', f: 520 + r * 60, f2: 380, dur: 0.04, vol: 0.035 }); break;
      case 'spit': this.tone({ type: 'square', f: 360, f2: 240, dur: 0.07, vol: 0.05 }); break;
      case 'graze': this.tone({ type: 'sine', f: 2600 + r * 500, f2: 3400, dur: 0.035, vol: 0.045 }); break;
      case 'ready': [79, 86].forEach((n, i) => this.tone({ type: 'sine', f: NOTE(n), dur: 0.18, vol: 0.1, delay: i * 0.09 })); break;
      case 'burst':
        this.hiss({ dur: 0.7, vol: 0.32, freq: 700 });
        this.tone({ type: 'sine', f: 90, f2: 30, dur: 0.6, vol: 0.3 });
        [72, 79, 84, 91].forEach((n, i) => this.tone({ type: 'triangle', f: NOTE(n), dur: 0.2, vol: 0.08, delay: 0.05 + i * 0.05 }));
        break;
      case 'phase':
        this.tone({ type: 'sawtooth', f: 110, f2: 880, dur: 0.6, vol: 0.12 });
        this.hiss({ dur: 0.5, vol: 0.2, freq: 2400, type: 'highpass', delay: 0.1 });
        break;
      case 'click': this.tone({ type: 'square', f: 600, dur: 0.04, vol: 0.06 }); break;
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
        this.nextTime += 60 / 118 / 4; // 118 BPM, 16분음표
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
    const roots = [45, 41, 43, 40]; // A F G E
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
    const arp = [0, 3, 7, 10, 12, 10, 7, 3];
    if (s % 2 === 0) play('square', NOTE(root + 12 + arp[(s / 2) % 8]), 0.12, 0.12);
    if (this.intensity > 0.15 && s % 8 === 4) {
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
