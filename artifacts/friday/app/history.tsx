import React from "react";
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

const CMD_ICONS: Record<string, string> = {
  open_app: "external-link",
  search: "search",
  call: "phone",
  message: "message-square",
  email: "mail",
  navigate: "map-pin",
  play_music: "music",
  alarm: "clock",
  timer: "clock",
  wifi: "wifi",
  bluetooth: "bluetooth",
  screenshot: "image",
  conversation: "message-circle",
  greeting: "sun",
  joke: "smile",
  time: "clock",
  date: "calendar",
  custom: "zap",
  offline: "wifi-off",
  error: "alert-circle",
};

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { history, settings, clearConversationHistory } = useFriday();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const grouped = React.useMemo(() => {
    const g: Record<string, typeof history> = {};
    history.forEach((e) => {
      const d = formatDate(e.timestamp);
      if (!g[d]) g[d] = [];
      g[d].push(e);
    });
    return Object.entries(g).reverse();
  }, [history]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="arrow-left" size={17} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          History
        </Text>
        <TouchableOpacity
          onPress={clearConversationHistory}
          style={[
            styles.clearBtn,
            { backgroundColor: colors.destructive + "15" },
          ]}
        >
          <Feather name="trash-2" size={15} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      {history.length === 0 ? (
        <View style={styles.empty}>
          <View
            style={[
              styles.emptyOrb,
              {
                backgroundColor: colors.techBlue + "10",
                borderColor: colors.techBlue + "25",
              },
            ]}
          >
            <Feather name="archive" size={26} color={colors.techBlue + "60"} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No history yet
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
          >
            Conversations with {settings.aiName} will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={([date]) => date}
          contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: [date, entries] }) => (
            <View>
              <View style={styles.dateRow}>
                <View
                  style={[styles.dateLine, { backgroundColor: colors.border }]}
                />
                <Text
                  style={[
                    styles.dateLabel,
                    {
                      color: colors.mutedForeground,
                      backgroundColor: colors.background,
                    },
                  ]}
                >
                  {date}
                </Text>
                <View
                  style={[styles.dateLine, { backgroundColor: colors.border }]}
                />
              </View>
              {entries.map((entry) => {
                const isUser = entry.role === "user";
                const iconName =
                  (entry.commandType && CMD_ICONS[entry.commandType]) ||
                  (isUser ? "user" : "cpu");
                return (
                  <View
                    key={entry.id}
                    style={[
                      styles.entryRow,
                      isUser ? styles.entryUser : styles.entryAI,
                    ]}
                  >
                    <View
                      style={[
                        styles.entryAvatar,
                        {
                          backgroundColor: isUser
                            ? colors.secondary
                            : colors.techBlue + "18",
                          borderColor: isUser
                            ? colors.border
                            : colors.techBlue + "35",
                        },
                      ]}
                    >
                      <Feather
                        name={iconName as any}
                        size={13}
                        color={
                          isUser ? colors.mutedForeground : colors.techBlue
                        }
                      />
                    </View>
                    <View
                      style={[
                        styles.entryBubble,
                        isUser
                          ? [
                              styles.userBubble,
                              {
                                backgroundColor: colors.techBlue + "15",
                                borderColor: colors.techBlue + "30",
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
                          styles.entryText,
                          {
                            color: isUser
                              ? colors.techBlue
                              : colors.foreground,
                          },
                        ]}
                      >
                        {entry.content}
                      </Text>
                      <Text
                        style={[
                          styles.entryTime,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {new Date(entry.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                );
              })}
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
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  clearBtn: {
    width: 34,
    height: 34,
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
  emptyOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 10,
  },
  dateLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dateLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 8,
    letterSpacing: 0.5,
  },
  entryRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    marginVertical: 3,
    gap: 8,
    alignItems: "flex-start",
  },
  entryUser: { justifyContent: "flex-end" },
  entryAI: { justifyContent: "flex-start" },
  entryAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 3,
  },
  entryBubble: {
    maxWidth: "78%",
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  userBubble: { borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4 },
  entryText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  entryTime: { fontSize: 10, fontFamily: "Inter_400Regular", alignSelf: "flex-end" },
});
