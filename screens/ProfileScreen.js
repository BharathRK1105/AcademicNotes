import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [myNotes, setMyNotes] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    department: '',
    semester: '',
  });

  useEffect(() => {
    loadUserData();
    loadMyNotes();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUserData = await AsyncStorage.getItem('currentUser');
      if (currentUserData) {
        const userData = JSON.parse(currentUserData);
        setUser(userData);
        setEditFormData({
          fullName: userData.fullName,
          department: userData.department,
          semester: userData.semester,
        });
      }
    } catch (error) {
      console.log('Error loading user data:', error);
    }
  };

  const loadMyNotes = async () => {
    try {
      const currentUserData = await AsyncStorage.getItem('currentUser');
      const notesData = await AsyncStorage.getItem('notes');
      
      if (currentUserData && notesData) {
        const currentUser = JSON.parse(currentUserData);
        const allNotes = JSON.parse(notesData);
        const userNotes = allNotes.filter(
          note => note.uploadedBy === currentUser.fullName
        );
        setMyNotes(userNotes);
      }
    } catch (error) {
      console.log('Error loading my notes:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      // Update current user
      const updatedUser = { ...user, ...editFormData };
      await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));

      // Update in users list
      const usersData = await AsyncStorage.getItem('users');
      if (usersData) {
        const users = JSON.parse(usersData);
        const updatedUsers = users.map(u => 
          u.id === user.id ? updatedUser : u
        );
        await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
      }

      setUser(updatedUser);
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
      console.log('Update error:', error);
    }
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      await AsyncStorage.removeItem('currentUser');
      setLogoutModalVisible(false);
      navigation.replace('Login');
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={60} color="#fff" />
        </View>
        <Text style={styles.userName}>{user.fullName}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.infoRow}>
          <Ionicons name="school-outline" size={20} color="#2E8B7B" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>{user.department}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={20} color="#2E8B7B" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Semester</Text>
            <Text style={styles.infoValue}>{user.semester}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setEditModalVisible(true)}
        >
          <Ionicons name="create-outline" size={20} color="#2E8B7B" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.sectionTitle}>My Statistics</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Ionicons name="document-text" size={30} color="#2E8B7B" />
            <Text style={styles.statNumber}>{myNotes.length}</Text>
            <Text style={styles.statLabel}>Uploaded Notes</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="download" size={30} color="#27AE60" />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Downloads</Text>
          </View>
        </View>
      </View>

      <View style={styles.myNotesCard}>
        <Text style={styles.sectionTitle}>My Uploaded Notes</Text>
        {myNotes.length > 0 ? (
          myNotes.map((note) => (
            <View key={note.id} style={styles.noteItem}>
              <Ionicons name="document-text-outline" size={24} color="#2E8B7B" />
              <View style={styles.noteContent}>
                <Text style={styles.noteTitle}>{note.title}</Text>
                <Text style={styles.noteSubject}>{note.subject} • {note.semester}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>You haven't uploaded any notes yet</Text>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.logoutModalContent}>
            <Text style={styles.logoutModalTitle}>Logout</Text>
            <Text style={styles.logoutModalText}>Are you sure you want to logout?</Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutCancelButton]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutConfirmButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={editFormData.fullName}
              onChangeText={(text) => setEditFormData({...editFormData, fullName: text})}
            />

            <Text style={styles.label}>Department</Text>
            <TextInput
              style={styles.input}
              value={editFormData.department}
              onChangeText={(text) => setEditFormData({...editFormData, department: text})}
            />

            <Text style={styles.label}>Semester</Text>
            <TextInput
              style={styles.input}
              value={editFormData.semester}
              onChangeText={(text) => setEditFormData({...editFormData, semester: text})}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateProfile}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7F2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    backgroundColor: '#2E8B7B',
    paddingVertical: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  infoCard: {
    backgroundColor: '#FFF1E8',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F4D3C0',
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C2F2E',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#C1967E',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#2C2F2E',
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE4D6',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 15,
  },
  editButtonText: {
    color: '#2E8B7B',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsCard: {
    backgroundColor: '#FFF1E8',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F4D3C0',
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C2F2E',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#C1967E',
    marginTop: 4,
  },
  myNotesCard: {
    backgroundColor: '#FFF1E8',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F4D3C0',
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  noteContent: {
    marginLeft: 12,
    flex: 1,
  },
  noteTitle: {
    fontSize: 15,
    color: '#2C2F2E',
    fontWeight: '500',
  },
  noteSubject: {
    fontSize: 12,
    color: '#C1967E',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#C1967E',
    fontSize: 14,
    paddingVertical: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1E8',
    marginHorizontal: 15,
    marginBottom: 30,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E74C3C',
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF1E8',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    borderWidth: 1,
    borderColor: '#F4D3C0',
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 7,
  },
  logoutModalContent: {
    backgroundColor: '#FFF1E8',
    borderRadius: 18,
    padding: 22,
    width: '82%',
    borderWidth: 1,
    borderColor: '#F4D3C0',
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 7,
  },
  logoutModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C2F2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  logoutModalText: {
    fontSize: 15,
    color: '#C1967E',
    textAlign: 'center',
    marginBottom: 18,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logoutModalButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  logoutCancelButton: {
    backgroundColor: '#FFE4D6',
    borderWidth: 1,
    borderColor: '#F4D3C0',
  },
  logoutConfirmButton: {
    backgroundColor: '#E74C3C',
  },
  logoutCancelText: {
    color: '#2E8B7B',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C2F2E',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2F2E',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#F0D8C9',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2C2F2E',
    backgroundColor: '#FFF8F3',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#2C2F2E',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2E8B7B',
    shadowColor: '#2E8B7B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

