import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import ActionPrompt from '../components/ActionPrompt';
import AppNotification from '../components/AppNotification';
import StyledSelect from '../components/StyledSelect';
import { useAuth } from '../context/AuthContext';
import { notesService } from '../services/notesService';
import { adminService } from '../services/adminService';
import { getApiErrorMessage } from '../services/api';
import { DEPARTMENTS, ROLE_LABELS, SEMESTERS, SUBJECTS } from '../utils/constants';
import { theme } from '../theme';

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
};

const actionMeta = {
  block_user: 'Blocked user',
  unblock_user: 'Unblocked user',
  hide_note: 'Hidden note',
  unhide_note: 'Unhid note',
  delete_user: 'Deleted user',
  delete_note: 'Deleted note',
};

const DEPARTMENT_OPTIONS = ['Select Department', ...DEPARTMENTS];
const SEMESTER_OPTIONS = ['Select Semester', ...SEMESTERS];
const INTEREST_OPTIONS = ['Select Interest', ...SUBJECTS];

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { currentUser, logout, updateProfile, changePassword } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logoutPromptVisible, setLogoutPromptVisible] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });
  const [adminInsights, setAdminInsights] = useState({ stats: null, recentActions: [] });
  const [studentActivity, setStudentActivity] = useState({ lastUploads: [], lastRating: null, lastDownload: null });
  const [studentNotes, setStudentNotes] = useState([]);
  const [profileForm, setProfileForm] = useState({
    department: DEPARTMENT_OPTIONS[0],
    semester: SEMESTER_OPTIONS[0],
    primaryInterest: INTEREST_OPTIONS[0],
    bio: '',
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordPromptVisible, setPasswordPromptVisible] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const showNotification = (message, type = 'info') => setNotification({ visible: true, message, type });
  const hideNotification = () => setNotification((prev) => ({ ...prev, visible: false }));

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      (async () => {
        try {
          if (currentUser?.role === 'admin') {
            const insights = await adminService.getProfileInsights();
            if (!mounted) return;
            setAdminInsights(insights);
          } else {
            const [notes, activity] = await Promise.all([notesService.getMyNotes(), notesService.getMyActivity()]);
            if (!mounted) return;
            setStudentNotes(notes);
            setStudentActivity(activity);
          }
        } catch (error) {
          showNotification(getApiErrorMessage(error, 'Failed to load profile stats.'), 'error');
        } finally {
          if (mounted) {
            setProfileForm({
              department: currentUser?.department || DEPARTMENT_OPTIONS[0],
              semester: currentUser?.semester || SEMESTER_OPTIONS[0],
              primaryInterest: currentUser?.interests?.[0] || INTEREST_OPTIONS[0],
              bio: currentUser?.bio || '',
            });
            setLoading(false);
          }
        }
      })();
      return () => {
        mounted = false;
      };
    }, [currentUser])
  );

  const studentStats = useMemo(() => {
    const uploaded = studentNotes.length;
    const hidden = studentNotes.filter((item) => item.isHidden).length;
    const publicNotes = uploaded - hidden;
    const totalDownloads = studentNotes.reduce((sum, item) => sum + Number(item.downloadCount || 0), 0);

    const rated = studentNotes.filter((item) => Number(item.ratingsCount || 0) > 0);
    const totalRatings = rated.reduce((sum, item) => sum + Number(item.ratingsCount || 0), 0);
    const weightedAverage =
      totalRatings > 0
        ? Number(
            (
              rated.reduce(
                (sum, item) => sum + Number(item.averageRating || 0) * Number(item.ratingsCount || 0),
                0
              ) / totalRatings
            ).toFixed(1)
          )
        : 0;

    const topRated = rated
      .slice()
      .sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0))[0] || null;

    return { uploaded, hidden, publicNotes, totalDownloads, weightedAverage, topRated };
  }, [studentNotes]);

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

  const isAdmin = currentUser.role === 'admin';

  const saveAcademicProfile = async () => {
    try {
      const interests = profileForm.primaryInterest && profileForm.primaryInterest !== INTEREST_OPTIONS[0] ? [profileForm.primaryInterest] : [];
      await updateProfile({
        department: profileForm.department === DEPARTMENT_OPTIONS[0] ? '' : profileForm.department,
        semester: profileForm.semester === SEMESTER_OPTIONS[0] ? '' : profileForm.semester,
        bio: profileForm.bio,
        interests,
      });
      showNotification('Academic profile updated.', 'success');
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to update profile.'), 'error');
    }
  };

  const submitPasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showNotification('Current and new password are required.', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showNotification('New password must be at least 6 characters.', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification('New password and confirm password do not match.', 'error');
      return;
    }
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordPromptVisible(false);
      showNotification('Password changed.', 'success');
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Failed to change password.'), 'error');
    }
  };

  const passwordStrength = useMemo(() => {
    const value = passwordForm.newPassword || '';
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[a-z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    if (score <= 2) return { label: 'Weak', color: '#CC5A4A', score };
    if (score <= 4) return { label: 'Medium', color: '#B0822D', score };
    return { label: 'Strong', color: '#2F8F57', score };
  }, [passwordForm.newPassword]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <LinearGradient colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]} style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleCard}>
            <Text style={styles.title}>My Profile</Text>
            <Text style={styles.titleSub}>
              {isAdmin ? 'Admin account, moderation, and security overview.' : 'Academic identity, contributions, and activity.'}
            </Text>
          </View>

          <View style={styles.header}>
            <View style={styles.initialAvatar}>
              <Text style={styles.initialAvatarText}>
                {String(currentUser.name || 'U')
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>{currentUser.name}</Text>
            <Text style={styles.email}>{currentUser.email || currentUser.username}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{ROLE_LABELS[currentUser.role] || currentUser.role}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Joined</Text>
            <Text style={styles.value}>{formatDate(currentUser.createdAt)}</Text>
          </View>

          {loading ? (
            <View style={styles.card}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : null}

          {isAdmin ? (
            <>
              <View style={styles.card}>
                <Text style={styles.label}>Moderation Stats</Text>
                <Text style={styles.valueSmall}>
                  Users blocked/unblocked: {adminInsights?.stats?.blockedUsers || 0}/{adminInsights?.stats?.unblockedUsers || 0}
                </Text>
                <Text style={styles.valueSmall}>
                  Notes hidden/unhidden: {adminInsights?.stats?.notesHiddenByAdmin || 0}/
                  {adminInsights?.stats?.notesUnhiddenByAdmin || 0}
                </Text>
                <Text style={styles.valueSmall}>Deletions done: {adminInsights?.stats?.deletionsDone || 0}</Text>
              </View>

              <View style={styles.statsRow}>
                <MiniStat label="Users" value={adminInsights?.stats?.totalUsers || 0} />
                <MiniStat label="Active" value={adminInsights?.stats?.activeUsers || 0} />
                <MiniStat label="Notes" value={adminInsights?.stats?.totalNotes || 0} />
                <MiniStat label="Hidden" value={adminInsights?.stats?.hiddenNotes || 0} />
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>Recent Admin Actions</Text>
                {adminInsights?.recentActions?.length ? (
                  adminInsights.recentActions.map((item) => (
                    <View key={item._id} style={styles.timelineItem}>
                      <Text style={styles.valueSmall}>{actionMeta[item.actionType] || item.actionType}</Text>
                      <Text style={styles.mutedText}>
                        {item.targetLabel || item.targetType} - {formatDateTime(item.createdAt)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.mutedText}>No actions yet.</Text>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>Admin Security</Text>
                <Text style={styles.valueSmall}>Last login: {formatDateTime(currentUser.lastLoginAt)}</Text>
                <Text style={styles.valueSmall}>Auth provider: {currentUser.authProvider || 'N/A'}</Text>
                {currentUser.authProvider === 'local' ? (
                  <>
                    <View style={styles.securityCard}>
                      <View style={styles.securityHeaderRow}>
                        <Text style={styles.securityTitle}>Security</Text>
                        <TouchableOpacity
                          style={styles.ghostBtn}
                          onPress={() => setShowPasswordForm((prev) => !prev)}
                          activeOpacity={0.9}
                        >
                          <Ionicons name="lock-closed-outline" size={14} color={theme.colors.primary} />
                          <Text style={styles.ghostBtnText}>{showPasswordForm ? 'Hide Form' : 'Change Password'}</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.securityHint}>Use 8+ characters with a mix of letters, numbers, and symbols.</Text>
                      <View style={styles.securityIdeasRow}>
                        <TouchableOpacity
                          style={styles.securityIdea}
                          onPress={() => showNotification('Two-factor authentication is coming soon.', 'info')}
                        >
                          <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.primary} />
                          <Text style={styles.securityIdeaText}>Enable 2FA</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.securityIdea}
                          onPress={() => showNotification('Login alerts are coming soon.', 'info')}
                        >
                          <Ionicons name="notifications-outline" size={14} color={theme.colors.primary} />
                          <Text style={styles.securityIdeaText}>Login Alerts</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.securityIdea}
                          onPress={() => showNotification('Session history is coming soon.', 'info')}
                        >
                          <Ionicons name="time-outline" size={14} color={theme.colors.primary} />
                          <Text style={styles.securityIdeaText}>Session History</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {showPasswordForm ? (
                      <View style={styles.passwordWrap}>
                        <View style={styles.passwordInputWrap}>
                          <TextInput
                            style={[styles.input, styles.passwordInput]}
                            secureTextEntry={!showCurrentPassword}
                            placeholder="Current password"
                            value={passwordForm.currentPassword}
                            onChangeText={(text) => setPasswordForm((prev) => ({ ...prev, currentPassword: text }))}
                          />
                          <TouchableOpacity onPress={() => setShowCurrentPassword((prev) => !prev)} style={styles.eyeBtn}>
                            <Ionicons
                              name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                              size={18}
                              color={theme.colors.textSecondary}
                            />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.passwordInputWrap}>
                          <TextInput
                            style={[styles.input, styles.passwordInput]}
                            secureTextEntry={!showNewPassword}
                            placeholder="New password"
                            value={passwordForm.newPassword}
                            onChangeText={(text) => setPasswordForm((prev) => ({ ...prev, newPassword: text }))}
                          />
                          <TouchableOpacity onPress={() => setShowNewPassword((prev) => !prev)} style={styles.eyeBtn}>
                            <Ionicons
                              name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                              size={18}
                              color={theme.colors.textSecondary}
                            />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.passwordInputWrap}>
                          <TextInput
                            style={[styles.input, styles.passwordInput]}
                            secureTextEntry={!showConfirmPassword}
                            placeholder="Confirm new password"
                            value={passwordForm.confirmPassword}
                            onChangeText={(text) => setPasswordForm((prev) => ({ ...prev, confirmPassword: text }))}
                          />
                          <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)} style={styles.eyeBtn}>
                            <Ionicons
                              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                              size={18}
                              color={theme.colors.textSecondary}
                            />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.strengthRow}>
                          <Text style={styles.strengthLabel}>Strength: </Text>
                          <Text style={[styles.strengthValue, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>
                        </View>
                        <View style={styles.strengthTrack}>
                          <View
                            style={[
                              styles.strengthFill,
                              { width: `${(passwordStrength.score / 5) * 100}%`, backgroundColor: passwordStrength.color },
                            ]}
                          />
                        </View>

                        <TouchableOpacity
                          style={styles.primaryBtn}
                          onPress={() => setPasswordPromptVisible(true)}
                          activeOpacity={0.9}
                        >
                          <Text style={styles.primaryBtnText}>Update Password</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>Quick Admin Shortcuts</Text>
                <View style={styles.quickRow}>
                  <TouchableOpacity style={styles.chip} onPress={() => navigation.navigate('Dashboard', { panel: 'users' })}>
                    <Text style={styles.chipText}>Manage Users</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={() => navigation.navigate('Dashboard', { panel: 'hidden-notes' })}
                  >
                    <Text style={styles.chipText}>Review Hidden Notes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.chip} onPress={() => navigation.navigate('Dashboard', { panel: 'reports' })}>
                    <Text style={styles.chipText}>Reported Content</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.label}>Academic Identity</Text>
                <StyledSelect
                  label="Department"
                  value={profileForm.department}
                  options={DEPARTMENT_OPTIONS}
                  onChange={(value) => setProfileForm((prev) => ({ ...prev, department: value }))}
                />
                <StyledSelect
                  label="Semester"
                  value={profileForm.semester}
                  options={SEMESTER_OPTIONS}
                  onChange={(value) => setProfileForm((prev) => ({ ...prev, semester: value }))}
                />
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  multiline
                  placeholder="Short bio"
                  value={profileForm.bio}
                  onChangeText={(text) => setProfileForm((prev) => ({ ...prev, bio: text }))}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>Contribution Stats</Text>
                <Text style={styles.valueSmall}>Uploaded notes: {studentStats.uploaded}</Text>
                <Text style={styles.valueSmall}>Public notes: {studentStats.publicNotes}</Text>
                <Text style={styles.valueSmall}>Hidden notes: {studentStats.hidden}</Text>
                <Text style={styles.valueSmall}>Total downloads on my notes: {studentStats.totalDownloads}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>Quality Stats</Text>
                <Text style={styles.valueSmall}>Average rating across my notes: {studentStats.weightedAverage}/5</Text>
                <Text style={styles.valueSmall}>
                  Top-rated note: {studentStats.topRated ? `${studentStats.topRated.title} (${studentStats.topRated.averageRating}/5)` : 'N/A'}
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>My Activity</Text>
                {studentActivity?.lastUploads?.slice(0, 3).map((item) => (
                  <Text key={item.id} style={styles.valueSmall}>
                    Uploaded: {item.title} ({formatDate(item.createdAt)})
                  </Text>
                ))}
                <Text style={styles.valueSmall}>
                  Last rating: {studentActivity?.lastRating ? `${studentActivity.lastRating.value}/5 on ${studentActivity.lastRating.noteTitle}` : 'N/A'}
                </Text>
                <Text style={styles.valueSmall}>
                  Last download: {studentActivity?.lastDownload ? `${studentActivity.lastDownload.noteTitle} (${formatDateTime(studentActivity.lastDownload.downloadedAt)})` : 'N/A'}
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>Learning Goals / Interests</Text>
                <StyledSelect
                  label="Primary Interest"
                  value={profileForm.primaryInterest}
                  options={INTEREST_OPTIONS}
                  onChange={(value) => setProfileForm((prev) => ({ ...prev, primaryInterest: value }))}
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={saveAcademicProfile} activeOpacity={0.9}>
                  <Text style={styles.primaryBtnText}>Save Profile</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>Quick Access</Text>
                <View style={styles.quickRow}>
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={() => showNotification(`My uploads: ${studentStats.uploaded}`, 'info')}
                  >
                    <Text style={styles.chipText}>My Uploads</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={() => showNotification(`Hidden notes: ${studentStats.hidden}`, 'info')}
                  >
                    <Text style={styles.chipText}>Hidden Notes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.chip} onPress={() => navigation.navigate('Upload')}>
                    <Text style={styles.chipText}>Upload New Note</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

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
            setPasswordPromptVisible(false);
            await logout();
          }}
        />

        <ActionPrompt
          visible={passwordPromptVisible}
          title="Confirm Password Change"
          message="Do you want to update your password now?"
          confirmText="Yes, Change"
          cancelText="Cancel"
          tone="primary"
          onCancel={() => setPasswordPromptVisible(false)}
          onConfirm={submitPasswordChange}
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

