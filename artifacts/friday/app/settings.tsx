import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useFriday } from "@/context/FridayContext";
import type { CustomCommand } from "@/utils/xmlStorage";

const VOICES = [
  { id: "alloy", label: "Alloy" },
  { id: "echo", label: "Echo" },
  { id: "fable", label: "Fable" },
  { id: "onyx", label: "Onyx" },
  { id: "nova", label: "Nova" },
  { id: "shimmer", label: "Shimmer" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, addCustomCommand, removeCustomCommand, clearConversationHistory } =
    useFriday();

  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [showAddCommand, setShowAddCommand] = useState(false);
  const [newCmdTrigger, setNewCmdTrigger] = useState("");
  const [newCmdAction, setNewCmdAction] = useState("");
  const [newCmdDesc, setNewCmdDesc] = useState("");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSave = async (field: string) => {
    if (!tempValue.trim()) return;
    await updateSettings({ [field]: tempValue.trim() });
    setEditingField(null);
    setTempValue("");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddCommand = async () => {
    if (!newCmdTrigger.trim() || !newCmdAction.trim()) {
      Alert.alert("Error", "Trigger and action are required.");
      return;
    }
    await addCustomCommand({
      trigger: newCmdTrigger.trim(),
      action: newCmdAction.trim(),
      description: newCmdDesc.trim() || newCmdTrigger.trim(),
    });
    setNewCmdTrigger("");
    setNewCmdAction("");
    setNewCmdDesc("");
    setShowAddCommand(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRemoveCommand = (cmd: CustomCommand) => {
    Alert.alert(
      "Remove Command",
      `Remove "${cmd.trigger}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeCustomCommand(cmd.id),
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear History",
      "This will permanently delete all conversation history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: clearConversationHistory,
        },
      ]
    );
  };

  const Field = ({
    label,
    field,
    value,
    placeholder,
  }: {
    label: string;
    field: string;
    value: string;
    placeholder: string;
  }) => (
    <View
      style={[
        styles.fieldRow,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.fieldInfo}>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        {editingField === field ? (
          <TextInput
            value={tempValue}
            onChangeText={setTempValue}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.fieldInput, { color: colors.foreground }]}
            autoFocus
            onSubmitEditing={() => handleSave(field)}
          />
        ) : (
          <Text style={[styles.fieldValue, { color: colors.foreground }]}>
            {value}
          </Text>
        )}
      </View>
      {editingField === field ? (
        <View style={styles.editButtons}>
          <TouchableOpacity
            onPress={() => {
              setEditingField(null);
              setTempValue("");
            }}
            style={[styles.editBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSave(field)}
            style={[styles.editBtn, { backgroundColor: colors.primary + "20" }]}
          >
            <Feather name="check" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => {
            setEditingField(field);
            setTempValue(value);
          }}
          style={[styles.editBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="edit-2" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>
  );

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
          Settings
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          IDENTITY
        </Text>
        <Field label="AI Name" field="aiName" value={settings.aiName} placeholder="e.g. FRIDAY, JARVIS" />
        <Field label="Owner Name" field="ownerName" value={settings.ownerName} placeholder="Your name" />

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          WAKE WORDS
        </Text>
        <Field label="Wake Word" field="wakeWord" value={settings.wakeWord} placeholder="e.g. hey friday" />
        <Field label="Deactivate Word" field="deactivateWord" value={settings.deactivateWord} placeholder="e.g. goodbye friday" />

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          VOICE
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
            Voice Style
          </Text>
          <View style={styles.voiceGrid}>
            {VOICES.map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={() => updateSettings({ voiceId: v.id })}
                style={[
                  styles.voiceChip,
                  {
                    backgroundColor:
                      settings.voiceId === v.id
                        ? colors.primary + "20"
                        : colors.secondary,
                    borderColor:
                      settings.voiceId === v.id
                        ? colors.primary
                        : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.voiceChipText,
                    {
                      color:
                        settings.voiceId === v.id
                          ? colors.primary
                          : colors.foreground,
                    },
                  ]}
                >
                  {v.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          SYSTEM PROMPT
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
            AI Behavior
          </Text>
          <TextInput
            value={settings.systemPrompt}
            onChangeText={(v) => updateSettings({ systemPrompt: v })}
            multiline
            style={[
              styles.promptInput,
              { color: colors.foreground, borderColor: colors.border },
            ]}
            placeholderTextColor={colors.mutedForeground}
            placeholder="Describe how the AI should behave..."
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          SECURITY
        </Text>
        <View
          style={[
            styles.switchRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View>
            <Text style={[styles.switchLabel, { color: colors.foreground }]}>
              Security Mode
            </Text>
            <Text
              style={[styles.switchDesc, { color: colors.mutedForeground }]}
            >
              Alert on unauthorized access attempts
            </Text>
          </View>
          <Switch
            value={settings.securityEnabled}
            onValueChange={(v) => updateSettings({ securityEnabled: v })}
            thumbColor={settings.securityEnabled ? colors.primary : colors.mutedForeground}
            trackColor={{
              false: colors.secondary,
              true: colors.primary + "40",
            }}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          CUSTOM COMMANDS
        </Text>
        <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
          Add trigger phrases that map to specific actions
        </Text>

        {settings.customCommands.map((cmd) => (
          <View
            key={cmd.id}
            style={[
              styles.commandRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.commandInfo}>
              <Text style={[styles.commandTrigger, { color: colors.primary }]}>
                "{cmd.trigger}"
              </Text>
              <Text
                style={[styles.commandDesc, { color: colors.mutedForeground }]}
              >
                {cmd.description}
              </Text>
              <Text
                style={[styles.commandAction, { color: colors.foreground + "60" }]}
              >
                {cmd.action}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleRemoveCommand(cmd)}
              style={[styles.deleteBtn, { backgroundColor: colors.destructive + "20" }]}
            >
              <Feather name="trash-2" size={15} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        ))}

        {showAddCommand ? (
          <View
            style={[
              styles.addCommandForm,
              { backgroundColor: colors.card, borderColor: colors.primary + "40" },
            ]}
          >
            <Text
              style={[styles.addFormTitle, { color: colors.foreground }]}
            >
              New Command
            </Text>
            <TextInput
              value={newCmdTrigger}
              onChangeText={setNewCmdTrigger}
              placeholder="Trigger phrase (e.g. open spotify)"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.addInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                },
              ]}
            />
            <TextInput
              value={newCmdAction}
              onChangeText={setNewCmdAction}
              placeholder="Action (e.g. open_app:spotify)"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.addInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                },
              ]}
            />
            <TextInput
              value={newCmdDesc}
              onChangeText={setNewCmdDesc}
              placeholder="Description (optional)"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.addInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                },
              ]}
            />
            <View style={styles.addFormButtons}>
              <TouchableOpacity
                onPress={() => setShowAddCommand(false)}
                style={[
                  styles.formBtn,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.formBtnText, { color: colors.mutedForeground }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddCommand}
                style={[
                  styles.formBtn,
                  { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Text
                  style={[styles.formBtnText, { color: colors.primaryForeground }]}
                >
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowAddCommand(true)}
            style={[
              styles.addBtn,
              { borderColor: colors.primary + "40", backgroundColor: colors.primary + "10" },
            ]}
          >
            <Feather name="plus" size={18} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary }]}>
              Add Custom Command
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          DATA
        </Text>
        <TouchableOpacity
          onPress={handleClearHistory}
          style={[
            styles.dangerBtn,
            { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" },
          ]}
        >
          <Feather name="trash" size={16} color={colors.destructive} />
          <Text style={[styles.dangerBtnText, { color: colors.destructive }]}>
            Clear Conversation History
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 4,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  fieldInfo: { flex: 1, gap: 2 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  fieldValue: { fontSize: 16, fontFamily: "Inter_400Regular" },
  fieldInput: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    padding: 0,
    margin: 0,
  },
  editButtons: { flexDirection: "row", gap: 6 },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  cardLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  voiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  voiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  voiceChipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  promptInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  switchLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  switchDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  hintText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  commandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  commandInfo: { flex: 1, gap: 2 },
  commandTrigger: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  commandDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  commandAction: { fontSize: 11, fontFamily: "Inter_400Regular" },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addCommandForm: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  addFormTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  addInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  addFormButtons: { flexDirection: "row", gap: 10 },
  formBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  formBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  dangerBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
