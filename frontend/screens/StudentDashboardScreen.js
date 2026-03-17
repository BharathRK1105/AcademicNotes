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
  ScrollView,
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
const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or Ads' },
  { value: 'inaccurate', label: 'Inaccurate Content' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'copyright', label: 'Copyright Issue' },
  { value: 'other', label: 'Other' },
];

export default function StudentDashboardScreen({ navigation }) {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [visibilityTarget, setVisibilityTarget] = useState(null);
  const [ratingTarget, setRatingTarget] = useState(null);
  const [bulkViewTarget, setBulkViewTarget] = useState(null);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState(null);
  const [bulkSelectedIds, setBulkSelectedIds] = useState(new Set());
  const [bulkVisibilityTarget, setBulkVisibilityTarget] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState(ALL_SEMESTERS[0]);
  const [departmentFilter, setDepartmentFilter] = useState(ALL_DEPARTMENTS[0]);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0].value);
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });
  const firstName = String(currentUser?.name || 'Student').split(' ')[0];
  const isAdmin = currentUser?.role === 'admin';
  const isOwnerOfFile = (file) => String(file?.userId?._id || file?.userId) === String(currentUser?.id);

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
      showNotification(nextHiddenState ? 'Note hidden from others. You and admin can still see it.' : 'Note is visible now.', 'success');
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Visibility update failed.'), 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteTarget) return;
    try {
      const files = Array.isArray(bulkDeleteTarget.files) ? bulkDeleteTarget.files : [];
      if (files.length === 0) {
        showNotification('No files to delete in this pack.', 'warning');
        setBulkDeleteTarget(null);
        return;
      }

      const results = await Promise.allSettled(
        files.map((file) =>
          isAdmin ? notesService.deleteAnyNoteAsAdmin(file._id) : notesService.deleteMyNote(file._id)
        )
      );
      const failed = results.filter((item) => item.status === 'rejected').length;
      const deleted = results.length - failed;

      if (failed > 0) {
        showNotification(`Deleted ${deleted} file(s). ${failed} failed.`, 'warning');
      } else {
        showNotification('Bulk pack deleted.', 'success');
      }

      setBulkDeleteTarget(null);
      setBulkViewTarget(null);
      await loadNotes();
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to delete bulk files.'), 'error');
    }
  };

  const handleBulkVisibility = async () => {
    if (!bulkVisibilityTarget) return;
    try {
      const files = Array.isArray(bulkVisibilityTarget.files) ? bulkVisibilityTarget.files : [];
      const eligibleFiles = isAdmin ? files : files.filter((file) => isOwnerOfFile(file));
      if (eligibleFiles.length === 0) {
        showNotification('No owned files to update in this pack.', 'warning');
        setBulkVisibilityTarget(null);
        return;
      }
      const allHidden = eligibleFiles.every((file) => file.isHidden);
      const nextHiddenState = !allHidden;
      const results = await Promise.allSettled(
        eligibleFiles.map((file) =>
          isAdmin
            ? notesService.toggleAnyNoteVisibilityAsAdmin(file._id, nextHiddenState)
            : notesService.toggleMyNoteVisibility(file._id, nextHiddenState)
        )
      );
      const failed = results.filter((item) => item.status === 'rejected').length;
      const updated = results.length - failed;
      if (failed > 0) {
        showNotification(`Updated ${updated} file(s). ${failed} failed.`, 'warning');
      } else {
        showNotification(nextHiddenState ? 'Pack hidden.' : 'Pack unhidden.', 'success');
      }
      if (bulkViewTarget?.bulkGroupId === bulkVisibilityTarget?.bulkGroupId) {
        const updatedIds = new Set(eligibleFiles.map((file) => file._id));
        setBulkViewTarget((prev) => {
          if (!prev) return prev;
          const nextFiles = (prev.files || []).map((file) =>
            updatedIds.has(file._id) ? { ...file, isHidden: nextHiddenState } : file
          );
          return { ...prev, files: nextFiles };
        });
      }
      setBulkVisibilityTarget(null);
      await loadNotes();
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to update pack visibility.'), 'error');
    }
  };

  const openRateModal = (note) => {
    setRatingTarget(note);
    setSelectedRating(Number(note.myRating || 0));
  };

  const handleRatePress = (note) => {
    if (note?.isHidden) {
      showNotification('This note is hidden and cannot be rated.', 'error');
      return;
    }
    openRateModal(note);
  };

  const handleReportPress = (note) => {
    if (isOwnerOfFile(note)) {
      showNotification('You cannot report your own note.', 'warning');
      return;
    }
    setReportTarget(note);
    setReportReason(REPORT_REASONS[0].value);
    setReportDetails('');
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    if (!reportReason) {
      showNotification('Please choose a reason for the report.', 'error');
      return;
    }
    setReportSubmitting(true);
    try {
      await notesService.reportNote(reportTarget._id, {
        reason: reportReason,
        details: reportDetails,
      });
      setReportTarget(null);
      setReportDetails('');
      showNotification('Report submitted. Thanks for helping us keep content clean.', 'success');
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to submit report.'), 'error');
    } finally {
      setReportSubmitting(false);
    }
  };

  const resetBulkSelection = () => setBulkSelectedIds(new Set());

  const toggleBulkSelection = (noteId) => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const selectAllOwnedInBulk = () => {
    const files = Array.isArray(bulkViewTarget?.files) ? bulkViewTarget.files : [];
    const eligibleIds = isAdmin ? files.map((file) => file._id) : files.filter(isOwnerOfFile).map((file) => file._id);
    setBulkSelectedIds(new Set(eligibleIds));
  };

  const getSelectedOwnedBulkFiles = () => {
    const files = Array.isArray(bulkViewTarget?.files) ? bulkViewTarget.files : [];
    return files.filter((file) => bulkSelectedIds.has(file._id) && (isAdmin || isOwnerOfFile(file)));
  };

  const handleBulkDeleteSelected = async () => {
    const selected = getSelectedOwnedBulkFiles();
    if (selected.length === 0) {
      showNotification('Select your files to delete.', 'warning');
      return;
    }
    try {
      const results = await Promise.allSettled(
        selected.map((file) =>
          isAdmin ? notesService.deleteAnyNoteAsAdmin(file._id) : notesService.deleteMyNote(file._id)
        )
      );
      const failed = results.filter((item) => item.status === 'rejected').length;
      const deleted = results.length - failed;
      if (failed > 0) {
        showNotification(`Deleted ${deleted} file(s). ${failed} failed.`, 'warning');
      } else {
        showNotification('Selected files deleted.', 'success');
      }
      resetBulkSelection();
      await loadNotes();
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to delete selected files.'), 'error');
    }
  };

  const handleBulkHideSelected = async () => {
    const selected = getSelectedOwnedBulkFiles();
    if (selected.length === 0) {
      showNotification('Select your files to update visibility.', 'warning');
      return;
    }
    const allHidden = selected.every((file) => file.isHidden);
    const nextHiddenState = !allHidden;
    try {
      const results = await Promise.allSettled(
        selected.map((file) =>
          isAdmin
            ? notesService.toggleAnyNoteVisibilityAsAdmin(file._id, nextHiddenState)
            : notesService.toggleMyNoteVisibility(file._id, nextHiddenState)
        )
      );
      const failed = results.filter((item) => item.status === 'rejected').length;
      const updated = results.length - failed;
      if (failed > 0) {
        showNotification(`Updated ${updated} file(s). ${failed} failed.`, 'warning');
      } else {
        showNotification(nextHiddenState ? 'Selected files hidden.' : 'Selected files unhidden.', 'success');
      }
      const selectedIds = new Set(selected.map((file) => file._id));
      setBulkViewTarget((prev) => {
        if (!prev) return prev;
        const nextFiles = (prev.files || []).map((file) =>
          selectedIds.has(file._id) ? { ...file, isHidden: nextHiddenState } : file
        );
        return { ...prev, files: nextFiles };
      });
      resetBulkSelection();
      await loadNotes();
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to update visibility.'), 'error');
    }
  };

  const getBulkVisibilityFiles = (target) => {
    const files = Array.isArray(target?.files) ? target.files : [];
    return isAdmin ? files : files.filter((file) => isOwnerOfFile(file));
  };

  const handleToggleBookmark = async (note) => {
    try {
      await notesService.toggleSaveNote(note._id);
      await loadNotes();
      showNotification(note.isSavedByMe ? 'Removed from saved notes.' : 'Saved to your notes.', 'success');
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to update saved notes.'), 'error');
    }
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
    const source = viewMode === 'saved' ? notes.filter((item) => item.isSavedByMe) : notes;
    return source.filter((item) => {
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
  }, [notes, searchTerm, semesterFilter, departmentFilter, viewMode]);

  const groupedDisplayItems = useMemo(() => {
    try {
      const source = Array.isArray(filteredNotes) ? filteredNotes : [];
      const groups = new Map();
      const singles = [];

      for (const item of source) {
        if (!item || typeof item !== 'object') {
          continue;
        }
        if (item.bulkGroupId) {
          const key = item.bulkGroupId;
          if (!groups.has(key)) {
            groups.set(key, {
              __type: 'bulk_group',
              _id: `bulk-${key}`,
              bulkGroupId: key,
              bulkTitle: item.bulkTitle || 'Bulk Upload Pack',
              files: [],
              semester: item.semester || '',
              subject: item.subject || '',
              createdAt: item.createdAt || new Date().toISOString(),
              uploadedBy: item.userId?.name || 'Unknown',
            });
          }
          const group = groups.get(key);
          group.files.push(item);
          if (new Date(item.createdAt || 0) > new Date(group.createdAt || 0)) {
            group.createdAt = item.createdAt;
          }
        } else {
          singles.push(item);
        }
      }

      const grouped = Array.from(groups.values()).map((group) => ({
        ...group,
        files: (group.files || [])
          .slice()
          .sort((a, b) => Number(a?.bulkItemOrder || 0) - Number(b?.bulkItemOrder || 0)),
      }));

      return [...grouped, ...singles].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
    } catch (_error) {
      return Array.isArray(filteredNotes) ? filteredNotes : [];
    }
  }, [filteredNotes]);

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

  try {
    return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <LinearGradient colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]} style={styles.container}>
        <View pointerEvents="none" style={styles.bgOrbOne} />
        <View pointerEvents="none" style={styles.bgOrbTwo} />

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.greet}>Hi, {firstName}</Text>
              <Text style={styles.header}>Explore Your Notes Hub</Text>
              <Text style={styles.headerSub}>Search faster, save smarter, and keep your study flow organized.</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="library-outline" size={20} color={theme.colors.primary} />
            </View>
          </View>

          <View style={styles.headerStats}>
            <View style={styles.statChip}>
              <Ionicons name="albums-outline" size={13} color={theme.colors.primary} />
              <Text style={styles.statValue}>{filteredNotes.length}</Text>
              <Text style={styles.statLabel}>{viewMode === 'saved' ? 'Showing' : 'Visible'}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="folder-open-outline" size={13} color={theme.colors.primary} />
              <Text style={styles.statValue}>{notes.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="bookmark-outline" size={13} color={theme.colors.primary} />
              <Text style={styles.statValue}>{notes.filter((item) => item.isSavedByMe).length}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>
        </View>

        <View style={styles.toolbarCard}>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[styles.segmentBtn, viewMode === 'all' && styles.segmentActive]}
              onPress={() => setViewMode('all')}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, viewMode === 'all' && styles.segmentTextActive]}>All Notes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, viewMode === 'saved' && styles.segmentSavedActive]}
              onPress={() => setViewMode('saved')}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, viewMode === 'saved' && styles.segmentSavedTextActive]}>Saved Notes</Text>
            </TouchableOpacity>
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

          <View style={styles.filterCard}>
            <Text style={styles.filterTitle}>Filters</Text>
            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <StyledSelect value={departmentFilter} options={ALL_DEPARTMENTS} placeholder="Department" onChange={setDepartmentFilter} />
              </View>
              <View style={styles.filterItem}>
                <StyledSelect value={semesterFilter} options={ALL_SEMESTERS} placeholder="Semester" onChange={setSemesterFilter} />
              </View>
            </View>
          </View>
        </View>

        <FlatList
          data={groupedDisplayItems}
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
            if (item.__type === 'bulk_group') {
              const ownedFiles = (item.files || []).filter((file) => isOwnerOfFile(file));
              const canDeleteBulk = isAdmin || (ownedFiles.length > 0 && ownedFiles.length === (item.files || []).length);
              const canHideBulk = isAdmin || ownedFiles.length > 0;
              const visibilityFiles = isAdmin ? item.files || [] : ownedFiles;
              const allOwnedHidden = visibilityFiles.length > 0 && visibilityFiles.every((file) => file.isHidden);
              return (
                <View style={styles.bulkCard}>
                  <View style={styles.bulkHeader}>
                    <View style={styles.bulkIconWrap}>
                      <Ionicons name="folder-open-outline" size={18} color={theme.colors.primary} />
                    </View>
                    <View style={styles.bulkHeadText}>
                      <Text style={styles.bulkTitle}>{item.bulkTitle}</Text>
                      <Text style={styles.bulkSub}>
                        {item.subject} - {item.semester} - {item.files.length} files
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bulkActions}>
                    <TouchableOpacity
                      style={styles.bulkOpenBtn}
                      onPress={() => {
                        resetBulkSelection();
                        setBulkViewTarget(item);
                      }}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="eye-outline" size={16} color={theme.colors.white} />
                      <Text style={styles.bulkOpenBtnText} numberOfLines={1}>View Files</Text>
                    </TouchableOpacity>
                    {canHideBulk ? (
                      <TouchableOpacity
                        style={styles.bulkHideBtn}
                        onPress={() => setBulkVisibilityTarget({ ...item })}
                        activeOpacity={0.9}
                      >
                        <Ionicons
                          name={allOwnedHidden ? 'eye-outline' : 'eye-off-outline'}
                          size={16}
                          color="#8C6A2D"
                        />
                        <Text style={styles.bulkHideText} numberOfLines={1}>
                          {allOwnedHidden ? 'Unhide Pack' : 'Hide Pack'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {canDeleteBulk ? (
                      <TouchableOpacity
                        style={styles.bulkDeleteBtn}
                        onPress={() => setBulkDeleteTarget(item)}
                        activeOpacity={0.9}
                      >
                        <Ionicons name="trash-outline" size={16} color={theme.colors.logout} />
                        <Text style={styles.bulkDeleteText} numberOfLines={1}>
                          Delete Pack
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            }

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
                onRate={() => handleRatePress(item)}
                onReport={() => handleReportPress(item)}
                onToggleBookmark={() => handleToggleBookmark(item)}
                isBookmarked={Boolean(item.isSavedByMe)}
                onToggleVisibility={() => setVisibilityTarget(item)}
                showVisibilityToggle={!(item.isHidden && item.hiddenBy === 'admin')}
                isOwner={canDelete}
                canDelete={canDelete}
                showDelete
                showEdit={false}
                statusLabel={item.isHidden ? (item.hiddenBy === 'admin' ? 'Hidden by Admin' : 'Hidden') : undefined}
                averageRating={item.averageRating || 0}
                ratingsCount={item.ratingsCount || 0}
                trustScore={item.trustScore || 0}
                trustTier={item.trustTier || 'Low'}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="library-outline" size={48} color="#9E8D62" />
              <Text style={styles.empty}>{viewMode === 'saved' ? 'No saved notes yet.' : 'No notes found.'}</Text>
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
          visible={Boolean(bulkVisibilityTarget)}
          title={
            bulkVisibilityTarget &&
            getBulkVisibilityFiles(bulkVisibilityTarget).every((file) => file.isHidden)
              ? 'Unhide Bulk Pack'
              : 'Hide Bulk Pack'
          }
          message={
            bulkVisibilityTarget
              ? `${
                  getBulkVisibilityFiles(bulkVisibilityTarget).every((file) => file.isHidden)
                    ? 'Unhide'
                    : 'Hide'
                } all files in "${bulkVisibilityTarget.bulkTitle || 'Bulk Upload Pack'}"?`
              : ''
          }
          confirmText={
            bulkVisibilityTarget &&
            getBulkVisibilityFiles(bulkVisibilityTarget).every((file) => file.isHidden)
              ? 'Unhide All'
              : 'Hide All'
          }
          cancelText="Cancel"
          tone="primary"
          onCancel={() => setBulkVisibilityTarget(null)}
          onConfirm={handleBulkVisibility}
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

      <Modal visible={Boolean(reportTarget)} transparent animationType="fade" onRequestClose={() => setReportTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report Note</Text>
            <Text style={styles.modalSub}>{reportTarget?.title || ''}</Text>
            <Text style={styles.modalHint}>Choose a reason</Text>
            <View style={styles.reportReasonRow}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reportReasonChip,
                    reportReason === reason.value && styles.reportReasonChipActive,
                  ]}
                  onPress={() => setReportReason(reason.value)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.reportReasonText,
                      reportReason === reason.value && styles.reportReasonTextActive,
                    ]}
                  >
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalHint}>Optional details</Text>
            <TextInput
              style={[styles.input, styles.reportDetails]}
              placeholder="Tell us what is wrong with this note (optional)"
              placeholderTextColor="#9A9487"
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setReportTarget(null)} disabled={reportSubmitting}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={submitReport} disabled={reportSubmitting}>
                <Text style={styles.modalSaveText}>{reportSubmitting ? 'Submitting...' : 'Submit Report'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(bulkViewTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setBulkViewTarget(null);
          resetBulkSelection();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{bulkViewTarget?.bulkTitle || 'Bulk Upload Pack'}</Text>
            <Text style={styles.modalSub}>All uploaded files in this pack</Text>
            <ScrollView style={styles.bulkFilesList} contentContainerStyle={styles.bulkFilesListContent}>
              {(bulkViewTarget?.files || []).map((fileItem) => (
                <View key={fileItem._id} style={styles.bulkFileRow}>
                  <TouchableOpacity
                    style={styles.bulkSelectBox}
                    onPress={() => toggleBulkSelection(fileItem._id)}
                    disabled={!isAdmin && !isOwnerOfFile(fileItem)}
                  >
                    <Ionicons
                      name={
                        bulkSelectedIds.has(fileItem._id)
                          ? 'checkbox'
                          : isAdmin || isOwnerOfFile(fileItem)
                          ? 'square-outline'
                          : 'lock-closed-outline'
                      }
                      size={18}
                      color={
                        isAdmin || isOwnerOfFile(fileItem)
                          ? theme.colors.primary
                          : '#9AAABF'
                      }
                    />
                  </TouchableOpacity>
                  <View style={styles.bulkFileTextWrap}>
                    <Text style={styles.bulkFileTitle} numberOfLines={1}>
                      {fileItem.title}
                    </Text>
                    <Text style={styles.bulkFileMeta} numberOfLines={1}>
                      {fileItem.fileName}
                    </Text>
                  </View>
                  {fileItem?.isHidden && (isAdmin || isOwnerOfFile(fileItem)) ? (
                    <View style={styles.bulkHiddenBadge}>
                      <Ionicons name="eye-off-outline" size={14} color="#8C6A2D" />
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={styles.bulkFileDownload}
                    onPress={() => notesService.openNoteFile(fileItem)}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="download-outline" size={14} color={theme.colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            {(isAdmin || (bulkViewTarget?.files || []).some((file) => isOwnerOfFile(file))) ? (
              <>
                <View style={styles.bulkSelectionActions}>
                  <TouchableOpacity style={styles.bulkSelectBtn} onPress={selectAllOwnedInBulk}>
                    <Text style={styles.bulkSelectBtnText}>{isAdmin ? 'Select All' : 'Select Mine'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bulkSelectBtn} onPress={resetBulkSelection}>
                    <Text style={styles.bulkSelectBtnText}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.bulkSelectionActions}>
                  <TouchableOpacity style={styles.bulkDeleteModalBtn} onPress={handleBulkDeleteSelected}>
                    <Ionicons name="trash-outline" size={16} color={theme.colors.logout} />
                    <Text style={styles.bulkDeleteModalText}>Delete Selected</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bulkHideModalBtn} onPress={handleBulkHideSelected}>
                    <Ionicons
                      name={getSelectedOwnedBulkFiles().every((file) => file.isHidden) ? 'eye-outline' : 'eye-off-outline'}
                      size={16}
                      color="#8C6A2D"
                    />
                    <Text style={styles.bulkHideModalText}>
                      {getSelectedOwnedBulkFiles().length > 0 && getSelectedOwnedBulkFiles().every((file) => file.isHidden)
                        ? 'Unhide Selected'
                        : 'Hide Selected'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
            {(isAdmin || (bulkViewTarget?.files || []).every((file) => isOwnerOfFile(file))) ? (
              <TouchableOpacity style={styles.bulkDeleteModalBtn} onPress={() => setBulkDeleteTarget(bulkViewTarget)}>
                <Ionicons name="trash-outline" size={16} color={theme.colors.logout} />
                <Text style={styles.bulkDeleteModalText}>Delete Entire Pack</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.modalCancelSingle}
              onPress={() => {
                setBulkViewTarget(null);
                resetBulkSelection();
              }}
            >
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

        <ActionPrompt
          visible={Boolean(bulkDeleteTarget)}
          title="Delete Bulk Pack"
          message={
            bulkDeleteTarget
              ? `Delete all ${bulkDeleteTarget.files?.length || 0} file(s) in "${bulkDeleteTarget.bulkTitle || 'Bulk Upload Pack'}"?`
              : ''
          }
          confirmText="Delete All"
          cancelText="Cancel"
          tone="danger"
          onCancel={() => setBulkDeleteTarget(null)}
          onConfirm={handleBulkDelete}
        />

        <AppNotification
          visible={notification.visible}
          message={notification.message}
          type={notification.type}
          onHide={hideNotification}
        />
      </LinearGradient>
    </SafeAreaView>
    );
  } catch (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.crashWrap}>
          <Ionicons name="warning-outline" size={28} color={theme.colors.error} />
          <Text style={styles.crashTitle}>Dashboard failed to render</Text>
          <Text style={styles.crashText}>{error?.message || 'Unexpected UI error'}</Text>
          <TouchableOpacity style={styles.crashBtn} onPress={loadNotes} activeOpacity={0.9}>
            <Text style={styles.crashBtnText}>Reload Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.backgroundTop },
  container: { flex: 1, paddingHorizontal: 16 },
  bgOrbOne: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    top: -60,
    right: -80,
    backgroundColor: 'rgba(95,168,255,0.16)',
  },
  bgOrbTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: 60,
    left: -70,
    backgroundColor: 'rgba(217,168,78,0.12)',
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.backgroundTop },
  heroCard: {
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadows.card,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#D4E4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greet: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
  header: { marginTop: 2, fontSize: 22, fontWeight: '900', color: theme.colors.textPrimary },
  headerSub: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 12, maxWidth: 280 },
  headerStats: { marginTop: 9, flexDirection: 'row', gap: 6 },
  statChip: {
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#D4E4F8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: { color: theme.colors.primary, fontWeight: '900', fontSize: 12 },
  statLabel: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 11 },
  toolbarCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    ...theme.shadows.card,
    marginBottom: 8,
  },
  filterCard: {
    marginTop: 2,
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
    marginTop: 8,
    marginBottom: 8,
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
  segmentRow: {
    flexDirection: 'row',
    marginBottom: 2,
    backgroundColor: '#EDF3FB',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#D2E0F2',
  },
  segmentBtn: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  segmentActive: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: '#D7E6F8' },
  segmentSavedActive: { backgroundColor: '#EAF9EF', borderWidth: 1, borderColor: '#A9DDBB' },
  segmentText: { color: theme.colors.textSecondary, fontWeight: '700' },
  segmentTextActive: { color: theme.colors.primary },
  segmentSavedTextActive: { color: '#0F6F3A', fontWeight: '800' },
  list: { paddingBottom: 86 },
  bulkCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  bulkHeader: { flexDirection: 'row', alignItems: 'center' },
  bulkIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#D4E4F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bulkHeadText: { flex: 1 },
  bulkTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.textPrimary },
  bulkSub: { marginTop: 3, fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' },
  bulkOpenBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    minHeight: 38,
  },
  bulkOpenBtnText: { color: theme.colors.white, fontWeight: '800' },
  bulkActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  bulkHideBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    minHeight: 38,
    borderWidth: 1,
    borderColor: '#E6C68A',
    backgroundColor: '#FFF7E8',
  },
  bulkHideText: {
    color: '#8C6A2D',
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'center',
  },
  bulkDeleteBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    minHeight: 38,
    borderWidth: 1,
    borderColor: '#F0B6B6',
    backgroundColor: '#FFF2F2',
  },
  bulkDeleteDisabled: {
    borderColor: '#D9DFE7',
    backgroundColor: '#F4F6F9',
  },
  bulkDeleteText: {
    color: theme.colors.logout,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'center',
  },
  bulkDeleteTextDisabled: {
    color: '#9AAABF',
  },
  bulkDeleteModalBtn: {
    marginTop: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F0B6B6',
    backgroundColor: '#FFF2F2',
  },
  bulkDeleteModalText: {
    color: theme.colors.logout,
    fontWeight: '800',
  },
  bulkSelectionActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  bulkSelectBox: {
    marginRight: 8,
  },
  bulkSelectBtn: {
    borderWidth: 1,
    borderColor: '#D7E2F1',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FBFF',
  },
  bulkSelectBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: '800',
    fontSize: 12,
  },
  bulkHideModalBtn: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E6C68A',
    backgroundColor: '#FFF7E8',
  },
  bulkHideModalText: {
    color: '#8C6A2D',
    fontWeight: '800',
  },
  emptyWrap: { alignItems: 'center', marginTop: 30 },
  empty: { textAlign: 'center', color: theme.colors.textSecondary, marginTop: 8 },
  crashWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  crashTitle: { marginTop: 8, fontSize: 17, fontWeight: '900', color: theme.colors.textPrimary },
  crashText: { marginTop: 6, color: theme.colors.textSecondary, textAlign: 'center' },
  crashBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  crashBtnText: { color: theme.colors.white, fontWeight: '800' },
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
  modalHint: { marginTop: 10, color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
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
  modalCancelSingle: {
    marginTop: 10,
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
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
  },
  reportReasonRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportReasonChip: {
    borderWidth: 1,
    borderColor: '#D7E2F1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FBFF',
  },
  reportReasonChipActive: {
    borderColor: '#A9DDBB',
    backgroundColor: '#EAF9EF',
  },
  reportReasonText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textSecondary,
  },
  reportReasonTextActive: {
    color: '#0F6F3A',
  },
  reportDetails: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  bulkFilesList: { marginTop: 10, maxHeight: 300 },
  bulkFilesListContent: { gap: 8 },
  bulkFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#FCFEFF',
  },
  bulkFileTextWrap: { flex: 1, paddingRight: 8 },
  bulkFileTitle: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: 13 },
  bulkFileMeta: { marginTop: 2, color: theme.colors.textSecondary, fontSize: 11 },
  bulkHiddenBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#E6C68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bulkFileDownload: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { color: theme.colors.textPrimary, fontWeight: '700' },
  modalSaveText: { color: theme.colors.white, fontWeight: '800' },
});
