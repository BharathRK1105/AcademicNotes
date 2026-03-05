import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ActionPrompt from '../components/ActionPrompt';
import AppNotification from '../components/AppNotification';
import { useAuth } from '../context/AuthContext';
import { notesService } from '../services/notesService';
import { getApiErrorMessage } from '../services/api';
import { ROLE_LABELS } from '../utils/constants';
import { theme } from '../theme';

export default function ProfileScreen() {
  const { currentUser, logout } = useAuth();
  const [notesCount, setNotesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [logoutPromptVisible, setLogoutPromptVisible] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });

  const showNotification = (message, type = 'info') => setNotification({ visible: true, message, type });
  const hideNotification = () => setNotification((prev) => ({ ...prev, visible: false }));

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const notes = await notesService.getMyNotes();
          if (mounted) setNotesCount(notes.length);
        } catch (error) {
          showNotification(getApiErrorMessage(error, 'Failed to load profile stats.'), 'error');
        } finally {
          if (mounted) setLoading(false);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.loader}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <LinearGradient colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]} style={styles.container}>
        <View pointerEvents="none" style={styles.bgDecorOne} />
        <View pointerEvents="none" style={styles.bgDecorTwo} />
        <Ionicons
          pointerEvents="none"
          name="library-outline"
          size={120}
          color="rgba(95,168,255,0.08)"
          style={styles.bgIconOne}
        />
        <Ionicons
          pointerEvents="none"
          name="school-outline"
          size={90}
          color="rgba(200,155,60,0.12)"
          style={styles.bgIconTwo}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleCard}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>My Profile</Text>
            </View>
            <Text style={styles.titleSub}>Track your activity and account details.</Text>
          </View>

          <View style={styles.header}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1588075592446-265fd1e6e76f?w=500' }}
              style={styles.avatar}
            />
            <Text style={styles.name}>{currentUser.name}</Text>
            <Text style={styles.email}>{currentUser.email || currentUser.username}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{ROLE_LABELS[currentUser.role] || currentUser.role}</Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.label}>Total Notes Uploaded</Text>
            {loading ? <ActivityIndicator color={theme.colors.primary} /> : <Text style={styles.value}>{notesCount}</Text>}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Joined</Text>
            <Text style={styles.value}>{new Date(currentUser.createdAt).toLocaleString()}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Quick Access</Text>
            <Text style={styles.valueSmall}>
              {currentUser.role === 'admin'
                ? 'Review user activity and moderate notes from the Admin Dashboard.'
                : 'Upload well-organized notes and help classmates find resources faster.'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => showNotification('Edit profile UI is coming soon.', 'info')}
            activeOpacity={0.9}
          >
            <Ionicons name="create-outline" size={18} color={theme.colors.white} />
            <Text style={styles.editText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={() => setLogoutPromptVisible(true)} activeOpacity={0.9}>
            <Ionicons name="log-out-outline" size={18} color={theme.colors.white} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>

        <ActionPrompt
          visible={logoutPromptVisible}
          title="Logout"
          message="Are you sure you want to logout?"
          confirmText="Logout"
          cancelText="Cancel"
          tone="danger"
          onCancel={() => setLogoutPromptVisible(false)}
          onConfirm={async () => {
            setLogoutPromptVisible(false);
            await logout();
          }}
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
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.backgroundTop },
  container: { flex: 1, padding: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 28 },
  bgDecorOne: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(95,168,255,0.12)',
    top: -60,
    right: -70,
  },
  bgDecorTwo: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(201,155,60,0.14)',
    bottom: 40,
    left: -70,
  },
  bgIconOne: {
    position: 'absolute',
    top: 90,
    right: 20,
  },
  bgIconTwo: {
    position: 'absolute',
    bottom: 120,
    left: 18,
  },
  titleCard: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  title: { fontSize: 22, fontWeight: '900', color: theme.colors.textPrimary },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleSub: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 12 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 20,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: '#EFE3C5',
    ...theme.shadows.card,
  },
  name: { marginTop: 10, fontSize: 22, fontWeight: '900', color: theme.colors.textPrimary },
  email: { marginTop: 4, fontSize: 13, color: theme.colors.textSecondary },
  roleBadge: {
    marginTop: 8,
    backgroundColor: '#F2E7C9',
    borderWidth: 1,
    borderColor: '#D8C293',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  roleText: { color: '#6E561E', fontWeight: '700', textTransform: 'uppercase', fontSize: 11 },
  statsCard: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 14,
    ...theme.shadows.card,
  },
  card: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 14,
    ...theme.shadows.card,
  },
  label: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '700' },
  value: { marginTop: 6, fontSize: 16, color: theme.colors.textPrimary, fontWeight: '900' },
  valueSmall: { marginTop: 6, fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600', lineHeight: 19 },
  editButton: {
    marginTop: 16,
    backgroundColor: '#7B5E16',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    ...theme.shadows.button,
  },
  editText: { color: theme.colors.white, fontSize: 16, fontWeight: '800' },
  logoutButton: {
    marginTop: 10,
    backgroundColor: theme.colors.logout,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    ...theme.shadows.button,
  },
  logoutText: { color: theme.colors.white, fontSize: 16, fontWeight: '800' },
});
