import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function StyledSelect({
  icon = 'list-outline',
  label,
  value,
  options = [],
  placeholder = 'Select',
  onChange,
}) {
  const [visible, setVisible] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!value) {
      return placeholder;
    }
    return value;
  }, [placeholder, value]);

  const handleSelect = (item) => {
    onChange(item);
    setVisible(false);
  };

  return (
    <>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.field} activeOpacity={0.85} onPress={() => setVisible(true)}>
        <Ionicons name={icon} size={20} color={theme.colors.secondary} style={styles.leadingIcon} />
        <Text numberOfLines={1} style={styles.fieldText}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{placeholder}</Text>
            </View>
            <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
              {options.map((item) => {
                const selected = item === value;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item}</Text>
                    {selected ? <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.dropdownBorder,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dropdownBackground,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
  },
  leadingIcon: {
    marginRight: 10,
  },
  fieldText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 42, 36, 0.45)',
    justifyContent: 'center',
    padding: 18,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: '68%',
    ...theme.shadows.card,
  },
  sheetHeader: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  optionList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceSoft,
  },
  optionSelected: {
    borderColor: '#BFA86B',
    backgroundColor: '#FBF4DF',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  optionTextSelected: {
    color: theme.colors.primary,
  },
});
