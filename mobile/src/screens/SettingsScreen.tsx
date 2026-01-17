import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { AccessibleText, AccessibleToggle, AccessibleRadioGroup, RadioOption } from '../components';
import { usePreferencesStore } from '../store';
import { AiMode } from '../types';

const AI_MODE_OPTIONS: RadioOption<AiMode>[] = [
  {
    value: 'on-device',
    label: 'On-device AI',
    hint: 'Process images locally using TensorFlow Lite. No internet required.',
  },
  {
    value: 'gemini',
    label: 'Gemini AI',
    hint: 'Use Google Gemini for higher quality captions. Requires internet.',
  },
  {
    value: 'gpt-5.2',
    label: 'GPT-5.2',
    hint: 'Use OpenAI GPT-5.2 for premium quality captions. Requires internet.',
  },
];

export function SettingsScreen(): React.ReactElement {
  const { preferences, setPreference } = usePreferencesStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <AccessibleText role="header" level={2} style={styles.sectionTitle}>
          Background Processing
        </AccessibleText>
        <AccessibleToggle
          label="Enable background scanning"
          hint="When enabled, Memora will scan and process images in the background"
          value={preferences.backgroundEnabled}
          onValueChange={(value) => setPreference('backgroundEnabled', value)}
        />
        <AccessibleToggle
          label="Auto-process new images"
          hint="Automatically add captions to new photos as they are taken"
          value={preferences.autoProcessNew}
          onValueChange={(value) => setPreference('autoProcessNew', value)}
        />
        <AccessibleToggle
          label="Process existing images"
          hint="Add captions to photos already in your library"
          value={preferences.processExisting}
          onValueChange={(value) => setPreference('processExisting', value)}
        />
      </View>

      <View style={styles.section}>
        <AccessibleText role="header" level={2} style={styles.sectionTitle}>
          AI Model
        </AccessibleText>
        <AccessibleRadioGroup
          label="Select AI model for caption generation"
          options={AI_MODE_OPTIONS}
          value={preferences.aiMode}
          onValueChange={(value) => setPreference('aiMode', value)}
        />
      </View>

      <View style={styles.section}>
        <AccessibleText role="header" level={2} style={styles.sectionTitle}>
          Scheduling Preferences
        </AccessibleText>
        <AccessibleToggle
          label="Wi-Fi only"
          hint="Only process images when connected to Wi-Fi. Saves mobile data."
          value={preferences.wifiOnly}
          onValueChange={(value) => setPreference('wifiOnly', value)}
        />
        <AccessibleToggle
          label="Charging only"
          hint="Only process images while device is charging. Saves battery."
          value={preferences.chargingOnly}
          onValueChange={(value) => setPreference('chargingOnly', value)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingVertical: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
});
