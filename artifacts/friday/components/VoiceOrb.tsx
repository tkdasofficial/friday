import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
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

export function VoiceOrb({ status, isActive, onPress, size = 120 }: VoiceOrbProps) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const wave1 = useRef(new Animated.Value(1)).current;
  const wave2 = useRef(new Animated.Value(1)).current;
  const wave3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === "listening") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(wave1, { toValue: 1.8, duration: 800, useNativeDriver: true }),
          Animated.timing(wave1, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(wave2, { toValue: 2.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(wave2, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(wave3, { toValue: 2.6, duration: 1200, useNativeDriver: true }),
          Animated.timing(wave3, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else if (status === "processing") {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else if (status === "speaking") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 300, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.97, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      rotateAnim.stopAnimation();
      glowAnim.stopAnimation();
      wave1.stopAnimation();
      wave2.stopAnimation();
      wave3.stopAnimation();

      Animated.parallel([
        Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true }),
        Animated.spring(wave1, { toValue: 1, useNativeDriver: true }),
        Animated.spring(wave2, { toValue: 1, useNativeDriver: true }),
        Animated.spring(wave3, { toValue: 1, useNativeDriver: true }),
      ]).start();
    }
  }, [status]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const getOrbColor = () => {
    switch (status) {
      case "listening": return colors.glowGreen || "#00FF88";
      case "processing": return colors.glowPurple || "#7B2FFF";
      case "speaking": return colors.primary;
      case "error": return colors.destructive;
      default: return isActive ? colors.primary : colors.mutedForeground;
    }
  };

  const orbColor = getOrbColor();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.container, { width: size * 3, height: size * 3 }]}>
        {status === "listening" && (
          <>
            <Animated.View
              style={[
                styles.wave,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderColor: orbColor + "30",
                  transform: [{ scale: wave3 }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.wave,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderColor: orbColor + "50",
                  transform: [{ scale: wave2 }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.wave,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderColor: orbColor + "70",
                  transform: [{ scale: wave1 }],
                },
              ]}
            />
          </>
        )}

        <Animated.View
          style={[
            styles.orb,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: orbColor + "20",
              borderColor: orbColor,
              transform: [
                { scale: pulseAnim },
                ...(status === "processing" ? [{ rotate: spin }] : []),
              ],
            },
          ]}
        >
          <View
            style={[
              styles.orbInner,
              {
                width: size * 0.7,
                height: size * 0.7,
                borderRadius: (size * 0.7) / 2,
                backgroundColor: orbColor + "40",
              },
            ]}
          >
            <View
              style={[
                styles.orbCore,
                {
                  width: size * 0.4,
                  height: size * 0.4,
                  borderRadius: (size * 0.4) / 2,
                  backgroundColor: orbColor,
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
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  wave: {
    position: "absolute",
    borderWidth: 1,
  },
  orb: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  orbInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  orbCore: {
    ...Platform.select({
      ios: {
        shadowColor: "#00D4FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
      },
    }),
  },
});
