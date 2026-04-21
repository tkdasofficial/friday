import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { FridayStatus } from "@/context/FridayContext";

interface StatusBadgeProps {
  status: FridayStatus;
  isActive: boolean;
  aiName: string;
}

export function StatusBadge({ status, isActive, aiName }: StatusBadgeProps) {
  const colors = useColors();

  const getStatusText = () => {
    if (!isActive) return `${aiName} is offline`;
    switch (status) {
      case "listening": return "Listening...";
      case "processing": return "Processing...";
      case "speaking": return "Speaking...";
      case "error": return "Error occurred";
      default: return `${aiName} is ready`;
    }
  };

  const getStatusColor = () => {
    if (!isActive) return colors.mutedForeground;
    switch (status) {
      case "listening": return colors.glowGreen || "#00FF88";
      case "processing": return colors.glowPurple || "#7B2FFF";
      case "speaking": return colors.primary;
      case "error": return colors.destructive;
      default: return colors.primary;
    }
  };

  const dotColor = getStatusColor();

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.text, { color: dotColor }]}>
        {getStatusText()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
});
