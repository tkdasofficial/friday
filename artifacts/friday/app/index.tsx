import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { useFriday } from "@/context/FridayContext";
import { VoiceOrb } from "@/components/VoiceOrb";
import { TaskOverlay } from "@/components/TaskOverlay";
import { speak } from "@/utils/speechEngine";

const QUICK_COMMANDS = [
  { label: "YouTube", icon: "play-circle" as const, cmd: "open youtube" },
  { label: "Maps", icon: "map-pin" as const, cmd: "open maps" },
  { label: "Camera", icon: "camera" as const, cmd: "open camera" },
  { label: "Wi-Fi", icon: "wifi" as const, cmd: "turn on wifi" },
  { label: "Bluetooth", icon: "bluetooth" as const, cmd: "turn on bluetooth" },
  { label: "Settings", icon: "settings" as const, cmd: "open settings" },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    settings,
    history,
    status,
    isActive,
    isOnline,
    currentTranscript,
    lastResponse,
    error,
    currentTask,
    backgroundMode,
    processTextCommand,
    setActive,
    setStatus,
    setBackgroundMode,
    stopAll,
  } = useFriday();

  const [textInput, setTextInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const bgPulse = useRef(new Animated.Value(0)).current;

  const recentHistory = history.slice(-40);

  useEffect(() => {
    if (recentHistory.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [recentHistory.length]);

  useEffect(() => {
    if (backgroundMode) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bgPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(bgPulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      bgPulse.stopAnimation();
      bgPulse.setValue(0);
    }
  }, [backgroundMode]);

  const handleOrbPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isActive) {
      setActive(true);
      await speak(
        `${settings.aiName} online. Hello ${settings.ownerName}, how can I help?`
      );
    } else if (status === "idle") {
      setStatus("listening");
    } else if (status === "listening") {
      setStatus("idle");
    } else if (status === "speaking" || status === "processing") {
      stopAll();
    }
  }, [isActive, status, settings, setActive, setStatus, stopAll]);

  const handleSend = useCallback(async () => {
    if (!textInput.trim()) return;
    const cmd = textInput.trim();
    setTextInput("");
    setShowInput(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isActive) setActive(true);
    await processTextCommand(cmd);
  }, [textInput, isActive, setActive, processTextCommand]);

  const handleQuickCmd = useCallback(async (cmd: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isActive) setActive(true);
    await processTextCommand(cmd);
  }, [isActive, setActive, processTextCommand]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const getStatusLabel = () => {
    if (!isActive) return "Offline";
    switch (status) {
      case "listening": return "Listening...";
      case "processing": return "Processing...";
      case "speaking": return "Speaking...";
      case "error": return "Error";
      default: return "Ready";
    }
  };

  const getStatusColor = () => {
    if (!isActive) return colors.mutedForeground;
    switch (status) {
      case "listening": return colors.cyberGreen;
      case "processing": return colors.neonPurple;
      case "speaking": return colors.techBlue;
      case "error": return colors.destructive;
      default: return colors.techBlue;
    }
  };

  const statusColor = getStatusColor();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {[...Array(3)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.gridLine,
            {
              top: `${20 + i * 30}%` as any,
              backgroundColor: colors.techBlue + "08",
            },
          ]}
          pointerEvents="none"
        />
      ))}

      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background + "EE",
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.logoRow}>
            <Text style={[styles.logo, { color: colors.techBlue }]}>
              {settings.aiName}
            </Text>
            {backgroundMode && (
              <Animated.View
                style={[
                  styles.bgBadge,
                  {
                    backgroundColor: colors.cyberGreen + "25",
                    borderColor: colors.cyberGreen + "60",
                    opacity: bgPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1],
                    }),
                  },
                ]}
              >
                <View
                  style={[
                    styles.bgDot,
                    { backgroundColor: colors.cyberGreen },
                  ]}
                />
                <Text
                  style={[styles.bgBadgeText, { color: colors.cyberGreen }]}
                >
                  BG
                </Text>
              </Animated.View>
            )}
          </View>
          <View style={styles.statusRow}>
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel()}
            </Text>
            {!isOnline && (
              <View
                style={[
                  styles.offlinePill,
                  {
                    backgroundColor: colors.warning + "20",
                    borderColor: colors.warning + "40",
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
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => {
              setBackgroundMode(!backgroundMode);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.headerBtn,
              {
                backgroundColor: backgroundMode
                  ? colors.cyberGreen + "20"
                  : colors.card,
                borderColor: backgroundMode
                  ? colors.cyberGreen + "50"
                  : colors.border,
              },
            ]}
          >
            <Feather
              name="radio"
              size={16}
              color={backgroundMode ? colors.cyberGreen : colors.mutedForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/history")}
            style={[
              styles.headerBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="clock" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={[
              styles.headerBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="sliders" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={recentHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isUser = item.role === "user";
          return (
            <View
              style={[
                styles.msgRow,
                isUser ? styles.msgRowUser : styles.msgRowAI,
              ]}
            >
              {!isUser && (
                <View
                  style={[
                    styles.aiAvatar,
                    {
                      backgroundColor: colors.techBlue + "20",
                      borderColor: colors.techBlue + "40",
                    },
                  ]}
                >
                  <Text
                    style={[styles.avatarChar, { color: colors.techBlue }]}
                  >
                    {settings.aiName[0]}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  isUser
                    ? [
                        styles.userBubble,
                        {
                          backgroundColor: colors.techBlue + "18",
                          borderColor: colors.techBlue + "35",
                        },
                      ]
                    : [
                        styles.aiBubble,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ],
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    {
                      color: isUser ? colors.techBlue : colors.foreground,
                    },
                  ]}
                >
                  {item.content}
                </Text>
                <Text
                  style={[
                    styles.bubbleTime,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={[
          styles.listContent,
          recentHistory.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyOrb,
                {
                  backgroundColor: colors.techBlue + "10",
                  borderColor: colors.techBlue + "30",
                },
              ]}
            >
              <Feather name="mic" size={28} color={colors.techBlue + "80"} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {isActive ? `${settings.aiName} is ready` : `Activate ${settings.aiName}`}
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
            >
              {isActive
                ? "Tap the orb or type a command below"
                : `Say "${settings.wakeWord}" or press the orb`}
            </Text>
          </View>
        }
      />

      <View
        style={[
          styles.bottom,
          {
            paddingBottom: bottomPad + 12,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        {error ? (
          <View
            style={[
              styles.errorBar,
              {
                backgroundColor: colors.destructive + "18",
                borderColor: colors.destructive + "35",
              },
            ]}
          >
            <Feather
              name="alert-triangle"
              size={13}
              color={colors.destructive}
            />
            <Text
              style={[styles.errorText, { color: colors.destructive }]}
              numberOfLines={1}
            >
              {error}
            </Text>
          </View>
        ) : null}

        {currentTranscript && status !== "idle" ? (
          <View
            style={[
              styles.transcriptBar,
              {
                backgroundColor: colors.card,
                borderColor: statusColor + "40",
              },
            ]}
          >
            <View
              style={[styles.transcriptDot, { backgroundColor: statusColor }]}
            />
            <Text
              style={[
                styles.transcriptText,
                { color: colors.mutedForeground },
              ]}
              numberOfLines={1}
            >
              {currentTranscript}
            </Text>
          </View>
        ) : null}

        <View style={styles.orbContainer}>
          <VoiceOrb
            status={status}
            isActive={isActive}
            onPress={handleOrbPress}
            size={78}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
        >
          {QUICK_COMMANDS.map((qc) => (
            <TouchableOpacity
              key={qc.cmd}
              onPress={() => handleQuickCmd(qc.cmd)}
              style={[
                styles.quickBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Feather name={qc.icon} size={14} color={colors.techBlue} />
              <Text
                style={[styles.quickBtnText, { color: colors.foreground }]}
              >
                {qc.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          {showInput ? (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.inputFlex}
            >
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.techBlue + "60",
                  },
                ]}
              >
                <TextInput
                  value={textInput}
                  onChangeText={setTextInput}
                  placeholder={`Ask ${settings.aiName}...`}
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.inputField, { color: colors.foreground }]}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  autoFocus
                />
                <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
                  <View
                    style={[
                      styles.sendIcon,
                      { backgroundColor: colors.techBlue },
                    ]}
                  >
                    <Feather name="send" size={14} color={colors.background} />
                  </View>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => {
                  setShowInput(true);
                  if (!isActive) setActive(true);
                }}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    flex: 1,
                  },
                ]}
              >
                <Feather name="edit-3" size={16} color={colors.mutedForeground} />
                <Text
                  style={[styles.actionBtnText, { color: colors.mutedForeground }]}
                >
                  Type a command
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setActive(!isActive);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                style={[
                  styles.powerBtn,
                  {
                    backgroundColor: isActive
                      ? colors.destructive + "18"
                      : colors.techBlue + "18",
                    borderColor: isActive
                      ? colors.destructive + "40"
                      : colors.techBlue + "40",
                  },
                ]}
              >
                <Feather
                  name="power"
                  size={18}
                  color={isActive ? colors.destructive : colors.techBlue}
                />
              </TouchableOpacity>
            </>
          )}

          {showInput && (
            <TouchableOpacity
              onPress={() => {
                setShowInput(false);
                setTextInput("");
              }}
              style={[
                styles.cancelBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TaskOverlay
        task={currentTask}
        aiName={settings.aiName}
        lastResponse={lastResponse}
        status={status}
        onDismiss={stopAll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { gap: 5 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: {
    fontSize: 21,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
  },
  bgBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  bgDot: { width: 5, height: 5, borderRadius: 2.5 },
  bgBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
  offlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  offlineText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  headerRight: { flexDirection: "row", gap: 7 },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { paddingVertical: 12 },
  listEmpty: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
    gap: 14,
  },
  emptyOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  msgRow: { flexDirection: "row", paddingHorizontal: 14, marginVertical: 3, gap: 8 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAI: { justifyContent: "flex-start" },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  avatarChar: { fontSize: 12, fontFamily: "Inter_700Bold" },
  bubble: {
    maxWidth: "78%",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 3,
  },
  userBubble: { borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular", alignSelf: "flex-end" },
  bottom: {
    paddingTop: 10,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  errorBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  transcriptBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  transcriptDot: { width: 6, height: 6, borderRadius: 3 },
  transcriptText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  orbContainer: { alignItems: "center" },
  quickRow: { paddingHorizontal: 2, gap: 8 },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  inputFlex: { flex: 1 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
  },
  inputField: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  sendBtn: { padding: 2 },
  sendIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  powerBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
