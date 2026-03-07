import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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

export default function AdminDashboardScreen() {
  return (
    <RoleGuard allowedRoles={[USER_ROLES.ADMIN]}>
      <AdminDashboardContent />
    </RoleGuard>
  );
}

function AdminDashboardContent() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activePanel, setActivePanel] = useState('notes');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });

  const showNotification = (message, type = 'info') => setNotification({ visible: true, message, type });
  const hideNotification = () => setNotification((prev) => ({ ...prev, visible: false }));

  const loadData = useCallback(async () => {
    try {
      const [usersData, notesData] = await Promise.all([adminService.getUsers(), notesService.getAllNotesAsAdmin()]);
      setUsers(usersData);
      setNotes(notesData);
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
    }),
    [notes.length, users]
  );

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

  const renderNote = ({ item }) => (
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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.adminAccent} />
            <Text style={styles.header}>Admin Dashboard</Text>
            <TouchableOpacity style={styles.refreshChip} onPress={loadData} activeOpacity={0.85}>
              <Ionicons name="refresh" size={14} color={theme.colors.adminAccent} />
              <Text style={styles.refreshText}>Sync</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSub}>Manage users, notes, moderation, and content quality</Text>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="Users" value={summary.totalUsers} />
          <SummaryCard label="Active" value={summary.activeUsers} />
          <SummaryCard label="Notes" value={summary.totalNotes} />
        </View>

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
        </View>

        <FlatList
          data={activePanel === 'notes' ? notes : users}
          keyExtractor={(item) => item._id}
          renderItem={activePanel === 'notes' ? renderNote : renderUser}
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
              <Ionicons name="albums-outline" size={46} color="#9CA3AF" />
              <Text style={styles.empty}>No records found.</Text>
            </View>
          }
        />

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

function SummaryCard({ label, value }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.backgroundTop },
  container: { flex: 1, backgroundColor: theme.colors.adminPrimary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.adminSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadows.card,
  },
  header: { fontSize: 24, fontWeight: '900', color: theme.colors.adminText },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshChip: {
    marginLeft: 'auto',
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
  headerSub: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 12 },
  summaryRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.adminSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
    ...theme.shadows.card,
  },
  summaryValue: { fontSize: 20, fontWeight: '900', color: theme.colors.adminAccent },
  summaryLabel: { marginTop: 2, fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#F5EFE4',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentBtn: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  segmentActive: { backgroundColor: theme.colors.adminSurface },
  segmentText: { color: theme.colors.textSecondary, fontWeight: '700' },
  segmentTextActive: { color: theme.colors.adminAccent },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
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
});
