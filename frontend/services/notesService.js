import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { API_BASE_URL, api } from './api';
import { tokenStorage } from './tokenStorage';

export const notesService = {
  async postMultipart(endpoint, formData) {
    if (Platform.OS === 'web') {
      return api.post(endpoint, formData, { timeout: 30000 });
    }

    const token = await tokenStorage.getToken();
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: 'application/json',
      },
      body: formData,
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_error) {
      data = null;
    }

    if (!response.ok) {
      const message = data?.message || `Upload failed with status ${response.status}`;
      throw new Error(message);
    }

    return { data };
  },

  async normalizeFileForUpload(file) {
    if (!file?.uri || Platform.OS === 'web') {
      return file;
    }

    const uri = String(file.uri);
    const isFileUri = uri.startsWith('file://');
    if (isFileUri) {
      return file;
    }

    try {
      const fallbackName = file?.name || `upload-${Date.now()}`;
      const targetUri = `${FileSystem.cacheDirectory || ''}${fallbackName}`;
      await FileSystem.copyAsync({ from: uri, to: targetUri });
      return { ...file, uri: targetUri, name: file?.name || fallbackName };
    } catch (_error) {
      return file;
    }
  },

  async appendFileToFormData(formData, file, fieldName = 'file') {
    if (Platform.OS === 'web') {
      if (file.file) {
        formData.append(fieldName, file.file, file.name || 'upload-file');
      } else {
        const fileResponse = await fetch(file.uri);
        const blob = await fileResponse.blob();
        formData.append(fieldName, blob, file.name || 'upload-file');
      }
    } else {
      const normalized = await this.normalizeFileForUpload(file);
      const fallbackName = file?.uri ? file.uri.split('/').pop() : '';
      const resolvedName = normalized?.name || fallbackName || `upload-${Date.now()}`;
      const ext = resolvedName.includes('.') ? resolvedName.split('.').pop().toLowerCase() : '';
      const inferredType =
        ext === 'pdf' ? 'application/pdf' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
      const mimeType = normalized?.mimeType || normalized?.type || inferredType;
      let finalName = resolvedName;
      if (!ext) {
        if (mimeType === 'application/pdf') {
          finalName = `${resolvedName}.pdf`;
        } else if (mimeType === 'image/jpeg') {
          finalName = `${resolvedName}.jpg`;
        }
      }
      formData.append(fieldName, {
        uri: normalized?.uri,
        name: finalName,
        type: mimeType,
      });
    }
  },

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
    await this.appendFileToFormData(formData, payload.file, 'file');

    const response = await this.postMultipart('/notes', formData);
    return response.data;
  },

  async createNotesBulk(payload) {
    const formData = new FormData();
    if (payload.description) {
      formData.append('description', payload.description);
    }
    if (payload.subject) {
      formData.append('subject', payload.subject);
    }
    if (payload.semester) {
      formData.append('semester', payload.semester);
    }
    if (payload.bulkTitle) {
      formData.append('bulkTitle', payload.bulkTitle);
    }
    formData.append('titles', JSON.stringify(payload.titles || []));

    for (const file of payload.files || []) {
      await this.appendFileToFormData(formData, file, 'files');
    }

    const response = await this.postMultipart('/notes/bulk', formData);
    return response.data;
  },

  async getFeedNotes() {
    const response = await api.get('/notes/feed');
    return response.data;
  },

  async getSavedNotes() {
    const response = await api.get('/notes/saved/me');
    return response.data;
  },

  async getMyNotes() {
    const response = await api.get('/notes/mine');
    return response.data;
  },

  async getMyActivity() {
    const response = await api.get('/notes/activity/me');
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

  async toggleSaveNote(noteId) {
    const response = await api.patch(`/notes/${noteId}/save`);
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
