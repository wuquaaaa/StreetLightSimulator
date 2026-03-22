/**
 * 音频系统 - 路灯计划
 * 使用 Web Audio API 生成音效，无需外部音频文件
 */

let audioCtx = null;
let bgmGain = null;
let sfxGain = null;
let bgmPlaying = false;
let bgmTimeout = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0.12;
    bgmGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.25;
    sfxGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ========= 音效 =========

function playTone(freq, duration, type = 'sine', volume = 0.3) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume * sfxGain.gain.value, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration, volume = 0.1) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * volume;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

// 按钮点击音
export function sfxClick() {
  playTone(800, 0.06, 'sine', 0.15);
  setTimeout(() => playTone(1000, 0.04, 'sine', 0.1), 30);
}

// 收获音
export function sfxHarvest() {
  playTone(523, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.2), 80);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.25), 160);
}

// 种植音
export function sfxPlant() {
  playTone(400, 0.1, 'triangle', 0.2);
  setTimeout(() => playTone(500, 0.12, 'triangle', 0.15), 60);
}

// 浇水音
export function sfxWater() {
  playNoise(0.15, 0.08);
  playTone(300, 0.1, 'sine', 0.05);
}

// 翻地音
export function sfxPlow() {
  playNoise(0.12, 0.06);
  playTone(200, 0.08, 'sawtooth', 0.05);
}

// 除草/除虫
export function sfxWeed() {
  playTone(600, 0.06, 'square', 0.08);
  setTimeout(() => playTone(500, 0.05, 'square', 0.06), 40);
}

// 施肥
export function sfxFertilize() {
  playTone(350, 0.08, 'triangle', 0.12);
  setTimeout(() => playTone(450, 0.08, 'triangle', 0.1), 50);
}

// 招募
export function sfxRecruit() {
  playTone(440, 0.1, 'sine', 0.15);
  setTimeout(() => playTone(554, 0.1, 'sine', 0.15), 100);
  setTimeout(() => playTone(659, 0.12, 'sine', 0.2), 200);
}

// 通知/警告
export function sfxNotify() {
  playTone(660, 0.08, 'sine', 0.12);
  setTimeout(() => playTone(880, 0.1, 'sine', 0.15), 60);
}

// 存档/读档
export function sfxSave() {
  playTone(500, 0.05, 'sine', 0.1);
  setTimeout(() => playTone(700, 0.05, 'sine', 0.1), 50);
  setTimeout(() => playTone(600, 0.08, 'sine', 0.12), 100);
}

// UI切换音
export function sfxTab() {
  playTone(900, 0.04, 'sine', 0.08);
}

// 根据动作返回对应音效
export function sfxForAction(action) {
  switch (action) {
    case 'plow': return sfxPlow();
    case 'plant': return sfxPlant();
    case 'water': return sfxWater();
    case 'harvest': return sfxHarvest();
    case 'remove_pest':
    case 'remove_weeds': return sfxWeed();
    case 'fertilize': return sfxFertilize();
    case 'leader_recruit':
    case 'recruit_accept': return sfxRecruit();
    default: return sfxClick();
  }
}

// ========= 背景音乐（程序生成的田园风ambient） =========

const BGM_NOTES = [
  // 悠扬的五声音阶旋律循环
  { freq: 262, dur: 0.8 },  // C4
  { freq: 294, dur: 0.6 },  // D4
  { freq: 330, dur: 0.8 },  // E4
  { freq: 392, dur: 1.0 },  // G4
  { freq: 440, dur: 0.6 },  // A4
  { freq: 392, dur: 0.8 },  // G4
  { freq: 330, dur: 1.0 },  // E4
  { freq: 294, dur: 0.6 },  // D4
  { freq: 262, dur: 1.2 },  // C4
  { freq: 0, dur: 0.8 },    // rest
  { freq: 392, dur: 0.6 },  // G4
  { freq: 440, dur: 0.8 },  // A4
  { freq: 523, dur: 1.0 },  // C5
  { freq: 440, dur: 0.6 },  // A4
  { freq: 392, dur: 0.8 },  // G4
  { freq: 330, dur: 0.6 },  // E4
  { freq: 294, dur: 1.0 },  // D4
  { freq: 262, dur: 1.2 },  // C4
  { freq: 0, dur: 1.5 },    // rest
];

function playBGMNote(index) {
  if (!bgmPlaying) return;
  const ctx = getCtx();
  const note = BGM_NOTES[index % BGM_NOTES.length];

  if (note.freq > 0) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = note.freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(bgmGain.gain.value * 0.5, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(bgmGain.gain.value * 0.3, ctx.currentTime + note.dur * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + note.dur);

    // 加一层和声（低八度）
    if (Math.random() < 0.3) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = note.freq / 2;
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(bgmGain.gain.value * 0.15, ctx.currentTime + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.dur);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + note.dur);
    }
  }

  bgmTimeout = setTimeout(() => playBGMNote(index + 1), note.dur * 1000);
}

export function startBGM() {
  if (bgmPlaying) return;
  getCtx(); // ensure context
  bgmPlaying = true;
  playBGMNote(0);
}

export function stopBGM() {
  bgmPlaying = false;
  if (bgmTimeout) {
    clearTimeout(bgmTimeout);
    bgmTimeout = null;
  }
}

export function toggleBGM() {
  if (bgmPlaying) {
    stopBGM();
  } else {
    startBGM();
  }
  return bgmPlaying;
}

export function isBGMPlaying() {
  return bgmPlaying;
}

export function setBGMVolume(vol) {
  if (bgmGain) bgmGain.gain.value = Math.max(0, Math.min(1, vol));
}

export function setSFXVolume(vol) {
  if (sfxGain) sfxGain.gain.value = Math.max(0, Math.min(1, vol));
}
