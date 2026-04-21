import React, { useState } from "react";
import {
  Alert,
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
  { id: "en-US", label: "US English", lang: "en-US" },
  { id: "en-GB", label: "UK English", lang: "en-GB" },
  { id: "en-AU", label: "AU English", lang: "en-AU" },
  { id: "hi-IN", label: "Hindi", lang: "hi-IN" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    settings,
    updateSettings,
    addCustomCommand,
    removeCustomCommand,
    clearConversationHistory,
  } = useFriday();

  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [showAddCommand, setShowAddCommand] = useState(false);
  const [newTrigger, setNewTrigger] = useState("");
  const [newAction, setNewAction] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSave = async (field: string) => {
    if (!tempValue.trim()) return;
    await updateSettings({ [field]: tempValue.trim() });
    setEditingField(null);
    setTempValue("");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddCmd = async () => {
    if (!newTrigger.trim() || !newAction.trim()) {
      Alert.alert("Missing fields", "Trigger and action are required.");
      return;
    }
    await addCustomCommand({
      trigger: newTrigger.trim(),
      action: newAction.trim(),
      description: newDesc.trim() || newTrigger.trim(),
    });
    setNewTrigger("");
    setNewAction("");
    setNewDesc("");
    setShowAddCommand(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const confirmRemove = (cmd: CustomCommand) => {
    Alert.alert("Remove Command", `Remove "${cmd.trigger}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeCustomCommand(cmd.id),
      },
    ]);
  };

  const confirmClearHistory = () => {
    Alert.alert(
      "Clear History",
      "Delete all conversation history permanently?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: clearConversationHistory },
      ]
    );
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.techBlue }]}>
        {title}
      </Text>
      <View
        style={[styles.sectionLine, { backgroundColor: colors.techBlue + "25" }]}
      />
    </View>
  );

  const EditableRow = ({
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
        styles.editRow,
        {
          backgroundColor: colors.card,
          borderColor:
            editingField === field ? colors.techBlue + "60" : colors.border,
        },
      ]}
    >
      <View style={styles.editRowLeft}>
        <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        {editingField === field ? (
          <TextInput
            value={tempValue}
            onChangeText={setTempValue}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.editInput, { color: colors.foreground }]}
            autoFocus
            onSubmitEditing={() => handleSave(field)}
          />
        ) : (
          <Text style={[styles.editValue, { color: colors.foreground }]}>
            {value}
          </Text>
        )}
      </View>
      <View style={styles.editActions}>
        {editingField === field ? (
          <>
            <TouchableOpacity
              onPress={() => {
                setEditingField(null);
                setTempValue("");
              }}
              style={[styles.miniBtn, { backgroundColor: colors.secondary }]}
            >
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSave(field)}
              style={[
                styles.miniBtn,
                { backgroundColor: colors.techBlue + "25" },
              ]}
            >
              <Feather name="check" size={14} color={colors.techBlue} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={() => {
              setEditingField(field);
              setTempValue(value);
            }}
            style={[styles.miniBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="edit-2" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
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
          Configuration
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 32 },
        ]}
      >
        <SectionHeader title="// IDENTITY" />
        <EditableRow
          label="AI Name"
          field="aiName"
          value={settings.aiName}
          placeholder="FRIDAY, JARVIS, NOVA..."
        />
        <EditableRow
          label="Owner Name"
          field="ownerName"
          value={settings.ownerName}
          placeholder="Your name"
        />

        <SectionHeader title="// ACTIVATION" />
        <EditableRow
          label="Wake Word"
          field="wakeWord"
          value={settings.wakeWord}
          placeholder="hey friday"
        />
        <EditableRow
          label="Deactivate Word"
          field="deactivateWord"
          value={settings.deactivateWord}
          placeholder="goodbye friday"
        />

        <SectionHeader title="// VOICE (OFFLINE)" />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>
            Uses your device's built-in speech engine. Works without internet.
          </Text>
          <View style={styles.chipRow}>
            {VOICES.map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={() => updateSettings({ voiceId: v.lang })}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      settings.voiceId === v.lang
                        ? colors.techBlue + "22"
                        : colors.secondary,
                    borderColor:
                      settings.voiceId === v.lang
                        ? colors.techBlue
                        : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        settings.voiceId === v.lang
                          ? colors.techBlue
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

        <SectionHeader title="// AI BEHAVIOR" />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>
            System prompt — controls AI personality when online
          </Text>
          <TextInput
            value={settings.systemPrompt}
            onChangeText={(v) => updateSettings({ systemPrompt: v })}
            multiline
            style={[
              styles.promptArea,
              {
                color: colors.foreground,
                backgroundColor: colors.secondary,
                borderColor: colors.border,
              },
            ]}
            placeholderTextColor={colors.mutedForeground}
            placeholder="You are an AI assistant..."
          />
        </View>

        <SectionHeader title="// SECURITY" />
        <View
          style={[
            styles.switchRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.switchInfo}>
            <Text style={[styles.switchLabel, { color: colors.foreground }]}>
              Security Mode
            </Text>
            <Text
              style={[styles.switchSub, { color: colors.mutedForeground }]}
            >
              Alert on unauthorized access attempts
            </Text>
          </View>
          <Switch
            value={settings.securityEnabled}
            onValueChange={(v) => updateSettings({ securityEnabled: v })}
            thumbColor={
              settings.securityEnabled ? colors.techBlue : colors.mutedForeground
            }
            trackColor={{
              false: colors.secondary,
              true: colors.techBlue + "50",
            }}
          />
        </View>

        <SectionHeader title="// CUSTOM COMMANDS" />
        <View
          style={[
            styles.hintCard,
            {
              backgroundColor: colors.techBlue + "10",
              borderColor: colors.techBlue + "25",
            },
          ]}
        >
          <Feather name="info" size={13} color={colors.techBlue} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Actions: open_app:youtube · search:google · call:mom · navigate:home
          </Text>
        </View>

        {settings.customCommands.map((cmd) => (
          <View
            key={cmd.id}
            style={[
              styles.cmdRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.cmdInfo}>
              <Text style={[styles.cmdTrigger, { color: colors.techBlue }]}>
                "{cmd.trigger}"
              </Text>
              <Text
                style={[styles.cmdDesc, { color: colors.mutedForeground }]}
              >
                → {cmd.action}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => confirmRemove(cmd)}
              style={[
                styles.miniBtn,
                { backgroundColor: colors.destructive + "18" },
              ]}
            >
              <Feather name="trash-2" size={14} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        ))}

        {showAddCommand ? (
          <View
            style={[
              styles.addForm,
              {
                backgroundColor: colors.card,
                borderColor: colors.techBlue + "40",
              },
            ]}
          >
            <Text style={[styles.addFormTitle, { color: colors.foreground }]}>
              New Command
            </Text>
            {[
              { value: newTrigger, setter: setNewTrigger, placeholder: 'Trigger: "open netflix"' },
              { value: newAction, setter: setNewAction, placeholder: "Action: open_app:netflix" },
              { value: newDesc, setter: setNewDesc, placeholder: "Description (optional)" },
            ].map(({ value, setter, placeholder }, i) => (
              <TextInput
                key={i}
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
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
            ))}
            <View style={styles.addFormBtns}>
              <TouchableOpacity
                onPress={() => setShowAddCommand(false)}
                style={[
                  styles.formBtn,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.formBtnText, { color: colors.mutedForeground }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddCmd}
                style={[
                  styles.formBtn,
                  { backgroundColor: colors.techBlue, borderColor: colors.techBlue },
                ]}
              >
                <Text
                  style={[
                    styles.formBtnText,
                    { color: colors.background },
                  ]}
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
              {
                borderColor: colors.techBlue + "35",
                backgroundColor: colors.techBlue + "08",
              },
            ]}
          >
            <Feather name="plus" size={16} color={colors.techBlue} />
            <Text style={[styles.addBtnText, { color: colors.techBlue }]}>
              Add Custom Command
            </Text>
          </TouchableOpacity>
        )}

        <SectionHeader title="// DATA" />
        <TouchableOpacity
          onPress={confirmClearHistory}
          style={[
            styles.dangerBtn,
            {
              backgroundColor: colors.destructive + "12",
              borderColor: colors.destructive + "28",
            },
          ]}
        >
          <Feather name="trash" size={15} color={colors.destructive} />
          <Text style={[styles.dangerText, { color: colors.destructive }]}>
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
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  sectionLine: { flex: 1, height: 1 },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  editRowLeft: { flex: 1, gap: 2 },
  editLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  editValue: { fontSize: 15, fontFamily: "Inter_400Regular" },
  editInput: { fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  editActions: { flexDirection: "row", gap: 6 },
  miniBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  promptArea: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    minHeight: 90,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  switchInfo: { flex: 1, gap: 2 },
  switchLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  switchSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  hintCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  hintText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  cmdRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  cmdInfo: { flex: 1, gap: 3 },
  cmdTrigger: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cmdDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addForm: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  addFormTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  addFormBtns: { flexDirection: "row", gap: 8 },
  formBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  formBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
  },
  dangerText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
