import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { theme } from '../theme';
import AuthStack from './AuthStack';
import RoleBasedTabs from './RoleBasedTabs';
import RoleGuard from './RoleGuard';
import { USER_ROLES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import StudentDashboardScreen from '../screens/StudentDashboardScreen';

const Stack = createStackNavigator();

function FullLoader() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundTop,
      }}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

function ProtectedAdminDashboard() {
  return (
    <RoleGuard allowedRoles={[USER_ROLES.ADMIN]}>
      <AdminDashboardScreen />
    </RoleGuard>
  );
}

function ProtectedStudentDashboard() {
  return (
    <RoleGuard allowedRoles={[USER_ROLES.STUDENT, USER_ROLES.ADMIN]}>
      <StudentDashboardScreen />
    </RoleGuard>
  );
}

export default function AppNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <FullLoader />;
  }

  return (
    <NavigationContainer key={isAuthenticated ? 'app' : 'auth'}>
      {isAuthenticated ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={RoleBasedTabs} />
          <Stack.Screen name="AdminDashboard" component={ProtectedAdminDashboard} />
          <Stack.Screen name="StudentDashboard" component={ProtectedStudentDashboard} />
        </Stack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
