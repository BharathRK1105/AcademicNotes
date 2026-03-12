import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function NoteCard({
  note,
  onDownload,
  onDelete,
  canDelete = false,
  showDelete = false,
  statusLabel,
  onToggleBookmark,
  isBookmarked = false,
  onRate,
  onReport,
  onEdit,
  showEdit = false,
  averageRating = 0,
  ratingsCount = 0,
  trustScore = 0,
  trustTier = 'Low',
  onToggleVisibility,
  showVisibilityToggle = false,
  isOwner = false,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="book" size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={2}>
            {note.title}
          </Text>
          <Text style={styles.subject}>{note.subject}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={15} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>{note.semester}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={15} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>{note.uploadedBy}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={15} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>{note.uploadDate}</Text>
        </View>
      </View>

      {note.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {note.description}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        {statusLabel ? (
          <View style={styles.statusChip}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        ) : null}
        <View style={styles.metaRight}>
          <View style={[styles.trustPill, trustTier === 'High' ? styles.trustHigh : trustTier === 'Medium' ? styles.trustMedium : styles.trustLow]}>
            <Ionicons name="shield-checkmark-outline" size={12} color={trustTier === 'High' ? '#0F6F3A' : trustTier === 'Medium' ? '#8A5A00' : '#A33A3A'} />
            <Text style={[styles.trustText, trustTier === 'High' ? styles.trustTextHigh : trustTier === 'Medium' ? styles.trustTextMedium : styles.trustTextLow]}>
              Trust {trustScore}
            </Text>
          </View>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={12} color="#D97706" />
            <Text style={styles.ratingText}>
              {averageRating > 0 ? averageRating : '0.0'} ({ratingsCount})
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.downloadButton} onPress={() => onDownload(note)} activeOpacity={0.9}>
        <Ionicons name="cloud-download-outline" size={20} color={theme.colors.white} />
        <Text style={styles.downloadButtonText}>Download</Text>
      </TouchableOpacity>

      <View style={styles.actionsRow}>
        {showVisibilityToggle && isOwner && onToggleVisibility ? (
          <TouchableOpacity style={[styles.actionChip, styles.actionChipWarm]} onPress={() => onToggleVisibility(note)}>
            <Ionicons name={note.isHidden ? 'eye-outline' : 'eye-off-outline'} size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>{note.isHidden ? 'Unhide' : 'Hide'}</Text>
          </TouchableOpacity>
        ) : null}
        {onToggleBookmark ? (
          <TouchableOpacity
            style={[styles.actionChip, isBookmarked && styles.actionChipSaved]}
            onPress={() => onToggleBookmark(note)}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={isBookmarked ? '#0F6F3A' : theme.colors.primary}
            />
            <Text style={[styles.actionText, isBookmarked && styles.actionTextSaved]}>{isBookmarked ? 'Saved' : 'Save'}</Text>
          </TouchableOpacity>
        ) : null}
        {onRate ? (
          <TouchableOpacity style={styles.actionChip} onPress={() => onRate(note)}>
            <Ionicons name="star-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Rate</Text>
          </TouchableOpacity>
        ) : null}
        {onReport ? (
          <TouchableOpacity style={styles.actionChip} onPress={() => onReport(note)}>
            <Ionicons name="flag-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Report</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {showEdit || showDelete ? (
        <View style={styles.managementRow}>
          {showEdit ? (
            <TouchableOpacity style={styles.managementChip} onPress={() => onEdit && onEdit(note)}>
              <Ionicons name="create-outline" size={16} color={theme.colors.info} />
              <Text style={styles.managementText} numberOfLines={1}>Edit</Text>
            </TouchableOpacity>
          ) : null}
          {showDelete ? (
            <TouchableOpacity
              style={[styles.managementChip, styles.managementDanger, !canDelete && styles.managementDisabled]}
              onPress={() => canDelete && onDelete && onDelete(note)}
              disabled={!canDelete}
            >
              <Ionicons name="trash-outline" size={16} color={canDelete ? theme.colors.logout : '#9AAABF'} />
              <Text
                style={[styles.managementText, canDelete ? styles.managementDangerText : styles.managementDisabledText]}
                numberOfLines={1}
              >
                {canDelete ? 'Delete' : 'No Permission'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F4EBCF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  subject: {
    fontSize: 13,
    color: '#7A6245',
    fontWeight: '700',
    marginTop: 4,
  },
  cardBody: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusChip: {
    borderWidth: 1,
    borderColor: '#C7B585',
    borderRadius: theme.radius.pill,
    backgroundColor: '#FBF4DF',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF5DD',
    borderColor: '#F4D18A',
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    fontSize: 11,
    color: '#8A5A00',
    fontWeight: '800',
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trustHigh: {
    backgroundColor: '#EAF9EF',
    borderColor: '#A9DDBB',
  },
  trustMedium: {
    backgroundColor: '#FFF5DD',
    borderColor: '#F4D18A',
  },
  trustLow: {
    backgroundColor: '#FEECEC',
    borderColor: '#F5B2B2',
  },
  trustText: {
    fontSize: 11,
    fontWeight: '800',
  },
  trustTextHigh: { color: '#0F6F3A' },
  trustTextMedium: { color: '#8A5A00' },
  trustTextLow: { color: '#A33A3A' },
  downloadButton: {
    marginTop: 2,
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.button,
  },
  actionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionChipWarm: {
    backgroundColor: '#FFF7E8',
    borderColor: '#EAC98B',
  },
  actionChipSaved: {
    backgroundColor: '#EAF9EF',
    borderColor: '#A9DDBB',
  },
  actionText: {
    marginLeft: 5,
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  actionTextSaved: {
    color: '#0F6F3A',
  },
  managementRow: {
    marginTop: 9,
    flexDirection: 'row',
    gap: 8,
  },
  managementChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D7E2F1',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managementText: {
    marginLeft: 5,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'center',
  },
  managementDanger: {
    borderColor: '#F0B6B6',
    backgroundColor: '#FFF2F2',
  },
  managementDangerText: {
    color: theme.colors.logout,
  },
  managementDisabled: {
    borderColor: '#D9DFE7',
    backgroundColor: '#F4F6F9',
  },
  managementDisabledText: {
    color: '#9AAABF',
  },
  downloadButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 7,
  },
});
