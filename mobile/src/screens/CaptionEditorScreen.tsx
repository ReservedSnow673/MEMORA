import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TextInput } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';
import { AccessibleText, AccessibleButton } from '../components';

type CaptionEditorNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CaptionEditor'>;
type CaptionEditorRouteProp = RouteProp<RootStackParamList, 'CaptionEditor'>;

interface CaptionEditorScreenProps {
  navigation: CaptionEditorNavigationProp;
  route: CaptionEditorRouteProp;
}

export function CaptionEditorScreen({
  navigation,
  route,
}: CaptionEditorScreenProps): React.ReactElement {
  const { assetId, assetUri } = route.params;
  const [caption, setCaption] = useState('');
  const [originalCaption] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = caption !== originalCaption;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      navigation.goBack();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image
        source={{ uri: assetUri }}
        style={styles.image}
        accessibilityLabel={caption || 'Image without caption'}
        accessibilityRole="image"
      />

      <View style={styles.editorSection}>
        <AccessibleText role="header" level={3} style={styles.label}>
          Caption
        </AccessibleText>
        <TextInput
          style={styles.textInput}
          value={caption}
          onChangeText={setCaption}
          placeholder="Enter a description for this image..."
          placeholderTextColor="#8E8E93"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessibilityLabel="Caption text input"
          accessibilityHint="Enter a description that will be read by screen readers"
        />
        <AccessibleText style={styles.characterCount}>
          {caption.length} characters
        </AccessibleText>
      </View>

      <View style={styles.actions}>
        <AccessibleButton
          label="Save Caption"
          hint="Save the caption to the image metadata"
          onPress={handleSave}
          disabled={!hasChanges}
          loading={isSaving}
          style={styles.actionButton}
        />
        <AccessibleButton
          label="Cancel"
          hint="Discard changes and go back"
          onPress={handleCancel}
          variant="secondary"
          style={styles.actionButton}
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
    padding: 20,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 24,
  },
  editorSection: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    padding: 12,
    fontSize: 17,
    minHeight: 120,
    color: '#000000',
  },
  characterCount: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 12,
  },
});
