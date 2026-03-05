import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function AccessDeniedScreen({ reason = 'Access denied.' }) {
  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed-outline" size={52} color={theme.colors.logout} />
      <Text style={styles.title}>Restricted Access</Text>
      <Text style={styles.reason}>{reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.backgroundTop,
  },
  title: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  reason: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
});
