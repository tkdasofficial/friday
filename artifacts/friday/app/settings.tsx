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
import { useFriday } from "@/context/FridayContext";
import { useColors } from "@/hooks/useColors";
import type { CustomCommand } from "@/utils/xmlStorage";
import { requestPermissions } from "@/utils/voiceEngine";

const SECTIONS = [
  { id: "identity", label: "Identity", icon: "user" as const },
  { id: "activation", label: "Activation", icon: "mic" as const },
  { id: "voice", label: "Voice", icon: "volume-2" as const },
  { id: "commands", label: "Commands", icon: "zap" as const },
  { id: "ai", label: "AI", icon: "cpu" as const },
  { id: "permissions", label: "Permissions", icon: "shield" as const },
];

const VOICE_LANGS = [
  { id: "en-US", label: "English (US)" },
  { id: "en-GB", label: "English (UK)" },
  { id: "en-AU", label: "English (AU)" },
  { id: "hi-IN", label: "Hindi" },
  { id: "es-ES", label: "Spanish" },
  { id: "fr-FR", label: "French" },
];

export default function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    settings,
    updateSettings,
    addCustomCommand,
    removeCustomCommand,
    isSetupComplete,
    markSetupComplete,
    isActive,
    stopFriday,
  } = useFriday();

  const [activeSection, setActiveSection] = useState("identity");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [showAddCmd, setShowAddCmd] = useState(false);
  const [cmdTrigger, setCmdTrigger] = useState("");
  const [cmdAction, setCmdAction] = useState("");
  const [cmdDesc, setCmdDesc] = useState("");
  const [permStatus, setPermStatus] = useState<"idle" | "ok" | "denied">("idle");

  const topPad = Platform.OS === "web" ? 12 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const saveField = async (field: string) => {
    if (!tempValue.trim()) return;
    await updateSettings({ [field]: tempValue.trim() });
    setEditingField(null);
    setTempValue("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddCmd = async () => {
    if (!cmdTrigger.trim() || !cmdAction.trim()) {
      Alert.alert("Required", "Trigger and action are required.");
      return;
    }
    await addCustomCommand({
      trigger: cmdTrigger.trim(),
      action: cmdAction.trim(),
      description: cmdDesc.trim() || cmdTrigger.trim(),
    });
    setCmdTrigger(""); setCmdAction(""); setCmdDesc("");
    setShowAddCmd(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRequestPermissions = async () => {
    const granted = await requestPermissions();
    setPermStatus(granted ? "ok" : "denied");
  };

  const handleFinishSetup = async () => {
    await markSetupComplete();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleStopFriday = async () => {
    Alert.alert(
      `Stop ${settings.aiName}?`,
      "This will stop the voice service. You can restart it from the home screen.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Stop", style: "destructive", onPress: stopFriday },
      ]
    );
  };

  const Field = ({
    label,
    field,
    value,
    placeholder,
    hint,
  }: {
    label: string;
    field: string;
    value: string;
    placeholder?: string;
    hint?: string;
  }) => (
    <View
      style={[
        styles.fieldRow,
        {
          backgroundColor: colors.card,
          borderColor:
            editingField === field ? colors.techBlue + "60" : colors.border,
        },
      ]}
    >
      <View style={styles.fieldLeft}>
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
            onSubmitEditing={() => saveField(field)}
            returnKeyType="done"
          />
        ) : (
          <Text style={[styles.fieldValue, { color: colors.foreground }]}>
            {value}
          </Text>
        )}
        {hint && editingField !== field && (
          <Text style={[styles.fieldHint, { color: colors.mutedForeground + "80" }]}>
            {hint}
          </Text>
        )}
      </View>
      <View style={styles.fieldActions}>
        {editingField === field ? (
          <>
            <TouchableOpacity
              onPress={() => { setEditingField(null); setTempValue(""); }}
              style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            >
              <Feather name="x" size={13} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => saveField(field)}
              style={[styles.iconBtn, { backgroundColor: colors.techBlue + "22" }]}
            >
              <Feather name="check" size={13} color={colors.techBlue} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={() => { setEditingField(field); setTempValue(value); }}
            style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="edit-2" size={13} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "identity":
        return (
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
              Set your AI's name and your own name so it can address you personally.
            </Text>
            <Field label="AI Name" field="aiName" value={settings.aiName} placeholder="FRIDAY, JARVIS, NOVA..." hint="This is how your AI will identify itself" />
            <Field label="Your Name" field="ownerName" value={settings.ownerName} placeholder="Your name" hint="Your AI will use this to address you" />
          </View>
        );

      case "activation":
        return (
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
              Set the voice commands to wake up and shut down your AI. No buttons — voice only.
            </Text>
            <View style={[styles.infoCard, { backgroundColor: colors.techBlue + "10", borderColor: colors.techBlue + "25" }]}>
              <Feather name="mic" size={14} color={colors.techBlue} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                Say your wake word to activate. Say the deactivate word to return to standby.
              </Text>
            </View>
            <Field label="Wake Word / Phrase" field="wakeWord" value={settings.wakeWord} placeholder="hey friday" hint={`Example: "Hey ${settings.aiName}" or "${settings.aiName} wake up"`} />
            <Field label="Deactivate Phrase" field="deactivateWord" value={settings.deactivateWord} placeholder="goodbye friday" hint={`Example: "Goodbye ${settings.aiName}" or "${settings.aiName} stop"`} />
          </View>
        );

      case "voice":
        return (
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
              Choose the language for voice recognition and speech output. Works fully offline.
            </Text>
            <View style={styles.langGrid}>
              {VOICE_LANGS.map((lang) => {
                const active = settings.voiceId === lang.id;
                return (
                  <TouchableOpacity
                    key={lang.id}
                    onPress={() => updateSettings({ voiceId: lang.id })}
                    style={[
                      styles.langChip,
                      {
                        backgroundColor: active ? colors.techBlue + "20" : colors.card,
                        borderColor: active ? colors.techBlue : colors.border,
                      },
                    ]}
                  >
                    {active && (
                      <Feather name="check" size={12} color={colors.techBlue} />
                    )}
                    <Text
                      style={[
                        styles.langText,
                        { color: active ? colors.techBlue : colors.foreground },
                      ]}
                    >
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case "commands":
        return (
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
              Create custom voice triggers that map to specific actions.
            </Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.codeLabel, { color: colors.techBlue }]}>Action format:</Text>
              <Text style={[styles.codeText, { color: colors.mutedForeground }]}>
                {"open_app:youtube  ·  search:google\ncall:mom  ·  navigate:home office"}
              </Text>
            </View>
            {settings.customCommands.map((cmd: CustomCommand) => (
              <View
                key={cmd.id}
                style={[styles.cmdItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.cmdLeft}>
                  <View style={[styles.cmdTriggerBadge, { backgroundColor: colors.techBlue + "15", borderColor: colors.techBlue + "30" }]}>
                    <Feather name="mic" size={10} color={colors.techBlue} />
                    <Text style={[styles.cmdTriggerText, { color: colors.techBlue }]}>
                      "{cmd.trigger}"
                    </Text>
                  </View>
                  <Text style={[styles.cmdActionText, { color: colors.mutedForeground }]}>
                    {cmd.action}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert("Remove", `Remove "${cmd.trigger}"?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Remove", style: "destructive", onPress: () => removeCustomCommand(cmd.id) },
                    ])
                  }
                  style={[styles.iconBtn, { backgroundColor: colors.destructive + "15" }]}
                >
                  <Feather name="trash-2" size={13} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}

            {showAddCmd ? (
              <View style={[styles.addForm, { backgroundColor: colors.card, borderColor: colors.techBlue + "35" }]}>
                <Text style={[styles.addFormTitle, { color: colors.foreground }]}>New Command</Text>
                {[
                  { val: cmdTrigger, set: setCmdTrigger, ph: 'Voice trigger: "open netflix"' },
                  { val: cmdAction, set: setCmdAction, ph: "Action: open_app:netflix" },
                  { val: cmdDesc, set: setCmdDesc, ph: "Description (optional)" },
                ].map(({ val, set, ph }, i) => (
                  <TextInput
                    key={i}
                    value={val}
                    onChangeText={set}
                    placeholder={ph}
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.addInput, { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border }]}
                  />
                ))}
                <View style={styles.addFormBtns}>
                  <TouchableOpacity
                    onPress={() => setShowAddCmd(false)}
                    style={[styles.halfBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  >
                    <Text style={[styles.halfBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddCmd}
                    style={[styles.halfBtn, { backgroundColor: colors.techBlue, borderColor: colors.techBlue }]}
                  >
                    <Text style={[styles.halfBtnText, { color: "#fff" }]}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowAddCmd(true)}
                style={[styles.dashedBtn, { borderColor: colors.techBlue + "40", backgroundColor: colors.techBlue + "08" }]}
              >
                <Feather name="plus" size={15} color={colors.techBlue} />
                <Text style={[styles.dashedBtnText, { color: colors.techBlue }]}>Add Voice Command</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case "ai":
        return (
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
              Customize how your AI behaves when it has internet access.
            </Text>
            <View style={[styles.fieldRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.fieldLeft}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  System Prompt
                </Text>
                <TextInput
                  value={settings.systemPrompt}
                  onChangeText={(v) => updateSettings({ systemPrompt: v })}
                  multiline
                  style={[styles.promptInput, { color: colors.foreground }]}
                  placeholderTextColor={colors.mutedForeground}
                  placeholder="You are an AI assistant..."
                />
              </View>
            </View>
            <View
              style={[
                styles.toggleRow,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.toggleInfo}>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                  Security Mode
                </Text>
                <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
                  Alert when unrecognized voice detected
                </Text>
              </View>
              <Switch
                value={settings.securityEnabled}
                onValueChange={(v) => updateSettings({ securityEnabled: v })}
                thumbColor={settings.securityEnabled ? colors.techBlue : colors.mutedForeground}
                trackColor={{ false: colors.secondary, true: colors.techBlue + "50" }}
              />
            </View>
          </View>
        );

      case "permissions":
        return (
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
              Grant all permissions for full voice and device control capabilities.
            </Text>
            {[
              { label: "Microphone", desc: "Required for voice commands", icon: "mic" as const },
              { label: "Speech Recognition", desc: "Required for understanding speech", icon: "activity" as const },
              { label: "Contacts", desc: "For calling and messaging by name", icon: "users" as const },
              { label: "Location", desc: "For navigation commands", icon: "map-pin" as const },
              { label: "Notifications", desc: "For background service status", icon: "bell" as const },
            ].map((perm) => (
              <View
                key={perm.label}
                style={[styles.permRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View
                  style={[styles.permIcon, { backgroundColor: colors.techBlue + "15" }]}
                >
                  <Feather name={perm.icon} size={15} color={colors.techBlue} />
                </View>
                <View style={styles.permInfo}>
                  <Text style={[styles.permLabel, { color: colors.foreground }]}>
                    {perm.label}
                  </Text>
                  <Text style={[styles.permDesc, { color: colors.mutedForeground }]}>
                    {perm.desc}
                  </Text>
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={handleRequestPermissions}
              style={[
                styles.fullBtn,
                {
                  backgroundColor:
                    permStatus === "ok"
                      ? colors.cyberGreen + "20"
                      : colors.techBlue + "18",
                  borderColor:
                    permStatus === "ok"
                      ? colors.cyberGreen + "50"
                      : colors.techBlue + "40",
                },
              ]}
            >
              <Feather
                name={permStatus === "ok" ? "check-circle" : permStatus === "denied" ? "x-circle" : "shield"}
                size={16}
                color={
                  permStatus === "ok"
                    ? colors.cyberGreen
                    : permStatus === "denied"
                    ? colors.destructive
                    : colors.techBlue
                }
              />
              <Text
                style={[
                  styles.fullBtnText,
                  {
                    color:
                      permStatus === "ok"
                        ? colors.cyberGreen
                        : permStatus === "denied"
                        ? colors.destructive
                        : colors.techBlue,
                  },
                ]}
              >
                {permStatus === "ok"
                  ? "Permissions Granted"
                  : permStatus === "denied"
                  ? "Permission Denied — Open Device Settings"
                  : "Grant All Permissions"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="arrow-left" size={16} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Setup
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {settings.aiName}
          </Text>
        </View>
        {isActive && (
          <TouchableOpacity
            onPress={handleStopFriday}
            style={[styles.stopBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}
          >
            <Feather name="power" size={15} color={colors.destructive} />
          </TouchableOpacity>
        )}
      </View>

      {/* Section tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabScroll, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabContent}
      >
        {SECTIONS.map((sec) => {
          const active = activeSection === sec.id;
          return (
            <TouchableOpacity
              key={sec.id}
              onPress={() => setActiveSection(sec.id)}
              style={[
                styles.tab,
                {
                  borderBottomColor: active ? colors.techBlue : "transparent",
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Feather
                name={sec.icon}
                size={13}
                color={active ? colors.techBlue : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: active ? colors.techBlue : colors.mutedForeground },
                ]}
              >
                {sec.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Section content */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {renderSection()}
      </ScrollView>

      {/* Finish setup button */}
      {!isSetupComplete && (
        <View style={[styles.finishArea, { paddingBottom: bottomPad + 12, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleFinishSetup}
            style={[styles.finishBtn, { backgroundColor: colors.techBlue }]}
          >
            <Feather name="check" size={16} color="#fff" />
            <Text style={styles.finishBtnText}>Setup Complete — Start Using FRIDAY</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, gap: 1 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  stopBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabScroll: { borderBottomWidth: StyleSheet.hairlineWidth, flexGrow: 0 },
  tabContent: { paddingHorizontal: 12, gap: 2 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  sectionContent: { gap: 10 },
  sectionDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 4 },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  fieldLeft: { flex: 1, gap: 2 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginBottom: 2 },
  fieldValue: { fontSize: 15, fontFamily: "Inter_400Regular" },
  fieldInput: { fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  fieldHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  fieldActions: { flexDirection: "row", gap: 6 },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  langGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  langChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  langText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  codeLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5, marginBottom: 4 },
  codeText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 19 },
  cmdItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    gap: 10,
  },
  cmdLeft: { flex: 1, gap: 4 },
  cmdTriggerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  cmdTriggerText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cmdActionText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addForm: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 9,
  },
  addFormTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addInput: {
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 11,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  addFormBtns: { flexDirection: "row", gap: 8 },
  halfBtn: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  halfBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dashedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  dashedBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  promptInput: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 4,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleInfo: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  toggleSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  permIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  permInfo: { flex: 1, gap: 2 },
  permLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  permDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  fullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
  },
  fullBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  finishArea: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    height: 50,
    borderRadius: 14,
  },
  finishBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
