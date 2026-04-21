import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { ConversationEntry } from "@/utils/xmlStorage";

interface ConversationBubbleProps {
  entry: ConversationEntry;
  aiName: string;
}

export function ConversationBubble({ entry, aiName }: ConversationBubbleProps) {
  const colors = useColors();
  const isUser = entry.role === "user";

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
      ]}
    >
      {!isUser && (
        <View
          style={[styles.avatar, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}
        >
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {aiName[0]}
          </Text>
        </View>
      )}
      <View style={styles.bubbleWrapper}>
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "30" }]
              : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }],
          ]}
        >
          <Text
            style={[
              styles.text,
              { color: isUser ? colors.primary : colors.foreground },
            ]}
          >
            {entry.content}
          </Text>
        </View>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {formatTime(entry.timestamp)}
        </Text>
      </View>
      {isUser && (
        <View
          style={[styles.avatar, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        >
          <Text style={[styles.avatarText, { color: colors.foreground }]}>
            U
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginVertical: 4,
    paddingHorizontal: 16,
    gap: 10,
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  aiContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  bubbleWrapper: {
    maxWidth: "75%",
    gap: 4,
  },
  bubble: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    alignSelf: "flex-end",
  },
});
