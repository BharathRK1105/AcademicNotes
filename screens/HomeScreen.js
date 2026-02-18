import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NoteCard from '../components/NoteCard';

// Dummy initial notes data
const INITIAL_NOTES = [
  {
    id: '1',
    title: 'Data Structures Notes - Trees and Graphs',
    subject: 'Data Structures',
    semester: 'Semester 3',
    uploadedBy: 'John Doe',
    uploadDate: '2025-02-01',
    description: 'Comprehensive notes on Binary Trees, BST, and Graph algorithms',
    fileName: 'DS_Trees_Graphs.pdf',
  },
  {
    id: '2',
    title: 'Operating Systems - Process Management',
    subject: 'Operating Systems',
    semester: 'Semester 4',
    uploadedBy: 'Jane Smith',
    uploadDate: '2025-02-05',
    description: 'Detailed coverage of processes, threads, and scheduling',
    fileName: 'OS_Process_Management.pdf',
  },
  {
    id: '3',
    title: 'Database Management Systems - SQL',
    subject: 'DBMS',
    semester: 'Semester 4',
    uploadedBy: 'Mike Johnson',
    uploadDate: '2025-02-08',
    description: 'SQL queries, joins, normalization concepts',
    fileName: 'DBMS_SQL_Notes.pdf',
  },
];

export default function HomeScreen() {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    filterNotes();
  }, [searchQuery, notes]);

  const loadNotes = async () => {
    try {
      const savedNotes = await AsyncStorage.getItem('notes');
      if (savedNotes) {
        const parsedNotes = JSON.parse(savedNotes);
        setNotes(parsedNotes);
      } else {
        // Initialize with dummy data
        setNotes(INITIAL_NOTES);
        await AsyncStorage.setItem('notes', JSON.stringify(INITIAL_NOTES));
      }
    } catch (error) {
      console.log('Error loading notes:', error);
      Alert.alert('Error', 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const filterNotes = () => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = notes.filter(
      note =>
        note.title.toLowerCase().includes(query) ||
        note.subject.toLowerCase().includes(query) ||
        note.semester.toLowerCase().includes(query) ||
        note.uploadedBy.toLowerCase().includes(query)
    );
    setFilteredNotes(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  };

  const handleDownload = async (note) => {
    try {
      // Simulate download with loading
      Alert.alert('Downloading', 'Please wait...');
      
      setTimeout(() => {
        Alert.alert(
          'Success',
          `"${note.title}" has been downloaded successfully!\n\nFile: ${note.fileName}`
        );
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to download the file');
      console.log('Download error:', error);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="folder-open-outline" size={80} color="#D7B9A7" />
      <Text style={styles.emptyText}>
        {searchQuery ? 'No notes found matching your search' : 'No notes available'}
      </Text>
      {searchQuery && (
        <Text style={styles.emptySubtext}>Try a different search term</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E8B7B" />
        <Text style={styles.loadingText}>Loading notes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#7F8C8D" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by subject, semester, or keywords"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#BDC3C7"
        />
        {searchQuery !== '' && (
          <Ionicons
            name="close-circle"
            size={20}
            color="#7F8C8D"
            onPress={() => setSearchQuery('')}
            style={styles.clearIcon}
          />
        )}
      </View>

      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoteCard note={item} onDownload={handleDownload} />
        )}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2E8B7B']}
            tintColor="#2E8B7B"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7F2',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1E8',
    borderRadius: 14,
    margin: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#F4D3C0',
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  searchIcon: {
    marginRight: 10,
    color: '#2E8B7B',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2C2F2E',
  },
  clearIcon: {
    padding: 5,
    color: '#2E8B7B',
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF7F2',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2E8B7B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#2E8B7B',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C1967E',
    marginTop: 8,
  },
});
