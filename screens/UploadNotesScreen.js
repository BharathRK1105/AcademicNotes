import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UploadNotesScreen({ navigation }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: 'Data Structures',
    semester: 'Semester 1',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  const subjects = [
    'Data Structures',
    'Operating Systems',
    'DBMS',
    'Computer Networks',
    'Software Engineering',
    'Machine Learning',
    'Web Development',
    'Mobile Development',
    'Artificial Intelligence',
    'Cloud Computing',
  ];

  const semesters = [
    'Semester 1',
    'Semester 2',
    'Semester 3',
    'Semester 4',
    'Semester 5',
    'Semester 6',
    'Semester 7',
    'Semester 8',
  ];

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: '' });
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
        setErrors({ ...errors, file: '' });
      }
    } catch (error) {
      console.log('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const validateForm = () => {
    let newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!selectedFile) {
      newErrors.file = 'Please select a file to upload';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpload = async () => {
    if (!validateForm()) {
      return;
    }

    setUploading(true);

    try {
      // Get current user
      const currentUserData = await AsyncStorage.getItem('currentUser');
      const currentUser = currentUserData ? JSON.parse(currentUserData) : null;

      if (!currentUser) {
        Alert.alert('Error', 'User not found. Please login again.');
        return;
      }

      // Create new note object
      const newNote = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        semester: formData.semester,
        uploadedBy: currentUser.fullName,
        uploadDate: new Date().toISOString().split('T')[0],
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      };

      // Get existing notes
      const notesData = await AsyncStorage.getItem('notes');
      const notes = notesData ? JSON.parse(notesData) : [];

      // Add new note
      notes.unshift(newNote); // Add to beginning
      await AsyncStorage.setItem('notes', JSON.stringify(notes));

      // Simulate upload delay
      setTimeout(() => {
        setUploading(false);
        Alert.alert(
          'Success',
          'Notes uploaded successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setFormData({
                  title: '',
                  description: '',
                  subject: 'Data Structures',
                  semester: 'Semester 1',
                });
                setSelectedFile(null);
                navigation.navigate('Home');
              },
            },
          ]
        );
      }, 1500);
    } catch (error) {
      setUploading(false);
      Alert.alert('Error', 'Failed to upload notes. Please try again.');
      console.log('Upload error:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Ionicons name="cloud-upload" size={60} color="#2E8B7B" />
          <Text style={styles.headerTitle}>Upload Your Notes</Text>
          <Text style={styles.headerSubtitle}>Share knowledge with your peers</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Note Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Data Structures - Trees and Graphs"
            value={formData.title}
            onChangeText={(text) => updateField('title', text)}
            placeholderTextColor="#BDC3C7"
          />
          {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Brief description or summary of the notes"
            value={formData.description}
            onChangeText={(text) => updateField('description', text)}
            multiline
            numberOfLines={4}
            placeholderTextColor="#BDC3C7"
          />

          <Text style={styles.label}>Subject *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.subject}
              style={styles.picker}
              onValueChange={(value) => updateField('subject', value)}
            >
              {subjects.map((subject) => (
                <Picker.Item key={subject} label={subject} value={subject} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Semester *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.semester}
              style={styles.picker}
              onValueChange={(value) => updateField('semester', value)}
            >
              {semesters.map((sem) => (
                <Picker.Item key={sem} label={sem} value={sem} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Select File *</Text>
          <TouchableOpacity style={styles.filePickerButton} onPress={pickDocument}>
            <Ionicons name="document-attach-outline" size={24} color="#2E8B7B" />
            <Text style={styles.filePickerText}>
              {selectedFile ? selectedFile.name : 'Choose PDF or DOC file'}
            </Text>
          </TouchableOpacity>
          {selectedFile && (
            <Text style={styles.fileInfo}>
              Size: {(selectedFile.size / 1024).toFixed(2)} KB
            </Text>
          )}
          {errors.file ? <Text style={styles.errorText}>{errors.file}</Text> : null}

          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.uploadButtonText}>  Uploading...</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>  Upload Notes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7F2',
  },
  scrollContainer: {
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C2F2E',
    marginTop: 15,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#C1967E',
    marginTop: 5,
  },
  formContainer: {
    backgroundColor: '#FFF1E8',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F4D3C0',
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 7,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2F2E',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#F0D8C9',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2C2F2E',
    backgroundColor: '#FFF8F3',
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#F0D8C9',
    borderRadius: 10,
    backgroundColor: '#FFF8F3',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2E8B7B',
    borderRadius: 10,
    borderStyle: 'dashed',
    padding: 15,
    backgroundColor: '#FFE4D6',
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  filePickerText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#2E8B7B',
    fontWeight: '500',
  },
  fileInfo: {
    fontSize: 12,
    color: '#C1967E',
    marginTop: 5,
    marginLeft: 5,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#2E8B7B',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  uploadButtonDisabled: {
    backgroundColor: '#9FB3AC',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
