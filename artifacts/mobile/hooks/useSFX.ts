import * as Haptics from "expo-haptics";
import { useCallback } from "react";
import { Platform } from "react-native";
import { Audio } from "expo-av";

import { useSettings } from "@/context/SettingsContext";

// ── Web Audio API singleton (web only) ──────────────────────────────────────

let _ctx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  try {
    if (!_ctx) {
      // @ts-ignore — webkit prefix
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_ctx.state === "suspended") {
      _ctx.resume().catch(() => {});
    }
    return _ctx;
  } catch {
    return null;
  }
}

function webTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  vol = 0.15,
  startOffset = 0,
) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    const t = ctx.currentTime + startOffset;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  } catch {
    // audio context may be unavailable in some environments
  }
}

// ── Native audio pool (Expo / React Native) ──────────────────────────────────
//
// Each sound key gets a POOL of Sound instances (ring buffer).
// Rapid tapping picks the next idle instance and calls replayAsync() —
// a single bridge call that seeks to 0 and plays atomically.
// No more two-step setPositionAsync + playAsync latency.

type SoundKey = "click" | "purchase" | "error" | "profit" | "loss";

const SOUND_FILES: Record<SoundKey, number> = {
  click:    require("../assets/sounds/click.wav"),
  purchase: require("../assets/sounds/purchase.wav"),
  error:    require("../assets/sounds/error.wav"),
  profit:   require("../assets/sounds/profit.wav"),
  loss:     require("../assets/sounds/loss.wav"),
};

// click needs a larger pool — can fire 10+ times/second
const POOL_SIZES: Record<SoundKey, number> = {
  click:    5,
  purchase: 2,
  error:    2,
  profit:   2,
  loss:     2,
};

const _pools: Partial<Record<SoundKey, Audio.Sound[]>> = {};
const _poolIdx: Partial<Record<SoundKey, number>> = {};
let _audioReady = false;

async function ensureAudioMode() {
  if (_audioReady) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    _audioReady = true;
  } catch {}
}

async function loadPool(key: SoundKey): Promise<void> {
  if (_pools[key]) return;
  try {
    await ensureAudioMode();
    const size = POOL_SIZES[key];
    const instances: Audio.Sound[] = [];
    for (let i = 0; i < size; i++) {
      const { sound } = await Audio.Sound.createAsync(SOUND_FILES[key], {
        shouldPlay: false,
        volume: 0.7,
      });
      instances.push(sound);
    }
    _pools[key] = instances;
    _poolIdx[key] = 0;
  } catch {}
}

/**
 * Pre-warm all audio pools during app startup so the first tap has zero
 * loading delay. Call once after the splash screen (non-blocking fire-and-forget).
 */
export function preWarmAudio(): void {
  if (Platform.OS === "web") return;
  (Object.keys(SOUND_FILES) as SoundKey[]).forEach((key) => {
    loadPool(key).catch(() => {});
  });
}

async function playNative(key: SoundKey) {
  // Ensure pool is initialised (fast path: already loaded)
  if (!_pools[key]) {
    await loadPool(key);
  }
  const pool = _pools[key];
  if (!pool || pool.length === 0) return;

  const idx = (_poolIdx[key] ?? 0) % pool.length;
  _poolIdx[key] = idx + 1;

  try {
    // replayAsync = single bridge call: seek-to-0 + play atomically.
    // Much faster than setPositionAsync(0) + playAsync() (two round-trips).
    await pool[idx].replayAsync();
  } catch {}
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useSFX() {
  const { sfxEnabled, hapticEnabled } = useSettings();

  /** Instant haptic feedback — fires before any React state updates */
  const fireHaptic = useCallback((style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS === "web") return;
    if (!hapticEnabled) return;
    Haptics.impactAsync(style).catch(() => {});
  }, [hapticEnabled]);

  /** Short electronic blip — tab press, button tap */
  const playClick = useCallback(() => {
    if (Platform.OS === "web") {
      if (!sfxEnabled) return;
      webTone(820, 0.055, "square", 0.10);
    } else {
      if (sfxEnabled) playNative("click");
      if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [sfxEnabled, hapticEnabled]);

  /** Rising chord — successful buy/sell */
  const playPurchase = useCallback(() => {
    if (Platform.OS === "web") {
      if (!sfxEnabled) return;
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        webTone(freq, 0.14, "sine", 0.18, i * 0.085);
      });
    } else {
      if (sfxEnabled) playNative("purchase");
      if (hapticEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [sfxEnabled, hapticEnabled]);

  /** Very soft tick — market price update */
  const playTick = useCallback(() => {
    if (Platform.OS === "web") {
      if (!sfxEnabled) return;
      webTone(1200, 0.025, "sine", 0.03);
    }
    // No haptic/sound for ticks on native — too frequent, would drain battery
  }, [sfxEnabled]);

  /** Error / failed action */
  const playError = useCallback(() => {
    if (Platform.OS === "web") {
      if (!sfxEnabled) return;
      webTone(200, 0.18, "sawtooth", 0.12);
    } else {
      if (sfxEnabled) playNative("error");
      if (hapticEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [sfxEnabled, hapticEnabled]);

  /**
   * Profit cha-ching — sell at a gain.
   * legendary=true plays a more dramatic 5-note ascending fanfare.
   */
  const playChaChingProfit = useCallback((legendary = false) => {
    if (Platform.OS === "web") {
      if (!sfxEnabled) return;
      if (legendary) {
        [392, 523, 659, 784, 1047, 1319].forEach((freq, i) => {
          webTone(freq, 0.22, "sine", 0.20, i * 0.075);
        });
      } else {
        webTone(1047, 0.08, "square", 0.14, 0);
        webTone(1319, 0.08, "square", 0.14, 0.06);
        webTone(1047, 0.30, "sine",   0.10, 0.12);
        webTone(1568, 0.20, "sine",   0.08, 0.14);
      }
    } else {
      if (sfxEnabled) playNative("profit");
      if (hapticEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [sfxEnabled, hapticEnabled]);

  /**
   * Loss downer — sell at a loss.
   */
  const playLossSound = useCallback(() => {
    if (Platform.OS === "web") {
      if (!sfxEnabled) return;
      [440, 349, 293, 247].forEach((freq, i) => {
        webTone(freq, 0.28, "sawtooth", 0.09, i * 0.10);
      });
      webTone(110, 0.45, "sine", 0.07, 0);
    } else {
      if (sfxEnabled) playNative("loss");
      if (hapticEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [sfxEnabled, hapticEnabled]);

  return { playClick, playPurchase, playTick, playError, playChaChingProfit, playLossSound, fireHaptic };
}
