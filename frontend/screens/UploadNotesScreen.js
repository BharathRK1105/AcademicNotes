import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import AppNotification from '../components/AppNotification';
import StyledSelect from '../components/StyledSelect';
import { notesService } from '../services/notesService';
import { getApiErrorMessage } from '../services/api';
import { DEPARTMENTS, SEMESTERS, SUBJECTS } from '../utils/constants';
import { theme } from '../theme';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg'];

export default function UploadNotesScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [semester, setSemester] = useState(SEMESTERS[0]);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });

  const showNotification = (message, type = 'info') => setNotification({ visible: true, message, type });
  const hideNotification = () => setNotification((prev) => ({ ...prev, visible: false }));

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        return;
      }
      const selected = result.assets?.[0];
      if (!selected) {
        return;
      }
      if (!ALLOWED_TYPES.includes((selected.mimeType || '').toLowerCase())) {
        showNotification('Only PDF, JPG, and JPEG files are allowed.', 'error');
        return;
      }
      setFile(selected);
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to pick file.'), 'error');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFile(null);
    setSubject(SUBJECTS[0]);
    setSemester(SEMESTERS[0]);
    setDepartment(DEPARTMENTS[0]);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      showNotification('Title is required.', 'error');
      return;
    }
    if (!file) {
      showNotification('Please select a file.', 'error');
      return;
    }
    try {
      setLoading(true);
      await notesService.createNote({
        title: title.trim(),
        description: description.trim(),
        subject: `${department} - ${subject}`,
        semester,
        file,
      });
      showNotification('Note uploaded successfully.', 'success');
      resetForm();
      setTimeout(() => navigation.navigate('Dashboard'), 700);
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to upload note.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <LinearGradient colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <Ionicons name="cloud-upload-outline" size={22} color={theme.colors.primary} />
              <Text style={styles.header}>Upload Note</Text>
            </View>
            <Text style={styles.headerSub}>Share PDFs and images for your classmates.</Text>
          </View>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Note title"
              placeholderTextColor="#9A9487"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Description (optional)"
              placeholderTextColor="#9A9487"
            />

            <StyledSelect label="Department" value={department} options={DEPARTMENTS} onChange={setDepartment} />
            <StyledSelect label="Subject" value={subject} options={SUBJECTS} onChange={setSubject} />
            <StyledSelect label="Semester" value={semester} options={SEMESTERS} onChange={setSemester} />

            <TouchableOpacity style={styles.secondaryButton} onPress={pickFile} activeOpacity={0.9}>
              <Ionicons name="document-attach-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.secondaryButtonText}>{file ? 'Change File' : 'Choose PDF/JPG'}</Text>
            </TouchableOpacity>

            {file ? (
              <View style={styles.previewCard}>
                <Text style={styles.previewName}>{file.name}</Text>
                <Text style={styles.previewMeta}>
                  {(file.mimeType || '').toUpperCase()} • {Math.max(1, Math.round((file.size || 0) / 1024))} KB
                </Text>
                {(file.mimeType || '').includes('image') ? <Image source={{ uri: file.uri }} style={styles.previewImage} /> : null}
              </View>
            ) : null}

            <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading} activeOpacity={0.9}>
              {loading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.buttonText}>Upload</Text>}
            </TouchableOpacity>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.tipText}>Tip: Add clear titles and subject names for easier search.</Text>
          </View>
        </ScrollView>

        <AppNotification
          visible={notification.visible}
          message={notification.message}
          type={notification.type}
          onHide={hideNotification}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.backgroundTop },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  headerCard: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  header: { fontSize: 22, fontWeight: '900', color: theme.colors.textPrimary },
  headerSub: { marginTop: 5, color: theme.colors.textSecondary, fontSize: 12 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadows.card,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
    color: theme.colors.textPrimary,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    marginTop: 2,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: { color: theme.colors.primary, fontWeight: '800' },
  previewCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 14,
    padding: 12,
    ...theme.shadows.card,
  },
  previewName: { fontWeight: '800', color: theme.colors.textPrimary },
  previewMeta: { color: theme.colors.textSecondary, marginTop: 4, fontSize: 12 },
  previewImage: { width: '100%', height: 180, borderRadius: 10, marginTop: 10, backgroundColor: '#F4EFE4' },
  button: {
    marginTop: 14,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    ...theme.shadows.button,
  },
  buttonText: { color: theme.colors.white, fontSize: 16, fontWeight: '800' },
  tipCard: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#F6EDDD',
    borderWidth: 1,
    borderColor: '#E4D4B5',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: { flex: 1, color: '#6A5533', fontSize: 12, fontWeight: '600' },
});
