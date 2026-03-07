import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ActionPrompt from '../components/ActionPrompt';
import AppNotification from '../components/AppNotification';
import NoteCard from '../components/NoteCard';
import StyledSelect from '../components/StyledSelect';
import { useAuth } from '../context/AuthContext';
import { notesService } from '../services/notesService';
import { getApiErrorMessage } from '../services/api';
import { DEPARTMENTS, SEMESTERS } from '../utils/constants';
import { theme } from '../theme';

const ALL_SEMESTERS = ['All Semesters', ...SEMESTERS];
const ALL_DEPARTMENTS = ['All Departments', ...DEPARTMENTS];

export default function StudentDashboardScreen({ navigation }) {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [visibilityTarget, setVisibilityTarget] = useState(null);
  const [ratingTarget, setRatingTarget] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState(ALL_SEMESTERS[0]);
  const [departmentFilter, setDepartmentFilter] = useState(ALL_DEPARTMENTS[0]);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });

  const showNotification = (message, type = 'info') => setNotification({ visible: true, message, type });
  const hideNotification = () => setNotification((prev) => ({ ...prev, visible: false }));

  const loadNotes = useCallback(async () => {
    try {
      const data = await notesService.getFeedNotes();
      setNotes(data);
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to load notes.'), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await notesService.deleteMyNote(deleteTarget._id);
      setDeleteTarget(null);
      await loadNotes();
      showNotification('Note deleted.', 'success');
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Delete failed.'), 'error');
    }
  };

  const handleToggleVisibility = async () => {
    if (!visibilityTarget) return;
    try {
      const nextHiddenState = !visibilityTarget.isHidden;
      await notesService.toggleMyNoteVisibility(visibilityTarget._id, nextHiddenState);
      setVisibilityTarget(null);
      await loadNotes();
      showNotification(nextHiddenState ? 'Note hidden from public feed.' : 'Note is visible now.', 'success');
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Visibility update failed.'), 'error');
    }
  };

  const openRateModal = (note) => {
    setRatingTarget(note);
    setSelectedRating(Number(note.myRating || 0));
  };

  const submitRating = async () => {
    if (!ratingTarget || selectedRating < 1 || selectedRating > 5) {
      showNotification('Please choose a rating between 1 and 5.', 'error');
      return;
    }
    try {
      await notesService.rateNote(ratingTarget._id, selectedRating);
      setRatingTarget(null);
      setSelectedRating(0);
      await loadNotes();
      showNotification('Rating saved.', 'success');
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to submit rating.'), 'error');
    }
  };

  const filteredNotes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return notes.filter((item) => {
      const semesterOk =
        semesterFilter === 'All Semesters' || (item.semester || '').toLowerCase() === semesterFilter.toLowerCase();
      const itemDepartment = (item.subject || '').split(' - ')[0]?.trim();
      const departmentOk =
        departmentFilter === 'All Departments' ||
        (itemDepartment || '').toLowerCase() === departmentFilter.toLowerCase();
      const text = `${item.title} ${item.subject} ${item.description}`.toLowerCase();
      const searchOk = !q || text.includes(q);
      return semesterOk && departmentOk && searchOk;
    });
  }, [notes, searchTerm, semesterFilter, departmentFilter]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <LinearGradient colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]} style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Ionicons name="book-outline" size={22} color={theme.colors.primary} />
            <Text style={styles.header}>Notes Library</Text>
          </View>
          <Text style={styles.headerSub}>Browse, filter, and discover academic notes quickly.</Text>
          <View style={styles.headerStats}>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{filteredNotes.length}</Text>
              <Text style={styles.statLabel}>Visible</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{notes.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>Filter Notes</Text>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <StyledSelect value={departmentFilter} options={ALL_DEPARTMENTS} placeholder="Department" onChange={setDepartmentFilter} />
            </View>
            <View style={styles.filterItem}>
              <StyledSelect value={semesterFilter} options={ALL_SEMESTERS} placeholder="Semester" onChange={setSemesterFilter} />
            </View>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.search, styles.searchWebReset]}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search notes by title or subject"
            placeholderTextColor="#9A9487"
          />
        </View>

        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => {
            const canDelete = String(item.userId?._id || item.userId) === String(currentUser?.id);
            return (
              <NoteCard
                note={{
                  ...item,
                  uploadedBy: item.userId?.name || 'Unknown',
                  uploadDate: new Date(item.createdAt).toLocaleDateString(),
                }}
                onDownload={() => notesService.openNoteFile(item)}
                onDelete={() => setDeleteTarget(item)}
                onRate={() => openRateModal(item)}
                onToggleVisibility={() => setVisibilityTarget(item)}
                showVisibilityToggle={!(item.isHidden && item.hiddenBy === 'admin')}
                isOwner={canDelete}
                canDelete={canDelete}
                showDelete
                showEdit={false}
                statusLabel={item.isHidden ? (item.hiddenBy === 'admin' ? 'Hidden by Admin' : 'Hidden') : undefined}
                averageRating={item.averageRating || 0}
                ratingsCount={item.ratingsCount || 0}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="library-outline" size={48} color="#9E8D62" />
              <Text style={styles.empty}>No notes found.</Text>
            </View>
          }
        />

        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Upload')} activeOpacity={0.9}>
          <Ionicons name="add" size={24} color={theme.colors.white} />
        </TouchableOpacity>

        <ActionPrompt
          visible={Boolean(deleteTarget)}
          title="Delete Note"
          message={deleteTarget ? `Delete "${deleteTarget.title}"?` : ''}
          confirmText="Delete"
          cancelText="Cancel"
          tone="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />

      <ActionPrompt
        visible={Boolean(visibilityTarget)}
        title={visibilityTarget?.isHidden ? 'Unhide Note' : 'Hide Note'}
        message={
          visibilityTarget
            ? visibilityTarget.isHidden
              ? `Make "${visibilityTarget.title}" visible to others?`
              : `Hide "${visibilityTarget.title}" from others?`
            : ''
        }
        confirmText={visibilityTarget?.isHidden ? 'Unhide' : 'Hide'}
        cancelText="Cancel"
        tone="primary"
        onCancel={() => setVisibilityTarget(null)}
        onConfirm={handleToggleVisibility}
      />

      <Modal visible={Boolean(ratingTarget)} transparent animationType="fade" onRequestClose={() => setRatingTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate Note</Text>
            <Text style={styles.modalSub}>{ratingTarget?.title || ''}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity key={value} onPress={() => setSelectedRating(value)} style={styles.starButton}>
                  <Ionicons
                    name={selectedRating >= value ? 'star' : 'star-outline'}
                    size={30}
                    color={selectedRating >= value ? '#D9A84E' : '#B8B5AE'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRatingTarget(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={submitRating}>
                <Text style={styles.modalSaveText}>Save Rating</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  container: { flex: 1, paddingHorizontal: 16 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.backgroundTop },
  headerCard: {
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    ...theme.shadows.card,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  header: { fontSize: 24, fontWeight: '900', color: theme.colors.textPrimary },
  headerSub: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 12 },
  headerStats: { marginTop: 9, flexDirection: 'row', gap: 8 },
  statChip: {
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#D4E4F8',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: { color: theme.colors.primary, fontWeight: '900', fontSize: 12 },
  statLabel: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 11 },
  filterCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    ...theme.shadows.card,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterItem: { flex: 1 },
  searchWrap: {
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 6,
    paddingVertical: 6,
    color: theme.colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.inputBorder,
  },
  search: { flex: 1, color: theme.colors.textPrimary, paddingVertical: 6 },
  searchWebReset: {
    outlineStyle: 'none',
    outlineWidth: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  list: { paddingBottom: 86 },
  emptyWrap: { alignItems: 'center', marginTop: 30 },
  empty: { textAlign: 'center', color: theme.colors.textSecondary, marginTop: 8 },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.button,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.card,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.textPrimary },
  modalSub: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 12 },
  starsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 14 },
  starButton: { padding: 2 },
  modalActions: { flexDirection: 'row', gap: 8 },
  modalCancel: {
    flex: 1,
    backgroundColor: '#ECE7DE',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalSave: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalCancelText: { color: theme.colors.textPrimary, fontWeight: '700' },
  modalSaveText: { color: theme.colors.white, fontWeight: '800' },
});
