import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppNotification from '../components/AppNotification';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, getApiErrorMessage } from '../services/api';
import { theme } from '../theme';

export default function LoginScreen() {
  const { loginAsAdmin, loginAsStudent, registerStudent } = useAuth();
  const [mode, setMode] = useState('student');
  const [studentAuthMode, setStudentAuthMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });

  const showNotification = (message, type = 'info') => setNotification({ visible: true, message, type });
  const hideNotification = () => setNotification((prev) => ({ ...prev, visible: false }));
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

  const clearStudentFields = () => {
    setName('');
    setEmail('');
    setUsername('');
    setPassword('');
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    clearStudentFields();
    setStudentAuthMode('login');
  };

  const handleStudentSubmit = async () => {
    const rawUsername = username.trim();
    const rawEmail = email.trim().toLowerCase();
    const rawPassword = password;

    if (studentAuthMode === 'login' && (!rawUsername || !rawPassword.trim())) {
      showNotification('Username/email and password are required.', 'error');
      return;
    }

    if (studentAuthMode === 'register' && !name.trim()) {
      showNotification('Name is required.', 'error');
      return;
    }
    if (studentAuthMode === 'register' && !rawEmail) {
      showNotification('Email is required.', 'error');
      return;
    }
    if (studentAuthMode === 'register' && !isValidEmail(rawEmail)) {
      showNotification('Please enter a valid email address.', 'error');
      return;
    }
    if (!rawPassword.trim()) {
      showNotification('Password is required.', 'error');
      return;
    }

    try {
      setLoading(true);
      if (studentAuthMode === 'register') {
        await registerStudent({
          name: name.trim(),
          email: rawEmail,
          password: rawPassword,
        });
      } else {
        await loginAsStudent({
          usernameOrEmail: rawUsername,
          password: rawPassword,
        });
      }
    } catch (error) {
      showNotification(
        getApiErrorMessage(error, studentAuthMode === 'register' ? 'Student registration failed.' : 'Student login failed.'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!username.trim() || !password.trim()) {
      showNotification('Username and password are required.', 'error');
      return;
    }
    try {
      setLoading(true);
      await loginAsAdmin({ username: username.trim(), password });
    } catch (error) {
      showNotification(getApiErrorMessage(error, 'Admin login failed.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200' }}
        style={styles.bgImage}
        imageStyle={styles.bgImageStyle}
      >
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1511629091441-ee46146481b6?w=400' }}
          style={[styles.floatImage, styles.floatImageOne]}
        />
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400' }}
          style={[styles.floatImage, styles.floatImageTwo]}
        />
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400' }}
          style={[styles.floatImage, styles.floatImageThree]}
        />
        <LinearGradient colors={['rgba(245,249,255,0.9)', 'rgba(238,243,250,0.96)']} style={styles.container}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800' }}
            style={styles.hero}
          />
        <Text style={styles.title}>Academic Notes</Text>
        <Text style={styles.subtitle}>Organize. Upload. Share.</Text>
        {__DEV__ ? <Text style={styles.debugUrl}>API: {API_BASE_URL}</Text> : null}

          <Text style={styles.bgQuote}>
            {mode === 'student'
              ? '"Knowledge grows when shared with your classmates."'
              : '"Lead with clarity. Moderate with fairness."'}
          </Text>

          <View style={styles.card}>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[styles.segmentBtn, mode === 'student' && styles.segmentActive]}
              onPress={() => switchMode('student')}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, mode === 'student' && styles.segmentTextActive]}>Student</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, mode === 'admin' && styles.segmentActive]}
              onPress={() => switchMode('admin')}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, mode === 'admin' && styles.segmentTextActive]}>Admin</Text>
            </TouchableOpacity>
          </View>
          {mode === 'student' ? (
            <>
              <View style={styles.segmentRow}>
                <TouchableOpacity
                  style={[styles.segmentBtn, studentAuthMode === 'login' && styles.segmentActive]}
                  onPress={() => setStudentAuthMode('login')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.segmentText, studentAuthMode === 'login' && styles.segmentTextActive]}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, studentAuthMode === 'register' && styles.segmentActive]}
                  onPress={() => setStudentAuthMode('register')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.segmentText, studentAuthMode === 'register' && styles.segmentTextActive]}>Register</Text>
                </TouchableOpacity>
              </View>

              {studentAuthMode === 'register' ? (
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoComplete="name"
                    placeholder="Full name"
                    placeholderTextColor="#9A9487"
                    underlineColorAndroid="transparent"
                  />
                </View>
              ) : null}

              {studentAuthMode === 'login' ? (
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color={theme.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    placeholder="Username or email"
                    placeholderTextColor="#9A9487"
                    underlineColorAndroid="transparent"
                  />
                </View>
              ) : null}

              {studentAuthMode === 'register' ? (
                <View style={styles.inputWrap}>
                  <Ionicons name="at-outline" size={18} color={theme.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="Email"
                    placeholderTextColor="#9A9487"
                    underlineColorAndroid="transparent"
                  />
                </View>
              ) : null}

              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCorrect={false}
                  autoComplete="off"
                  placeholder="Password"
                  placeholderTextColor="#9A9487"
                  underlineColorAndroid="transparent"
                />
              </View>

              <TouchableOpacity style={styles.button} onPress={handleStudentSubmit} disabled={loading} activeOpacity={0.9}>
                {loading ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <Text style={styles.buttonText}>{studentAuthMode === 'register' ? 'Register' : 'Login'}</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  placeholder="Admin username"
                  placeholderTextColor="#9A9487"
                  underlineColorAndroid="transparent"
                />
              </View>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCorrect={false}
                  autoComplete="off"
                  placeholder="Password"
                  placeholderTextColor="#9A9487"
                  underlineColorAndroid="transparent"
                />
              </View>
              <TouchableOpacity style={styles.button} onPress={handleAdminLogin} disabled={loading} activeOpacity={0.9}>
                {loading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.buttonText}>Login</Text>}
              </TouchableOpacity>
            </>
          )}
          </View>

          <AppNotification
            visible={notification.visible}
            message={notification.message}
            type={notification.type}
            onHide={hideNotification}
          />
        </LinearGradient>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.backgroundTop },
  bgImage: { flex: 1 },
  bgImageStyle: { opacity: 0.24 },
  floatImage: {
    position: 'absolute',
    borderRadius: 18,
    opacity: 0.18,
  },
  floatImageOne: {
    top: 80,
    right: 18,
    width: 90,
    height: 90,
    transform: [{ rotate: '16deg' }],
  },
  floatImageTwo: {
    top: 220,
    left: 14,
    width: 70,
    height: 70,
    transform: [{ rotate: '-12deg' }],
  },
  floatImageThree: {
    bottom: 130,
    right: 10,
    width: 80,
    height: 80,
    transform: [{ rotate: '-18deg' }],
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  hero: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#EFE3C5',
    ...theme.shadows.card,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  debugUrl: {
    fontSize: 11,
    color: '#7B6F5B',
    marginBottom: 12,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    ...theme.shadows.card,
  },
  segmentRow: {
    flexDirection: 'row',
    marginBottom: 14,
    backgroundColor: '#F2ECD9',
    borderRadius: 14,
    padding: 4,
  },
  segmentBtn: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  segmentActive: { backgroundColor: theme.colors.surface },
  segmentText: { color: theme.colors.textSecondary, fontWeight: '700' },
  segmentTextActive: { color: theme.colors.primary },
  bgQuote: {
    marginBottom: 12,
    color: '#6A7688',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.9,
    paddingHorizontal: 18,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: theme.colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    ...theme.shadows.button,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
