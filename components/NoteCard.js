import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NoteCard({ note, onDownload }) {
  const handleDownload = () => onDownload(note);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="document-text" size={24} color="#2E8B7B" />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={2}>{note.title}</Text>
          <Text style={styles.subject}>{note.subject}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#2E8B7B" />
          <Text style={styles.infoText}>{note.semester}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#2E8B7B" />
          <Text style={styles.infoText}>{note.uploadedBy}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#2E8B7B" />
          <Text style={styles.infoText}>{note.uploadDate}</Text>
        </View>
      </View>

      {note.description && (
        <Text style={styles.description} numberOfLines={2}>
          {note.description}
        </Text>
      )}

      <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
        <Ionicons name="cloud-download-outline" size={20} color="#fff" />
        <Text style={styles.downloadButtonText}>Download</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF1E8',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F4D3C0',
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFE4D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C2F2E',
    marginBottom: 4,
  },
  subject: {
    fontSize: 14,
    color: '#2E8B7B',
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#5F6A65',
    marginLeft: 8,
  },
  description: {
    fontSize: 13,
    color: '#C1967E',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  downloadButton: {
    flexDirection: 'row',
    backgroundColor: '#2E8B7B',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
