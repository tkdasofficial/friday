import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import type { FridayStatus } from "@/context/FridayContext";

interface VoiceOrbProps {
  status: FridayStatus;
  isActive: boolean;
  onPress: () => void;
  size?: number;
}

export function VoiceOrb({ status, isActive, onPress, size = 90 }: VoiceOrbProps) {
  const colors = useColors();
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const ring3 = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;
  const coreScale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    ring1.stopAnimation();
    ring2.stopAnimation();
    ring3.stopAnimation();
    ring1Opacity.stopAnimation();
    ring2Opacity.stopAnimation();
    ring3Opacity.stopAnimation();
    coreScale.stopAnimation();
    glowAnim.stopAnimation();
    rotAnim.stopAnimation();

    if (status === "listening") {
      const ripple = (scale: Animated.Value, opacity: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(scale, { toValue: 2.4, duration: 1400, useNativeDriver: true }),
              Animated.sequence([
                Animated.timing(opacity, { toValue: 0.6, duration: 100, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 1300, useNativeDriver: true }),
              ]),
            ]),
            Animated.parallel([
              Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
          ])
        );

      ripple(ring1, ring1Opacity, 0).start();
      ripple(ring2, ring2Opacity, 450).start();
      ripple(ring3, ring3Opacity, 900).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(coreScale, { toValue: 1.12, duration: 500, useNativeDriver: true }),
          Animated.timing(coreScale, { toValue: 0.92, duration: 500, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else if (status === "processing") {
      Animated.loop(
        Animated.timing(rotAnim, { toValue: 1, duration: 1800, useNativeDriver: true })
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        ])
      ).start();
      Animated.spring(coreScale, { toValue: 1, useNativeDriver: true }).start();
    } else if (status === "speaking") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(coreScale, { toValue: 1.08, duration: 250, useNativeDriver: true }),
          Animated.timing(coreScale, { toValue: 0.95, duration: 250, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.8, duration: 300, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ])
      ).start();

      const ripple = (scale: Animated.Value, opacity: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(scale, { toValue: 1.8, duration: 1000, useNativeDriver: true }),
              Animated.sequence([
                Animated.timing(opacity, { toValue: 0.4, duration: 100, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
              ]),
            ]),
            Animated.parallel([
              Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
          ])
        );
      ripple(ring1, ring1Opacity, 0).start();
      ripple(ring2, ring2Opacity, 300).start();
    } else {
      Animated.parallel([
        Animated.spring(coreScale, { toValue: isActive ? 1 : 0.9, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: isActive ? 0.3 : 0, duration: 400, useNativeDriver: true }),
        Animated.timing(ring1Opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(ring2Opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(ring3Opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [status, isActive]);

  const getColor = () => {
    switch (status) {
      case "listening": return colors.cyberGreen || "#00E5A0";
      case "processing": return colors.neonPurple || "#7C3AED";
      case "speaking": return colors.techBlue || "#3B9EFF";
      case "error": return colors.destructive;
      default: return isActive ? colors.primary : colors.mutedForeground;
    }
  };

  const orbColor = getColor();

  const spin = rotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const half = size / 2;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.wrap, { width: size * 2.8, height: size * 2.8 }]}>
        {[ring1, ring2, ring3].map((scale, i) => (
          <Animated.View
            key={i}
            style={[
              styles.ring,
              {
                width: size,
                height: size,
                borderRadius: half,
                borderColor: orbColor,
                transform: [{ scale }],
                opacity: [ring1Opacity, ring2Opacity, ring3Opacity][i],
              },
            ]}
          />
        ))}

        <Animated.View
          style={[
            styles.orbit,
            {
              width: size * 1.35,
              height: size * 1.35,
              borderRadius: (size * 1.35) / 2,
              borderColor: orbColor + "25",
              transform: [{ rotate: spin }],
            },
          ]}
        >
          {status === "processing" && (
            <View
              style={[
                styles.orbitDot,
                { backgroundColor: orbColor, shadowColor: orbColor },
              ]}
            />
          )}
        </Animated.View>

        <Animated.View
          style={[
            styles.outerRing,
            {
              width: size,
              height: size,
              borderRadius: half,
              borderColor: orbColor,
              opacity: glowAnim,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.core,
            {
              width: size,
              height: size,
              borderRadius: half,
              backgroundColor: orbColor + "15",
              borderColor: orbColor + "60",
              transform: [{ scale: coreScale }],
            },
          ]}
        >
          <View
            style={[
              styles.coreInner,
              {
                width: size * 0.62,
                height: size * 0.62,
                borderRadius: (size * 0.62) / 2,
                backgroundColor: orbColor + "25",
              },
            ]}
          >
            <View
              style={[
                styles.coreDot,
                {
                  width: size * 0.32,
                  height: size * 0.32,
                  borderRadius: (size * 0.32) / 2,
                  backgroundColor: orbColor,
                  shadowColor: orbColor,
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
  },
  orbit: {
    position: "absolute",
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  orbitDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: -3.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  outerRing: {
    position: "absolute",
    borderWidth: 12,
  },
  core: {
    position: "absolute",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  coreInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  coreDot: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
});
