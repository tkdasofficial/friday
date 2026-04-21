import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { TaskExecution } from "@/context/FridayContext";

interface TaskOverlayProps {
  task: TaskExecution | null;
  aiName: string;
  lastResponse: string;
  status: string;
  onDismiss: () => void;
}

export function TaskOverlay({
  task,
  aiName,
  lastResponse,
  status,
  onDismiss,
}: TaskOverlayProps) {
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isVisible = !!task || status === "speaking" || status === "processing";

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  useEffect(() => {
    if (status === "processing" || task?.status === "running") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.85,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanAnim.stopAnimation();
      pulseAnim.stopAnimation();
      Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true }).start();
    }
  }, [status, task?.status]);

  const getStatusIcon = () => {
    if (task?.status === "done") return "check-circle";
    if (task?.status === "failed") return "alert-circle";
    if (status === "speaking") return "volume-2";
    if (status === "processing") return "cpu";
    return "activity";
  };

  const getStatusColor = () => {
    if (task?.status === "done") return colors.success;
    if (task?.status === "failed") return colors.destructive;
    if (status === "speaking") return colors.techBlue;
    return colors.primary;
  };

  const statusColor = getStatusColor();

  const displayText =
    status === "speaking" && lastResponse
      ? lastResponse
      : task?.description || "";

  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 300],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: colors.card + "F5",
          borderColor: statusColor + "50",
        },
      ]}
      pointerEvents={isVisible ? "box-none" : "none"}
    >
      <View style={[styles.scanLineContainer]} pointerEvents="none">
        <Animated.View
          style={[
            styles.scanLine,
            {
              backgroundColor: statusColor + "30",
              transform: [{ translateX: scanTranslate }],
            },
          ]}
        />
      </View>

      <View style={styles.cornerTL}>
        <View style={[styles.cornerH, { backgroundColor: statusColor }]} />
        <View style={[styles.cornerV, { backgroundColor: statusColor }]} />
      </View>
      <View style={styles.cornerBR}>
        <View style={[styles.cornerH, { backgroundColor: statusColor }]} />
        <View style={[styles.cornerV, { backgroundColor: statusColor }]} />
      </View>

      <View style={styles.content}>
        <View style={styles.left}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View
              style={[
                styles.iconBg,
                { backgroundColor: statusColor + "20" },
              ]}
            >
              <Feather
                name={getStatusIcon()}
                size={18}
                color={statusColor}
              />
            </View>
          </Animated.View>
          <View style={styles.textBlock}>
            <Text style={[styles.aiLabel, { color: statusColor }]}>
              {aiName}
            </Text>
            <Text
              style={[styles.description, { color: colors.foreground }]}
              numberOfLines={2}
            >
              {displayText || "Ready"}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="x" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View
        style={[styles.progressBar, { backgroundColor: colors.border }]}
      >
        {(status === "processing" || task?.status === "running") && (
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: statusColor,
                opacity: scanAnim,
              },
            ]}
          />
        )}
        {(task?.status === "done" || status === "idle") && (
          <View
            style={[styles.progressFill, { backgroundColor: statusColor }]}
          />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 12,
    right: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  scanLineContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    borderRadius: 16,
  },
  scanLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 80,
    transform: [{ skewX: "-15deg" }],
  },
  cornerTL: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 14,
    height: 14,
  },
  cornerBR: {
    position: "absolute",
    bottom: 18,
    right: 8,
    width: 14,
    height: 14,
    transform: [{ rotate: "180deg" }],
  },
  cornerH: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  cornerV: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 2,
    height: 14,
    borderRadius: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  aiLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  progressBar: {
    height: 2,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    width: "100%",
    borderRadius: 1,
  },
});
