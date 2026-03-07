import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { API_BASE_URL, api } from './api';
import { tokenStorage } from './tokenStorage';

export const notesService = {
  async createNote(payload) {
    const formData = new FormData();
    formData.append('title', payload.title);
    if (payload.description) {
      formData.append('description', payload.description);
    }
    if (payload.subject) {
      formData.append('subject', payload.subject);
    }
    if (payload.semester) {
      formData.append('semester', payload.semester);
    }
    if (Platform.OS === 'web') {
      if (payload.file.file) {
        formData.append('file', payload.file.file, payload.file.name || 'upload-file');
      } else {
        const fileResponse = await fetch(payload.file.uri);
        const blob = await fileResponse.blob();
        formData.append('file', blob, payload.file.name || 'upload-file');
      }
    } else {
      formData.append('file', {
        uri: payload.file.uri,
        name: payload.file.name,
        type: payload.file.mimeType || 'application/octet-stream',
      });
    }

    const response = await api.post('/notes', formData);
    return response.data;
  },

  async getFeedNotes() {
    const response = await api.get('/notes/feed');
    return response.data;
  },

  async getMyNotes() {
    const response = await api.get('/notes/mine');
    return response.data;
  },

  async updateMyNote(noteId, payload) {
    const response = await api.put(`/notes/${noteId}`, payload);
    return response.data;
  },

  async deleteMyNote(noteId) {
    const response = await api.delete(`/notes/${noteId}`);
    return response.data;
  },

  async toggleMyNoteVisibility(noteId, isHidden) {
    const response = await api.patch(`/notes/${noteId}/visibility`, { isHidden });
    return response.data;
  },

  async rateNote(noteId, value) {
    const response = await api.post(`/notes/${noteId}/rate`, { value });
    return response.data;
  },

  async openNoteFile(note) {
    const token = await tokenStorage.getToken();
    if (!token) {
      throw new Error('Authentication required to download file');
    }
    const noteId = note?._id;
    if (!noteId) {
      throw new Error('Note id not available');
    }
    const url = `${API_BASE_URL}/notes/${noteId}/download?token=${encodeURIComponent(token)}`;
    if (!url) {
      throw new Error('File URL not available');
    }
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      throw new Error('Cannot open note file URL');
    }
    await Linking.openURL(url);
  },

  async getAllNotesAsAdmin() {
    const response = await api.get('/admin/notes');
    return response.data;
  },

  async deleteAnyNoteAsAdmin(noteId) {
    const response = await api.delete(`/admin/notes/${noteId}`);
    return response.data;
  },

  async toggleAnyNoteVisibilityAsAdmin(noteId, isHidden) {
    const response = await api.patch(`/admin/notes/${noteId}/visibility`, { isHidden });
    return response.data;
  },
};