function MiniStat({ label, value }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.backgroundTop },
  container: { flex: 1, padding: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 28 },
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
  initialAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: '#D4E4F8',
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialAvatarText: { fontSize: 34, fontWeight: '900', color: theme.colors.primary },
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
  mutedText: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 12 },
  statsRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  miniStat: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 10,
    ...theme.shadows.card,
  },
  miniValue: { color: theme.colors.primary, fontWeight: '900', fontSize: 16 },
  miniLabel: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 11 },
  timelineItem: {
    marginTop: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#D4E4F8',
    paddingLeft: 8,
  },
  securityCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F7F9FB',
    borderWidth: 1,
    borderColor: '#DCE5F0',
  },
  securityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D4E4F8',
    backgroundColor: '#EFF6FF',
  },
  ghostBtnText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  securityHint: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  securityIdeasRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  securityIdea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D4E4F8',
    backgroundColor: '#EEF5FF',
  },
  securityIdeaText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  passwordWrap: { marginTop: 8, gap: 8 },
  passwordInputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.white,
    color: theme.colors.textPrimary,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    top: 16,
  },
  strengthRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  strengthLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  strengthValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  strengthTrack: {
    marginTop: 4,
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 999,
  },
  inputMulti: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    marginTop: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    ...theme.shadows.button,
  },
  primaryBtnText: { color: theme.colors.white, fontWeight: '800' },
  quickRow: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#D4E4F8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipDisabled: { opacity: 0.85 },
  chipText: { color: theme.colors.primary, fontWeight: '700', fontSize: 12 },
  logoutButton: {
    marginTop: 14,
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
