import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { StatusBadge } from "@/components/StatusBadge";
import { ConversationBubble } from "@/components/ConversationBubble";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    settings,
    history,
    status,
    isActive,
    currentTranscript,
    lastResponse,
    error,
    processTextCommand,
    setActive,
    setStatus,
    speakText,
  } = useFriday();

  const [textInput, setTextInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const recentHistory = history.slice(-50);

  useEffect(() => {
    if (recentHistory.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [recentHistory.length]);

  const handleOrbPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isActive) {
      setActive(true);
      const greeting = `Hello ${settings.ownerName}! I'm ${settings.aiName}. How can I help you today?`;
      await speakText(greeting);
    } else if (status === "idle") {
      setStatus("listening");
      setTimeout(() => {
        if (status === "listening") {
          setStatus("idle");
        }
      }, 5000);
    } else {
      setStatus("idle");
    }
  }, [isActive, status, settings, setActive, setStatus, speakText]);

  const handleSendText = useCallback(async () => {
    if (!textInput.trim()) return;
    const cmd = textInput.trim();
    setTextInput("");
    setShowInput(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await processTextCommand(cmd);
  }, [textInput, processTextCommand]);

  const handleQuickCommand = useCallback(
    async (command: string) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await processTextCommand(command);
    },
    [processTextCommand]
  );

  const quickCommands = [
    { label: "YouTube", icon: "youtube" as const, cmd: "open youtube" },
    { label: "Maps", icon: "map-pin" as const, cmd: "open maps" },
    { label: "Camera", icon: "camera" as const, cmd: "open camera" },
    { label: "Settings", icon: "settings" as const, cmd: "open settings" },
  ];

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.background, colors.background + "00"]}
        style={[styles.topGradient, { height: topPadding + 80 }]}
        pointerEvents="none"
      />

      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 12,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={[styles.logo, { color: colors.primary }]}>
            {settings.aiName}
          </Text>
          <StatusBadge
            status={status}
            isActive={isActive}
            aiName={settings.aiName}
          />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => router.push("/history")}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="clock" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="settings" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={recentHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationBubble entry={item} aiName={settings.aiName} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather
              name="mic"
              size={40}
              color={colors.mutedForeground + "60"}
            />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
              Press the orb to activate
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.mutedForeground + "80" }]}
            >
              Say "{settings.wakeWord}" or tap the microphone
            </Text>
          </View>
        }
      />

      <View
        style={[
          styles.orbSection,
          { paddingBottom: bottomPadding + 16 },
        ]}
      >
        {error && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.destructive + "20", borderColor: colors.destructive + "40" },
            ]}
          >
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </Text>
          </View>
        )}

        {currentTranscript ? (
          <View
            style={[
              styles.transcriptBubble,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.transcriptText, { color: colors.mutedForeground }]}>
              {currentTranscript}
            </Text>
          </View>
        ) : null}

        <View style={styles.orbRow}>
          <VoiceOrb
            status={status}
            isActive={isActive}
            onPress={handleOrbPress}
            size={80}
          />
        </View>

        <View style={styles.quickCommands}>
          {quickCommands.map((qc) => (
            <TouchableOpacity
              key={qc.cmd}
              onPress={() => handleQuickCommand(qc.cmd)}
              style={[
                styles.quickBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name={qc.icon} size={16} color={colors.primary} />
              <Text style={[styles.quickBtnLabel, { color: colors.foreground }]}>
                {qc.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TouchableOpacity
            onPress={() => {
              setShowInput(!showInput);
              if (!isActive) setActive(true);
            }}
            style={[
              styles.inputToggle,
              {
                backgroundColor: showInput ? colors.primary + "20" : colors.card,
                borderColor: showInput ? colors.primary : colors.border,
              },
            ]}
          >
            <Feather
              name={showInput ? "x" : "edit-2"}
              size={18}
              color={showInput ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>

          {showInput && (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.inputFlex}
            >
              <View
                style={[
                  styles.textInputWrapper,
                  { backgroundColor: colors.card, borderColor: colors.primary + "60" },
                ]}
              >
                <TextInput
                  value={textInput}
                  onChangeText={setTextInput}
                  placeholder={`Tell ${settings.aiName} something...`}
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.textInput, { color: colors.foreground }]}
                  onSubmitEditing={handleSendText}
                  returnKeyType="send"
                  autoFocus
                />
                <TouchableOpacity onPress={handleSendText} style={styles.sendBtn}>
                  <Feather name="send" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}

          {!showInput && (
            <TouchableOpacity
              onPress={() => setActive(!isActive)}
              style={[
                styles.powerBtn,
                {
                  backgroundColor: isActive
                    ? colors.destructive + "20"
                    : colors.primary + "20",
                  borderColor: isActive ? colors.destructive + "40" : colors.primary + "40",
                },
              ]}
            >
              <Feather
                name="power"
                size={18}
                color={isActive ? colors.destructive : colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 2,
  },
  headerLeft: {
    gap: 8,
  },
  logo: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  orbSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  transcriptBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  transcriptText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  orbRow: {
    alignItems: "center",
  },
  quickCommands: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickBtnLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  inputToggle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inputFlex: {
    flex: 1,
  },
  textInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 42,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    padding: 4,
  },
  powerBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
