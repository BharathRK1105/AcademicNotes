import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { USER_ROLES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import StudentDashboardScreen from '../screens/StudentDashboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import UploadNotesScreen from '../screens/UploadNotesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function RoleBasedTabs() {
  const { role } = useAuth();
  const isAdmin = role === USER_ROLES.ADMIN;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'ellipse';
          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Upload') {
            iconName = focused ? 'cloud-upload' : 'cloud-upload-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: isAdmin ? theme.colors.adminAccent : theme.colors.primary,
        tabBarInactiveTintColor: '#867E70',
        tabBarStyle: {
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
        headerStyle: {
          backgroundColor: isAdmin ? '#EAF5FF' : '#E7F2FF',
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleAlign: 'left',
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          color: theme.colors.textPrimary,
        },
        headerTitle: () => <HeaderTitle routeName={route.name} isAdmin={isAdmin} />,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={isAdmin ? AdminDashboardScreen : StudentDashboardScreen}
        options={{ title: isAdmin ? 'Admin Dashboard' : 'Student Dashboard' }}
      />
      <Tab.Screen name="Upload" component={UploadNotesScreen} options={{ title: 'Upload Notes' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
    </Tab.Navigator>
  );
}

function HeaderTitle({ routeName, isAdmin }) {
  const meta = {
    Dashboard: {
      label: isAdmin ? 'Admin Dashboard' : 'Student Dashboard',
      image: isAdmin
        ? 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=120'
        : 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=120',
    },
    Upload: {
      label: 'Upload Notes',
      image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=120',
    },
    Profile: {
      label: 'My Profile',
      image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=120',
    },
  }[routeName] || {
    label: routeName,
    image: 'https://images.unsplash.com/photo-1511629091441-ee46146481b6?w=120',
  };

  return (
    <View style={styles.titleWrap}>
      <Image source={{ uri: meta.image }} style={styles.titleImg} />
      <Text style={styles.titleTxt}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleWrap: { flexDirection: 'row', alignItems: 'center' },
  titleImg: { width: 26, height: 26, borderRadius: 7, marginRight: 8 },
  titleTxt: { fontSize: 17, fontWeight: '800', color: theme.colors.textPrimary },
});
