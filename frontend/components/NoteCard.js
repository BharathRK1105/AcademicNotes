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
        <View style={styles.ratingPill}>
          <Ionicons name="star" size={12} color="#D97706" />
          <Text style={styles.ratingText}>
            {averageRating > 0 ? averageRating : '0.0'} ({ratingsCount})
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.downloadButton} onPress={() => onDownload(note)}>
        <Ionicons name="cloud-download-outline" size={20} color={theme.colors.white} />
        <Text style={styles.downloadButtonText}>Download</Text>
      </TouchableOpacity>

      <View style={styles.actionsRow}>
        {showVisibilityToggle && isOwner && onToggleVisibility ? (
          <TouchableOpacity style={styles.actionChip} onPress={() => onToggleVisibility(note)}>
            <Ionicons name={note.isHidden ? 'eye-outline' : 'eye-off-outline'} size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>{note.isHidden ? 'Unhide' : 'Hide'}</Text>
          </TouchableOpacity>
        ) : null}
        {onToggleBookmark ? (
          <TouchableOpacity style={styles.actionChip} onPress={() => onToggleBookmark(note)}>
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.actionText}>{isBookmarked ? 'Saved' : 'Save'}</Text>
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

      {showEdit ? (
        <TouchableOpacity style={styles.editButton} onPress={() => onEdit && onEdit(note)}>
          <Ionicons name="create-outline" size={18} color={theme.colors.white} />
          <Text style={styles.downloadButtonText}>Edit</Text>
        </TouchableOpacity>
      ) : null}

      {showDelete ? (
        <TouchableOpacity
          style={[styles.deleteButton, !canDelete && styles.deleteButtonDisabled]}
          onPress={() => canDelete && onDelete && onDelete(note)}
          disabled={!canDelete}
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.white} />
          <Text style={styles.downloadButtonText}>{canDelete ? 'Delete' : 'No Permission'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
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
  downloadButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.button,
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF4DF',
    borderWidth: 1,
    borderColor: '#C7B585',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionText: {
    marginLeft: 5,
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  editButton: {
    marginTop: 9,
    flexDirection: 'row',
    backgroundColor: theme.colors.info,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    marginTop: 9,
    flexDirection: 'row',
    backgroundColor: theme.colors.logout,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: '#9AAABF',
  },
  downloadButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 7,
  },
});
