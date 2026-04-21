import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useFriday } from "@/context/FridayContext";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    settings,
    status,
    listeningMode,
    isActive,
    isOnline,
    lastTranscript,
    error,
    isSetupComplete,
    startFriday,
  } = useFriday();

  const topPad = Platform.OS === "web" ? 16 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.15)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(1)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const transcriptOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const allAnims = [
      orbScale, orbOpacity, ring1Scale, ring1Opacity,
      ring2Scale, ring2Opacity, ring3Scale, ring3Opacity,
      glowOpacity, scanAnim,
    ];
    allAnims.forEach((a) => a.stopAnimation());

    if (!isActive) {
      Animated.parallel([
        Animated.spring(orbScale, { toValue: 0.85, useNativeDriver: true }),
        Animated.timing(orbOpacity, { toValue: 0.08, duration: 600, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(ring1Opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(ring2Opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(ring3Opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
      return;
    }

    if (listeningMode === "wake_word" && status === "idle") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(orbScale, { toValue: 1.04, duration: 2000, useNativeDriver: true }),
          Animated.timing(orbScale, { toValue: 0.97, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(orbOpacity, { toValue: 0.22, duration: 2000, useNativeDriver: true }),
          Animated.timing(orbOpacity, { toValue: 0.12, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.3, duration: 2500, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.05, duration: 2500, useNativeDriver: true }),
        ])
      ).start();
    }

    if (listeningMode === "command" || status === "listening") {
      const ripple = (scale: Animated.Value, opacity: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(scale, { toValue: 2.8, duration: 1600, useNativeDriver: true }),
              Animated.sequence([
                Animated.timing(opacity, { toValue: 0.7, duration: 100, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
              ]),
            ]),
            Animated.parallel([
              Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
          ])
        );
      ripple(ring1Scale, ring1Opacity, 0).start();
      ripple(ring2Scale, ring2Opacity, 520).start();
      ripple(ring3Scale, ring3Opacity, 1040).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(orbScale, { toValue: 1.15, duration: 400, useNativeDriver: true }),
          Animated.timing(orbScale, { toValue: 0.9, duration: 400, useNativeDriver: true }),
        ])
      ).start();
      Animated.timing(glowOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }

    if (status === "processing") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.8, duration: 500, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.2, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    }

    if (status === "speaking") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(orbScale, { toValue: 1.1, duration: 200, useNativeDriver: true }),
          Animated.timing(orbScale, { toValue: 0.95, duration: 200, useNativeDriver: true }),
        ])
      ).start();
      const sp = (scale: Animated.Value, opacity: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(scale, { toValue: 1.9, duration: 900, useNativeDriver: true }),
              Animated.sequence([
                Animated.timing(opacity, { toValue: 0.5, duration: 80, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 820, useNativeDriver: true }),
              ]),
            ]),
            Animated.parallel([
              Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
          ])
        );
      sp(ring1Scale, ring1Opacity, 0).start();
      sp(ring2Scale, ring2Opacity, 280).start();
    }
  }, [status, listeningMode, isActive]);

  useEffect(() => {
    if (lastTranscript) {
      Animated.sequence([
        Animated.timing(transcriptOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(transcriptOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [lastTranscript]);

  const getOrbColor = () => {
    if (!isActive) return colors.border;
    switch (status) {
      case "listening": return colors.cyberGreen;
      case "processing": return colors.neonPurple;
      case "speaking": return colors.techBlue;
      default: return colors.techBlue;
    }
  };

  const orbColor = getOrbColor();

  const getStatusLine = () => {
    if (!isActive) return `Say "${settings.wakeWord}" to activate`;
    switch (status) {
      case "listening": return "I'm listening...";
      case "processing": return "Processing...";
      case "speaking": return "Speaking...";
      default:
        return listeningMode === "command"
          ? "What can I do for you?"
          : `Say "${settings.wakeWord}" to wake me`;
    }
  };

  const getModeLabel = () => {
    if (!isActive) return "STANDBY";
    switch (listeningMode) {
      case "wake_word": return "LISTENING";
      case "command": return "ACTIVE";
      default: return "STANDBY";
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Subtle grid */}
      {[...Array(6)].map((_, i) => (
        <View
          key={`h${i}`}
          style={[
            styles.gridH,
            { top: `${10 + i * 16}%` as any, backgroundColor: colors.techBlue + "06" },
          ]}
          pointerEvents="none"
        />
      ))}
      {[...Array(4)].map((_, i) => (
        <View
          key={`v${i}`}
          style={[
            styles.gridV,
            { left: `${15 + i * 25}%` as any, backgroundColor: colors.techBlue + "06" },
          ]}
          pointerEvents="none"
        />
      ))}

      {/* Top bar — gear only */}
      <View style={[styles.topBar, { paddingTop: topPad + 4 }]}>
        <View style={styles.topLeft}>
          <View
            style={[
              styles.modePill,
              {
                backgroundColor: isActive
                  ? orbColor + "18"
                  : colors.secondary,
                borderColor: isActive ? orbColor + "40" : colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.modeDot,
                { backgroundColor: isActive ? orbColor : colors.border },
              ]}
            />
            <Text
              style={[
                styles.modeText,
                { color: isActive ? orbColor : colors.mutedForeground },
              ]}
            >
              {getModeLabel()}
            </Text>
          </View>
          {!isOnline && (
            <View
              style={[
                styles.offlinePill,
                {
                  backgroundColor: colors.warning + "18",
                  borderColor: colors.warning + "35",
                },
              ]}
            >
              <Feather name="wifi-off" size={10} color={colors.warning} />
              <Text style={[styles.offlineText, { color: colors.warning }]}>
                Offline
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={[
            styles.gearBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="settings" size={17} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Main orb area */}
      <View style={styles.orbArea}>
        {/* Glow halo */}
        <Animated.View
          style={[
            styles.glowHalo,
            {
              backgroundColor: orbColor,
              opacity: glowOpacity,
            },
          ]}
          pointerEvents="none"
        />

        {/* Ripple rings */}
        {[
          { scale: ring1Scale, opacity: ring1Opacity },
          { scale: ring2Scale, opacity: ring2Opacity },
          { scale: ring3Scale, opacity: ring3Opacity },
        ].map((r, i) => (
          <Animated.View
            key={i}
            style={[
              styles.ring,
              {
                borderColor: orbColor,
                opacity: r.opacity,
                transform: [{ scale: r.scale }],
              },
            ]}
            pointerEvents="none"
          />
        ))}

        {/* Core orb */}
        <Animated.View
          style={[
            styles.orb,
            {
              backgroundColor: orbColor,
              opacity: orbOpacity,
              transform: [{ scale: orbScale }],
            },
          ]}
          pointerEvents="none"
        />

        {/* Orb border */}
        <View
          style={[
            styles.orbBorder,
            {
              borderColor: orbColor + (isActive ? "60" : "25"),
            },
          ]}
          pointerEvents="none"
        />

        {/* Center symbol */}
        <View style={styles.orbCenter} pointerEvents="none">
          {status === "processing" ? (
            <Animated.View
              style={{
                opacity: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
              }}
            >
              <Feather name="cpu" size={28} color={orbColor} />
            </Animated.View>
          ) : status === "speaking" ? (
            <Feather name="volume-2" size={28} color={orbColor} />
          ) : listeningMode === "command" ? (
            <Feather name="mic" size={28} color={orbColor} />
          ) : isActive ? (
            <Feather name="radio" size={26} color={orbColor} />
          ) : (
            <Feather name="mic-off" size={24} color={colors.border} />
          )}
        </View>
      </View>

      {/* AI name */}
      <Text style={[styles.aiName, { color: colors.techBlue }]}>
        {settings.aiName}
      </Text>

      {/* Status line */}
      <Text style={[styles.statusLine, { color: colors.mutedForeground }]}>
        {getStatusLine()}
      </Text>

      {/* Live transcript */}
      {lastTranscript ? (
        <Animated.View
          style={[
            styles.transcriptBox,
            {
              backgroundColor: colors.card + "CC",
              borderColor: orbColor + "30",
              opacity: transcriptOpacity,
            },
          ]}
          pointerEvents="none"
        >
          <Text
            style={[styles.transcriptText, { color: colors.foreground }]}
            numberOfLines={2}
          >
            "{lastTranscript}"
          </Text>
        </Animated.View>
      ) : null}

      {/* Error */}
      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: colors.destructive + "15",
              borderColor: colors.destructive + "30",
            },
          ]}
        >
          <Feather name="alert-circle" size={13} color={colors.destructive} />
          <Text
            style={[styles.errorText, { color: colors.destructive }]}
            numberOfLines={2}
          >
            {error}
          </Text>
        </View>
      ) : null}

      {/* Deactivate hint */}
      {isActive && (
        <Text style={[styles.deactivateHint, { color: colors.mutedForeground + "60" }]}>
          Say "{settings.deactivateWord}" to stop
        </Text>
      )}

      {/* Setup prompt for first-time users */}
      {!isSetupComplete && (
        <View style={[styles.setupPrompt, { paddingBottom: bottomPad + 20 }]}>
          <View
            style={[
              styles.setupCard,
              {
                backgroundColor: colors.techBlue + "12",
                borderColor: colors.techBlue + "35",
              },
            ]}
          >
            <Feather name="info" size={14} color={colors.techBlue} />
            <Text style={[styles.setupText, { color: colors.foreground }]}>
              First time? Configure your wake word and AI identity before starting.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={[
                styles.setupBtn,
                { backgroundColor: colors.techBlue + "20", borderColor: colors.techBlue + "50" },
              ]}
            >
              <Text style={[styles.setupBtnText, { color: colors.techBlue }]}>
                Setup
              </Text>
              <Feather name="arrow-right" size={13} color={colors.techBlue} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Start instruction (bottom) — only when stopped */}
      {!isActive && isSetupComplete && (
        <View style={[styles.startArea, { paddingBottom: bottomPad + 20 }]}>
          <TouchableOpacity
            onPress={startFriday}
            style={[
              styles.startBtn,
              {
                backgroundColor: colors.techBlue + "15",
                borderColor: colors.techBlue + "40",
              },
            ]}
          >
            <Feather name="play" size={15} color={colors.techBlue} />
            <Text style={[styles.startBtnText, { color: colors.techBlue }]}>
              Start {settings.aiName}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.startHint, { color: colors.mutedForeground + "50" }]}>
            Once started, use voice commands only
          </Text>
        </View>
      )}
    </View>
  );
}

const ORB_SIZE = 180;

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  gridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  gridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 10,
  },
  topLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  modeDot: { width: 6, height: 6, borderRadius: 3 },
  modeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  offlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  offlineText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  gearBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  orbArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  glowHalo: {
    position: "absolute",
    width: ORB_SIZE * 2.2,
    height: ORB_SIZE * 2.2,
    borderRadius: ORB_SIZE * 1.1,
  },
  ring: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 1.5,
  },
  orb: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
  },
  orbBorder: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 1.5,
  },
  orbCenter: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  aiName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: 8,
    marginBottom: 10,
  },
  statusLine: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
    marginBottom: 20,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  transcriptBox: {
    marginHorizontal: 28,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  transcriptText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 28,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  deactivateHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
    marginBottom: 20,
  },
  setupPrompt: {
    width: "100%",
    paddingHorizontal: 24,
  },
  setupCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  setupText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  setupBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-end",
    paddingHorizontal: 16,
  },
  setupBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  startArea: {
    width: "100%",
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 8,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 28,
  },
  startBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  startHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
