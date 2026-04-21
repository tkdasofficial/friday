import React, { useState } from "react";
import {
  FlatList,
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
import { ConversationBubble } from "@/components/ConversationBubble";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { history, settings, clearConversationHistory } = useFriday();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const groupedHistory = React.useMemo(() => {
    const groups: Record<string, typeof history> = {};
    history.forEach((entry) => {
      const date = formatDate(entry.timestamp);
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return Object.entries(groups).reverse();
  }, [history]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 12,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          History
        </Text>
        <TouchableOpacity
          onPress={clearConversationHistory}
          style={[styles.clearBtn, { backgroundColor: colors.destructive + "15" }]}
        >
          <Feather name="trash-2" size={16} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      {history.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="message-circle" size={40} color={colors.mutedForeground + "60"} />
          <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
            No history yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground + "80" }]}>
            Start a conversation with {settings.aiName}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedHistory}
          keyExtractor={([date]) => date}
          contentContainerStyle={{ paddingBottom: bottomPadding + 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: [date, entries] }) => (
            <View style={styles.group}>
              <View style={styles.dateDivider}>
                <View style={[styles.divLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dateLabel, { color: colors.mutedForeground, backgroundColor: colors.background }]}>
                  {date}
                </Text>
                <View style={[styles.divLine, { backgroundColor: colors.border }]} />
              </View>
              {entries.map((entry) => (
                <ConversationBubble
                  key={entry.id}
                  entry={entry}
                  aiName={settings.aiName}
                />
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_500Medium",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  group: { marginBottom: 8 },
  dateDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 10,
  },
  divLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dateLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 8,
    letterSpacing: 0.5,
  },
});
