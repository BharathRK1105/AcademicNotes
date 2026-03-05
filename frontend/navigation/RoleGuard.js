import React from 'react';
import AccessDeniedScreen from '../screens/AccessDeniedScreen';
import { useAuth } from '../context/AuthContext';

export default function RoleGuard({ allowedRoles, children }) {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <AccessDeniedScreen reason="Authentication required." />;
  }
  if (!allowedRoles.includes(currentUser.role)) {
    return <AccessDeniedScreen reason="You do not have permission to access this screen." />;
  }
  return children;
}
