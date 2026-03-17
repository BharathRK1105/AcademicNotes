import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import RoleGuard from '../navigation/RoleGuard';
import ActionPrompt from '../components/ActionPrompt';
import AppNotification from '../components/AppNotification';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../utils/constants';
import { adminService } from '../services/adminService';
import { notesService } from '../services/notesService';
import { getApiErrorMessage } from '../services/api';
import { theme } from '../theme';

export default function AdminDashboardScreen({ route }) {
  return (
    <RoleGuard allowedRoles={[USER_ROLES.ADMIN]}>
      <AdminDashboardContent route={route} />
    </RoleGuard>
  );
}

function AdminDashboardContent({ route }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [notes, setNotes] = useState([]);
  const [reports, setReports] = useState([]);
  const initialPanel =
    route?.params?.panel === 'users' ? 'users' : route?.params?.panel === 'reports' ? 'reports' : 'notes';
  const [activePanel, setActivePanel] = useState(initialPanel);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [bulkViewTarget, setBulkViewTarget] = useState(null);
  const [bulkSelectedIds, setBulkSelectedIds] = useState(new Set());
  const [bulkPackAction, setBulkPackAction] = useState(null);
  const [reportAction, setReportAction] = useState(null);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });

  const showNotification = (message, type = 'info') => setNotification({ visible: true, message, type });
  const hideNotification = () => setNotification((prev) => ({ ...prev, visible: false }));

  const loadData = useCallback(async () => {
    try {
      const [usersData, notesData, reportsData] = await Promise.all([
        adminService.getUsers(),
        notesService.getAllNotesAsAdmin(),
        adminService.getReports(),
      ]);
      setUsers(usersData);
      setNotes(notesData);
      setReports(reportsData);
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to load admin data.'), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const summary = useMemo(
    () => ({
      totalUsers: users.length,
      totalStudents: users.filter((item) => item.role === 'student').length,
      activeUsers: users.filter((item) => !item.isBlocked).length,
      totalNotes: notes.length,
      openReports: reports.filter((item) => item.status === 'open').length,
      autoHiddenNotes: notes.filter((item) => item.autoHiddenByReports).length,
    }),
    [notes.length, reports, users]
  );

  const notesList = useMemo(() => {
    const mode = route?.params?.panel;
    if (mode === 'hidden-notes') {
      return notes.filter((item) => item.isHidden);
    }
    return notes;
  }, [notes, route?.params?.panel]);

  const groupedNotes = useMemo(() => {
    try {
      const source = Array.isArray(notesList) ? notesList : [];
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
      return Array.isArray(notesList) ? notesList : [];
    }
  }, [notesList]);

  const reportsList = useMemo(() => {
    const source = Array.isArray(reports) ? reports.slice() : [];
    return source.sort((a, b) => {
      const aOpen = a.status === 'open';
      const bOpen = b.status === 'open';
      if (aOpen !== bOpen) {
        return aOpen ? -1 : 1;
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [reports]);

  useEffect(() => {
    if (route?.params?.panel === 'users') {
      setActivePanel('users');
    } else if (route?.params?.panel === 'reports') {
      setActivePanel('reports');
    } else {
      setActivePanel('notes');
    }
  }, [route?.params?.panel]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !deleteType) return;
    try {
      if (deleteType === 'user') {
        await adminService.deleteUser(deleteTarget._id);
        showNotification('User deleted.', 'success');
      } else {
        await notesService.deleteAnyNoteAsAdmin(deleteTarget._id);
        showNotification('Note deleted.', 'success');
      }
      setDeleteTarget(null);
      setDeleteType(null);
      await loadData();
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Delete failed.'), 'error');
    }
  };

  const handleToggleBlock = async (targetUser) => {
    try {
      const nextBlockedState = !targetUser.isBlocked;
      await adminService.blockUser(targetUser._id, nextBlockedState);
      await loadData();
      showNotification(nextBlockedState ? 'User blocked.' : 'User unblocked.', 'success');
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to update user status.'), 'error');
    }
  };

  const handleToggleNoteVisibility = async (note) => {
    try {
      await notesService.toggleAnyNoteVisibilityAsAdmin(note._id, !note.isHidden);
      await loadData();
      showNotification(note.isHidden ? 'Note unhidden.' : 'Note hidden.', 'success');
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to update note visibility.'), 'error');
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

  const selectAllBulk = () => {
    const files = Array.isArray(bulkViewTarget?.files) ? bulkViewTarget.files : [];
    setBulkSelectedIds(new Set(files.map((file) => file._id)));
  };

  const getSelectedBulkFiles = () => {
    const files = Array.isArray(bulkViewTarget?.files) ? bulkViewTarget.files : [];
    return files.filter((file) => bulkSelectedIds.has(file._id));
  };

  const handleBulkDeleteSelected = async () => {
    const selected = getSelectedBulkFiles();
    if (selected.length === 0) {
      showNotification('Select files to delete.', 'warning');
      return;
    }
    try {
      const results = await Promise.allSettled(selected.map((file) => notesService.deleteAnyNoteAsAdmin(file._id)));
      const failed = results.filter((item) => item.status === 'rejected').length;
      const deleted = results.length - failed;
      if (failed > 0) {
        showNotification(`Deleted ${deleted} file(s). ${failed} failed.`, 'warning');
      } else {
        showNotification('Selected files deleted.', 'success');
      }
      resetBulkSelection();
      await loadData();
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to delete selected files.'), 'error');
    }
  };

  const handleBulkHideSelected = async () => {
    const selected = getSelectedBulkFiles();
    if (selected.length === 0) {
      showNotification('Select files to update visibility.', 'warning');
      return;
    }
    const allHidden = selected.every((file) => file.isHidden);
    const nextHiddenState = !allHidden;
    try {
      const results = await Promise.allSettled(
        selected.map((file) => notesService.toggleAnyNoteVisibilityAsAdmin(file._id, nextHiddenState))
      );
      const failed = results.filter((item) => item.status === 'rejected').length;
      const updated = results.length - failed;
      if (failed > 0) {
        showNotification(`Updated ${updated} file(s). ${failed} failed.`, 'warning');
      } else {
        showNotification(nextHiddenState ? 'Selected files hidden.' : 'Selected files unhidden.', 'success');
      }
      resetBulkSelection();
      await loadData();
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to update visibility.'), 'error');
    }
  };

  const handleBulkPackAction = async () => {
    if (!bulkPackAction?.pack || !bulkPackAction?.type) return;
    const files = Array.isArray(bulkPackAction.pack.files) ? bulkPackAction.pack.files : [];
    if (files.length === 0) {
      showNotification('No files in this pack.', 'warning');
      setBulkPackAction(null);
      return;
    }
    try {
      if (bulkPackAction.type === 'delete') {
        const results = await Promise.allSettled(files.map((file) => notesService.deleteAnyNoteAsAdmin(file._id)));
        const failed = results.filter((item) => item.status === 'rejected').length;
        const deleted = results.length - failed;
        if (failed > 0) {
          showNotification(`Deleted ${deleted} file(s). ${failed} failed.`, 'warning');
        } else {
          showNotification('Bulk pack deleted.', 'success');
        }
      } else if (bulkPackAction.type === 'hide') {
        await Promise.allSettled(files.map((file) => notesService.toggleAnyNoteVisibilityAsAdmin(file._id, true)));
        showNotification('Bulk pack hidden.', 'success');
      } else if (bulkPackAction.type === 'unhide') {
        await Promise.allSettled(files.map((file) => notesService.toggleAnyNoteVisibilityAsAdmin(file._id, false)));
        showNotification('Bulk pack unhidden.', 'success');
      }
      setBulkPackAction(null);
      await loadData();
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to update bulk pack.'), 'error');
    }
  };

  const handleResolveReport = async () => {
    if (!reportAction?.report || !reportAction?.action) return;
    try {
      const response = await adminService.resolveReport(reportAction.report._id, reportAction.action);
      const removedCount = response?.linkedReportsRemoved || 0;
      const baseLabel =
        reportAction.action === 'hide'
          ? 'Report resolved. Note hidden.'
          : reportAction.action === 'delete'
          ? 'Report resolved. Note deleted.'
          : 'Report dismissed.';
      const extra =
        reportAction.action === 'delete' && removedCount > 0
          ? ` ${removedCount} linked report(s) removed.`
          : '';
      showNotification(`${baseLabel}${extra}`, reportAction.action === 'dismiss' ? 'info' : 'success');
      setReportAction(null);
      await loadData();
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to resolve report.'), 'error');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.adminAccent} />
        </View>
      </SafeAreaView>
    );
  }

  const renderUser = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.meta}>{item.email}</Text>
      <Text style={styles.meta}>Role: {item.role}</Text>
      <Text style={styles.meta}>Status: {item.isBlocked ? 'Blocked' : 'Active'}</Text>
      {item._id !== user?.id ? (
        <View style={styles.userActions}>
          <TouchableOpacity
            style={[styles.blockButton, item.isBlocked && styles.unblockButton]}
            onPress={() => handleToggleBlock(item)}
            activeOpacity={0.88}
          >
            <Ionicons name={item.isBlocked ? 'lock-open-outline' : 'ban-outline'} size={16} color={theme.colors.white} />
            <Text style={styles.deleteText}>{item.isBlocked ? 'Unblock User' : 'Block User'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              setDeleteTarget(item);
              setDeleteType('user');
            }}
            activeOpacity={0.88}
          >
            <Ionicons name="trash-outline" size={16} color={theme.colors.white} />
            <Text style={styles.deleteText}>Delete User</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.selfBadge}>
          <Text style={styles.selfBadgeText}>Current Admin</Text>
        </View>
      )}
    </View>
  );

  const renderNote = ({ item }) => {
    if (item.__type === 'bulk_group') {
      const allHidden = (item.files || []).length > 0 && item.files.every((file) => file.isHidden);
      return (
        <View style={styles.card}>
          <Text style={styles.title}>{item.bulkTitle}</Text>
          <Text style={styles.meta}>
            {item.subject} - {item.semester} - {item.files.length} files
          </Text>
          <Text style={styles.meta}>By: {item.uploadedBy}</Text>
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => {
                resetBulkSelection();
                setBulkViewTarget(item);
              }}
              activeOpacity={0.88}
            >
              <Ionicons name="eye-outline" size={16} color={theme.colors.white} />
              <Text style={styles.deleteText}>View Files</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewButton, styles.hideButton]}
              onPress={() => setBulkPackAction({ type: allHidden ? 'unhide' : 'hide', pack: item })}
              activeOpacity={0.88}
            >
              <Ionicons name={allHidden ? 'eye-outline' : 'eye-off-outline'} size={16} color={theme.colors.white} />
              <Text style={styles.deleteText}>{allHidden ? 'Unhide Pack' : 'Hide Pack'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => setBulkPackAction({ type: 'delete', pack: item })}
              activeOpacity={0.88}
            >
              <Ionicons name="trash-outline" size={16} color={theme.colors.white} />
              <Text style={styles.deleteText}>Delete Pack</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta} numberOfLines={3}>
          {item.description || 'No description'}
        </Text>
        <Text style={styles.meta}>By: {item.userId?.name || 'Unknown'}</Text>
        <Text style={styles.meta}>File: {item.fileName}</Text>
        <Text style={styles.meta}>Visibility: {item.isHidden ? 'Hidden' : 'Visible'}</Text>
        <TouchableOpacity
          style={[styles.viewButton, styles.hideButton]}
          onPress={() => handleToggleNoteVisibility(item)}
          activeOpacity={0.88}
        >
          <Ionicons name={item.isHidden ? 'eye-outline' : 'eye-off-outline'} size={16} color={theme.colors.white} />
          <Text style={styles.deleteText}>{item.isHidden ? 'Unhide Note' : 'Hide Note'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewButton} onPress={() => notesService.openNoteFile(item)} activeOpacity={0.88}>
          <Ionicons name="open-outline" size={16} color={theme.colors.white} />
          <Text style={styles.deleteText}>Open File</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            setDeleteTarget(item);
            setDeleteType('note');
          }}
          activeOpacity={0.88}
        >
          <Ionicons name="trash-outline" size={16} color={theme.colors.white} />
          <Text style={styles.deleteText}>Delete Note</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderReport = ({ item }) => {
    const note = item.noteId;
    const reporter = item.reportedBy;
    const noteTitle = note?.title || item.noteTitle || 'Unknown note';
    const noteOwner = note?.userId?.name || item.noteOwnerName || 'Unknown';
    const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A';
    const statusLabel = item.status === 'open' ? 'Open' : item.status === 'dismissed' ? 'Dismissed' : 'Resolved';
    const canAct = item.status === 'open';
    const noteHidden = Boolean(note?.isHidden);
    const autoHidden = Boolean(note?.autoHiddenByReports);

    return (
      <View style={styles.card}>
        <View style={styles.reportHeader}>
          <Text style={styles.title}>{noteTitle}</Text>
          <View style={styles.reportHeaderBadges}>
            {autoHidden ? (
              <View style={[styles.reportStatus, styles.reportAuto]}>
                <Text style={styles.reportStatusText}>Auto-Hidden</Text>
              </View>
            ) : null}
            <View
              style={[
                styles.reportStatus,
                item.status === 'open' ? styles.reportOpen : item.status === 'dismissed' ? styles.reportDismissed : styles.reportResolved,
              ]}
            >
              <Text style={styles.reportStatusText}>{statusLabel}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.meta}>Reported by: {reporter?.name || 'Unknown'} ({reporter?.email || 'N/A'})</Text>
        <Text style={styles.meta}>Owner: {noteOwner}</Text>
        <Text style={styles.meta}>Reason: {(item.reason || 'other').replace('_', ' ')}</Text>
        {item.details ? <Text style={styles.meta}>Details: {item.details}</Text> : null}
        <Text style={styles.meta}>Reported at: {createdAt}</Text>

        {note ? (
          <View style={styles.reportNoteMeta}>
            <Text style={styles.reportNoteText}>
              {note.subject ? `${note.subject} - ` : ''}{note.semester || ''}{note.fileName ? ` | ${note.fileName}` : ''}
            </Text>
          </View>
        ) : (
          <Text style={styles.meta}>Note status: Deleted or unavailable</Text>
        )}

        <View style={styles.reportActions}>
          {note ? (
            <TouchableOpacity style={styles.viewButton} onPress={() => notesService.openNoteFile(note)} activeOpacity={0.88}>
              <Ionicons name="open-outline" size={16} color={theme.colors.white} />
              <Text style={styles.deleteText}>Open Note</Text>
            </TouchableOpacity>
          ) : null}
          {canAct && note && !noteHidden ? (
            <TouchableOpacity
              style={[styles.viewButton, styles.hideButton]}
              onPress={() => setReportAction({ action: 'hide', report: item })}
              activeOpacity={0.88}
            >
              <Ionicons name="eye-off-outline" size={16} color={theme.colors.white} />
              <Text style={styles.deleteText}>Hide Note</Text>
            </TouchableOpacity>
          ) : null}
          {canAct && note ? (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => setReportAction({ action: 'delete', report: item })}
              activeOpacity={0.88}
            >
              <Ionicons name="trash-outline" size={16} color={theme.colors.white} />
              <Text style={styles.deleteText}>Delete Note</Text>
            </TouchableOpacity>
          ) : null}
          {canAct ? (
            <TouchableOpacity
              style={[styles.viewButton, styles.dismissButton]}
              onPress={() => setReportAction({ action: 'dismiss', report: item })}
              activeOpacity={0.88}
            >
              <Ionicons name="close-circle-outline" size={16} color={theme.colors.white} />
              <Text style={styles.deleteText}>Dismiss</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View pointerEvents="none" style={styles.bgOrbOne} />
        <View pointerEvents="none" style={styles.bgOrbTwo} />

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.greet}>Control Center</Text>
              <Text style={styles.header}>Admin Command Hub</Text>
              <Text style={styles.headerSub}>Moderate users and content with a single operational view.</Text>
            </View>
            <TouchableOpacity style={styles.refreshChip} onPress={loadData} activeOpacity={0.85}>
              <Ionicons name="refresh" size={14} color={theme.colors.adminAccent} />
              <Text style={styles.refreshText}>Sync</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="Users" value={summary.totalUsers} icon="people-outline" />
          <SummaryCard label="Active" value={summary.activeUsers} icon="checkmark-circle-outline" />
          <SummaryCard label="Notes" value={summary.totalNotes} icon="albums-outline" />
          <SummaryCard label="Reports" value={summary.openReports} icon="flag-outline" />
        </View>

        {summary.autoHiddenNotes > 0 ? (
          <View style={styles.autoHiddenNotice}>
            <Ionicons name="warning-outline" size={16} color="#8C6A2D" />
            <Text style={styles.autoHiddenText}>
              {summary.autoHiddenNotes} note(s) auto-hidden after multiple reports.
            </Text>
            <TouchableOpacity style={styles.autoHiddenBtn} onPress={() => setActivePanel('reports')} activeOpacity={0.9}>
              <Text style={styles.autoHiddenBtnText}>Review</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, activePanel === 'notes' && styles.segmentActive]}
            onPress={() => setActivePanel('notes')}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, activePanel === 'notes' && styles.segmentTextActive]}>All Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, activePanel === 'users' && styles.segmentActive]}
            onPress={() => setActivePanel('users')}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, activePanel === 'users' && styles.segmentTextActive]}>All Users</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, activePanel === 'reports' && styles.segmentActive]}
            onPress={() => setActivePanel('reports')}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, activePanel === 'reports' && styles.segmentTextActive]}>Reports</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={activePanel === 'notes' ? groupedNotes : activePanel === 'users' ? users : reportsList}
          keyExtractor={(item) => item._id}
          renderItem={activePanel === 'notes' ? renderNote : activePanel === 'users' ? renderUser : renderReport}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.adminAccent]}
              tintColor={theme.colors.adminAccent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name={activePanel === 'users' ? 'people-outline' : activePanel === 'reports' ? 'flag-outline' : 'albums-outline'} size={46} color="#9CA3AF" />
              <Text style={styles.empty}>
                {activePanel === 'users' ? 'No users found.' : activePanel === 'reports' ? 'No reports found.' : 'No notes found.'}
              </Text>
            </View>
          }
        />

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
                    <TouchableOpacity style={styles.bulkSelectBox} onPress={() => toggleBulkSelection(fileItem._id)}>
                      <Ionicons
                        name={bulkSelectedIds.has(fileItem._id) ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={theme.colors.adminAccent}
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
              <View style={styles.bulkSelectionActions}>
                <TouchableOpacity style={styles.bulkSelectBtn} onPress={selectAllBulk}>
                  <Text style={styles.bulkSelectBtnText}>Select All</Text>
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
                    name={getSelectedBulkFiles().every((file) => file.isHidden) ? 'eye-outline' : 'eye-off-outline'}
                    size={16}
                    color="#8C6A2D"
                  />
                  <Text style={styles.bulkHideModalText}>
                    {getSelectedBulkFiles().length > 0 && getSelectedBulkFiles().every((file) => file.isHidden)
                      ? 'Unhide Selected'
                      : 'Hide Selected'}
                  </Text>
                </TouchableOpacity>
              </View>
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
          visible={Boolean(deleteTarget)}
          title={deleteType === 'user' ? 'Delete User' : 'Delete Note'}
          message={
            deleteTarget
              ? deleteType === 'user'
                ? `Delete user "${deleteTarget.name}" and their notes?`
                : `Delete note "${deleteTarget.title}"?`
              : ''
          }
          confirmText="Delete"
          cancelText="Cancel"
          tone="danger"
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteType(null);
          }}
          onConfirm={handleConfirmDelete}
        />

        <ActionPrompt
          visible={Boolean(bulkPackAction)}
          title={
            bulkPackAction?.type === 'delete'
              ? 'Delete Bulk Pack'
              : bulkPackAction?.type === 'hide'
              ? 'Hide Bulk Pack'
              : 'Unhide Bulk Pack'
          }
          message={
            bulkPackAction
              ? `${bulkPackAction.type === 'delete' ? 'Delete' : bulkPackAction.type === 'hide' ? 'Hide' : 'Unhide'} all ${
                  bulkPackAction.pack?.files?.length || 0
                } file(s) in "${bulkPackAction.pack?.bulkTitle || 'Bulk Upload Pack'}"?`
              : ''
          }
          confirmText={bulkPackAction?.type === 'delete' ? 'Delete All' : bulkPackAction?.type === 'hide' ? 'Hide All' : 'Unhide All'}
          cancelText="Cancel"
          tone={bulkPackAction?.type === 'delete' ? 'danger' : 'primary'}
          onCancel={() => setBulkPackAction(null)}
          onConfirm={handleBulkPackAction}
        />

        <ActionPrompt
          visible={Boolean(reportAction)}
          title={
            reportAction?.action === 'delete'
              ? 'Delete Reported Note'
              : reportAction?.action === 'hide'
              ? 'Hide Reported Note'
              : 'Dismiss Report'
          }
          message={
            reportAction
              ? reportAction.action === 'dismiss'
                ? 'Dismiss this report without taking action?'
                : `${reportAction.action === 'delete' ? 'Delete' : 'Hide'} "${
                    reportAction.report?.noteId?.title || reportAction.report?.noteTitle || 'this note'
                  }" and resolve the report?`
              : ''
          }
          confirmText={
            reportAction?.action === 'delete' ? 'Delete Note' : reportAction?.action === 'hide' ? 'Hide Note' : 'Dismiss'
          }
          cancelText="Cancel"
          tone={reportAction?.action === 'delete' ? 'danger' : 'primary'}
          onCancel={() => setReportAction(null)}
          onConfirm={handleResolveReport}
        />

        <AppNotification
          visible={notification.visible}
          message={notification.message}
          type={notification.type}
          onHide={hideNotification}
        />
      </View>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <View style={styles.summaryCard}>
      <Ionicons name={icon || 'stats-chart-outline'} size={15} color={theme.colors.adminAccent} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.backgroundTop },
  container: { flex: 1, backgroundColor: theme.colors.adminPrimary },
  bgOrbOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -70,
    right: -80,
    backgroundColor: 'rgba(100,167,211,0.14)',
  },
  bgOrbTwo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    bottom: 50,
    left: -60,
    backgroundColor: 'rgba(148,113,61,0.12)',
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.adminSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadows.card,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greet: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
  header: { fontSize: 24, fontWeight: '900', color: theme.colors.adminText },
  refreshChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#D3E2F4',
  },
  refreshText: { color: theme.colors.adminAccent, fontWeight: '700', fontSize: 11 },
  headerSub: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 12, maxWidth: 270 },
  summaryRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.adminSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 2,
    ...theme.shadows.card,
  },
  summaryValue: { fontSize: 20, fontWeight: '900', color: theme.colors.adminAccent },
  summaryLabel: { marginTop: 2, fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#EAF3FF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#D3E2F4',
  },
  segmentBtn: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  segmentActive: { backgroundColor: theme.colors.adminSurface, borderWidth: 1, borderColor: '#D3E2F4' },
  segmentText: { color: theme.colors.textSecondary, fontWeight: '700' },
  segmentTextActive: { color: theme.colors.adminAccent },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  bulkActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: theme.colors.adminSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  title: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary },
  meta: { marginTop: 5, color: theme.colors.textSecondary, fontSize: 12 },
  userActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  blockButton: {
    flex: 1,
    backgroundColor: '#9A6A3A',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 9,
  },
  unblockButton: {
    backgroundColor: '#A06C2A',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: theme.colors.logout,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 9,
    marginTop: 10,
  },
  viewButton: {
    flex: 1,
    backgroundColor: theme.colors.adminAccent,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 9,
    marginTop: 10,
  },
  hideButton: {
    backgroundColor: '#8C6A2D',
  },
  deleteText: { color: theme.colors.white, fontWeight: '800' },
  emptyWrap: { alignItems: 'center', marginTop: 30 },
  empty: { textAlign: 'center', marginTop: 8, color: theme.colors.textSecondary },
  selfBadge: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    backgroundColor: '#F8F2E6',
    alignItems: 'center',
    paddingVertical: 8,
  },
  selfBadgeText: { color: theme.colors.adminAccent, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  modalCard: {
    backgroundColor: theme.colors.adminSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.card,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.textPrimary },
  modalSub: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 12 },
  modalCancelSingle: {
    marginTop: 10,
    backgroundColor: '#ECE7DE',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalCancelText: { color: theme.colors.textPrimary, fontWeight: '700' },
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
  bulkSelectBox: { marginRight: 8 },
  bulkFileTextWrap: { flex: 1, paddingRight: 8 },
  bulkFileTitle: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: 13 },
  bulkFileMeta: { marginTop: 2, color: theme.colors.textSecondary, fontSize: 11 },
  bulkFileDownload: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.adminAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkSelectionActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
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
  bulkDeleteModalBtn: {
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
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reportHeaderBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  reportStatusText: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary },
  reportOpen: { backgroundColor: '#EAF3FF', borderColor: '#BBD4F1' },
  reportResolved: { backgroundColor: '#EAF9EF', borderColor: '#A9DDBB' },
  reportDismissed: { backgroundColor: '#F4F6F9', borderColor: '#D9DFE7' },
  reportAuto: { backgroundColor: '#FFF7E8', borderColor: '#E6C68A' },
  reportActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  autoHiddenNotice: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6C68A',
    backgroundColor: '#FFF7E8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoHiddenText: {
    flex: 1,
    color: '#8C6A2D',
    fontSize: 12,
    fontWeight: '700',
  },
  autoHiddenBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#8C6A2D',
  },
  autoHiddenBtnText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  reportNoteMeta: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#D7E2F1',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F8FBFF',
  },
  reportNoteText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  dismissButton: {
    backgroundColor: '#6B7280',
  },
});
