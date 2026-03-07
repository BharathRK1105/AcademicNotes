import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const toneMap = {
  primary: {
    bg: theme.colors.primary,
    icon: 'information-circle-outline',
  },
  danger: {
    bg: theme.colors.logout,
    icon: 'warning-outline',
  },
};

export default function ActionPrompt({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'primary',
  onCancel,
  onConfirm,
}) {
  const palette = toneMap[tone] || toneMap.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card}>
          <View style={styles.headerRow}>
            <View style={[styles.iconBadge, { backgroundColor: `${palette.bg}20` }]}>
              <Ionicons name={palette.icon} size={22} color={palette.bg} />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: palette.bg }]} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 21, 0.46)',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    color: theme.colors.textPrimary,
    fontWeight: '800',
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginBottom: 16,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: theme.radius.sm,
    backgroundColor: '#EFE7D8',
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmText: {
    color: theme.colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
});
