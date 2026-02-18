import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    let newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Frontend-only login flow: persist session and continue to main app.
      const mockUser = {
        id: 'frontend-user',
        fullName: email.split('@')[0] || 'Student',
        email,
        department: 'Computer Science',
        semester: 'Semester 1',
      };

      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('currentUser', JSON.stringify(mockUser));
      navigation.replace('MainTabs');
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.log('Login error:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerContainer}>
            <View style={styles.booksRow}>
              <View style={styles.bookBadge}>
                <Ionicons name="book-outline" size={22} color="#fff" />
              </View>
              <View style={[styles.bookBadge, styles.bookBadgeCenter]}>
                <Ionicons name="library-outline" size={24} color="#fff" />
              </View>
              <View style={styles.bookBadge}>
                <Ionicons name="book-outline" size={22} color="#fff" />
              </View>
            </View>
            <Text style={styles.title}>Academic Notes</Text>
            <Text style={styles.subtitle}>Share & Learn Together</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Welcome Back!</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors({ ...errors, email: '' });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors({ ...errors, password: '' });
                }}
                secureTextEntry={!showPassword}
                placeholderTextColor="#999"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}>
                Don't have an account? <Text style={styles.registerLink}>Register</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7F2',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  booksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFE4D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bookBadgeCenter: {
    backgroundColor: '#2E8B7B',
    width: 58,
    height: 58,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 5,
  },
  formContainer: {
    backgroundColor: '#FFF1E8',
    borderRadius: 22,
    padding: 25,
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.42,
    shadowRadius: 24,
    elevation: 28,
    borderWidth: 1,
    borderColor: '#F4D3C0',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0D8C9',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
    backgroundColor: '#FFF8F3',
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#2C3E50',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
  loginButton: {
    backgroundColor: '#2E8B7B',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 9,
    elevation: 7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  registerText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: '#6B7280',
  },
  registerLink: {
    color: '#2E8B7B',
    fontWeight: 'bold',
  },
});
