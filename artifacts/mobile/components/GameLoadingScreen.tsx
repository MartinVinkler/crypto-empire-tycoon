import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  /** Called once the fade-out animation has fully completed. */
  onHidden?: () => void;
}

const NEON   = "#39FF14";
const BG     = "#050505";
const DIM    = "#1a1a1a";
const MUTED  = "#4a4a4a";

const BAR_WIDTH = 220;

const STEPS = [
  "Decrypting save data…",
  "Verifying purchases…",
  "Initializing ad systems…",
  "Launching empire…",
];

export function GameLoadingScreen({ visible, onHidden }: Props) {
  const opacity   = useRef(new Animated.Value(1)).current;
  const spin      = useRef(new Animated.Value(0)).current;
  const pulse     = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  // Pixel-based progress (avoids % string → layout reflow each step)
  const progressPx = useRef(new Animated.Value(0)).current;
  const [stepIdx, setStepIdx] = useState(0);
  const [hidden, setHidden] = useState(false);

  // ── Spinner rotation (hardware-accelerated) ──
  useEffect(() => {
    const rotation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    rotation.start();
    return () => rotation.stop();
  }, [spin]);

  // ── Bitcoin icon pulse (hardware-accelerated) ──
  useEffect(() => {
    const pulsing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulsing.start();
    return () => pulsing.stop();
  }, [pulse]);

  // ── Outer ring breathe (hardware-accelerated) ──
  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, {
          toValue: 1.06,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    breathe.start();
    return () => breathe.stop();
  }, [ringScale]);

  // ── Status text cycling ──
  useEffect(() => {
    if (!visible) return;
    const iv = setInterval(() => {
      setStepIdx((i) => (i + 1) % STEPS.length);
    }, 800);
    return () => clearInterval(iv);
  }, [visible]);

  // ── Smooth progress bar — animated pixels, no layout thrash ──
  useEffect(() => {
    Animated.timing(progressPx, {
      toValue: ((stepIdx + 1) / STEPS.length) * BAR_WIDTH,
      duration: 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false, // width is a layout prop — JS-side is unavoidable
    }).start();
  }, [stepIdx, progressPx]);

  // ── Fade-out on dismiss ──
  useEffect(() => {
    if (!visible) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setHidden(true);
          onHidden?.();
        }
      });
    } else {
      setHidden(false);
      opacity.setValue(1);
    }
  }, [visible, opacity, onHidden]);

  if (hidden) return null;

  const rotateDeg = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <View style={styles.center}>

        {/* Outer glow ring (breathes) */}
        <Animated.View
          style={[styles.outerRing, { transform: [{ scale: ringScale }] }]}
        />

        {/* Spinning arc ring — hardware accelerated */}
        <Animated.View
          style={[styles.spinnerRing, { transform: [{ rotate: rotateDeg }] }]}
        />

        {/* Bitcoin icon (pulses) — hardware accelerated */}
        <Animated.View
          style={[styles.iconWrap, { transform: [{ scale: pulse }] }]}
        >
          <MaterialCommunityIcons
            name="bitcoin"
            size={72}
            color={NEON}
          />
        </Animated.View>
      </View>

      {/* Title */}
      <Text style={styles.title}>CRYPTO EMPIRE</Text>
      <Text style={styles.subtitle}>TYCOON</Text>

      {/* Progress bar — smooth Animated.Value, no % string reflow */}
      <View style={styles.barWrap}>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: progressPx }]} />
        </View>
      </View>

      {/* Status text */}
      <Text style={styles.status}>{STEPS[stepIdx]}</Text>
    </Animated.View>
  );
}

const RING_SIZE = 140;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  center: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  outerRing: {
    position: "absolute",
    width: RING_SIZE + 24,
    height: RING_SIZE + 24,
    borderRadius: (RING_SIZE + 24) / 2,
    borderWidth: 1,
    borderColor: NEON + "22",
  },
  spinnerRing: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 3,
    borderColor: "transparent",
    borderTopColor: NEON,
    borderRightColor: NEON + "55",
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: NEON + "12",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: NEON + "33",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: 6,
    color: NEON,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 10,
    color: NEON + "88",
    marginBottom: 40,
  },
  barWrap: {
    width: BAR_WIDTH,
    marginBottom: 14,
  },
  barTrack: {
    height: 3,
    backgroundColor: DIM,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: 3,
    backgroundColor: NEON,
    borderRadius: 2,
    shadowColor: NEON,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  status: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
    letterSpacing: 1,
  },
});
