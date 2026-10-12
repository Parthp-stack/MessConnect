import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { storage } from '../services/storage';

const AuthContext = createContext();

export const DEMO_CREDENTIALS = {
  CUSTOMER: {
    name: 'Nilesh Patil (Student)',
    email: 'parthgopalpatil@gmail.com',
    phone: '9423490514',
    password: '@Xyz12345',
    role: 'CUSTOMER'
  },
  OWNER: {
    name: 'Kailash Patil (Approved Partner)',
    email: 'parthpatil503@gmail.com',
    phone: '9423490513',
    password: '@Xyz12345',
    role: 'OWNER',
    verificationStatus: 'APPROVED'
  },
  OWNER_PENDING: {
    name: 'Ganesh More (Partner)',
    email: 'ganesh.more@moshi.com',
    phone: '+91 98231 44556',
    password: 'password123',
    role: 'OWNER',
    verificationStatus: 'APPROVED'
  },
  OWNER_CHANGES: {
    name: 'Krishna Kulkarni (Partner)',
    email: 'krishna.k@ravet.com',
    phone: '+91 99755 88221',
    password: 'password123',
    role: 'OWNER',
    verificationStatus: 'APPROVED'
  },
  ADMIN: {
    name: 'Parth (Platform Admin)',
    email: 'admin@messconnect.in',
    phone: '9423490513',
    password: 'password123',
    role: 'ADMIN'
  }
};

export const SUPPORT_CONTACTS = [
  {
    id: 'rohit',
    name: 'Rohit',
    phone: '8766793139',
    formattedPhone: '+91 87667 93139',
    role: 'Admin Support',
    designation: 'Admin Support Executive',
    type: 'admin',
    badge: 'Admin Support',
    hours: '08:00 AM – 10:30 PM (Daily)',
    whatsappUrl: 'https://wa.me/918766793139',
    callUrl: 'tel:+918766793139'
  },
  {
    id: 'shreyash',
    name: 'Shreyash',
    phone: '9309294400',
    formattedPhone: '+91 93092 94400',
    role: 'Admin Support',
    designation: 'Admin Support Executive',
    type: 'admin',
    badge: 'Admin Support',
    hours: '08:00 AM – 10:30 PM (Daily)',
    whatsappUrl: 'https://wa.me/919309294400',
    callUrl: 'tel:+919309294400'
  },
  {
    id: 'parth',
    name: 'Parth',
    phone: '9423490513',
    formattedPhone: '+91 94234 90513',
    role: 'Admin Support & Platform Lead',
    designation: 'SuperAdmin & Support Lead',
    type: 'admin',
    badge: 'Admin Support',
    hours: '24/7 Priority Desk',
    whatsappUrl: 'https://wa.me/919423490513',
    callUrl: 'tel:+919423490513'
  }
];

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('messconnect_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem('messconnect_token') || null;
  });

  const [loading, setLoading] = useState(false);

  const currentRole = currentUser?.role || null;
  const isAuthenticated = Boolean(currentUser);

  // Real Login
  const login = async ({ identifier, password, role }) => {
    setLoading(true);
    try {
      const res = await api.login({ identifier, password, role });
      if (res && res.success && res.user) {
        setCurrentUser(res.user);
        setAuthToken(res.token);
        localStorage.setItem('messconnect_user', JSON.stringify(res.user));
        localStorage.setItem('messconnect_token', res.token);
        storage.setPreference('active_role', res.user.role);
        return { success: true, user: res.user };
      }
      throw new Error(res?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Real Register (Direct Fallback)
  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await api.register(userData);
      if (res && res.success && res.user) {
        setCurrentUser(res.user);
        setAuthToken(res.token);
        localStorage.setItem('messconnect_user', JSON.stringify(res.user));
        localStorage.setItem('messconnect_token', res.token);
        storage.setPreference('active_role', res.user.role);
        return { success: true, user: res.user, message: res.message };
      }
      throw new Error(res?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send Registration OTP (Expires in 3 minutes)
  const registerSendOtp = async (userData) => {
    setLoading(true);
    try {
      return await api.registerSendOtp(userData);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Registration OTP (One-time login upon verification)
  const registerVerifyOtp = async (email, otp) => {
    setLoading(true);
    try {
      const res = await api.registerVerifyOtp({ email, otp });
      if (res && res.success && res.user) {
        setCurrentUser(res.user);
        setAuthToken(res.token);
        localStorage.setItem('messconnect_user', JSON.stringify(res.user));
        localStorage.setItem('messconnect_token', res.token);
        storage.setPreference('active_role', res.user.role);
        return { success: true, user: res.user, message: res.message };
      }
      throw new Error(res?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Mess Owner Request Login OTP (anytime, 3-minute expiry)
  const ownerRequestLoginOtp = async (identifier) => {
    setLoading(true);
    try {
      return await api.ownerRequestLoginOtp(identifier);
    } finally {
      setLoading(false);
    }
  };

  // Mess Owner Verify Login OTP
  const ownerVerifyLoginOtp = async (email, otp) => {
    setLoading(true);
    try {
      const res = await api.ownerVerifyLoginOtp({ email, otp });
      if (res && res.success && res.user) {
        setCurrentUser(res.user);
        setAuthToken(res.token);
        localStorage.setItem('messconnect_user', JSON.stringify(res.user));
        localStorage.setItem('messconnect_token', res.token);
        storage.setPreference('active_role', res.user.role);
        return { success: true, user: res.user, message: res.message };
      }
      throw new Error(res?.message || 'Login verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem('messconnect_user');
    localStorage.removeItem('messconnect_token');
    storage.setPreference('active_role', null);
  };

  // Quick Demo Login (for instant testing)
  const quickDemoLogin = async (role = 'CUSTOMER') => {
    const cred = DEMO_CREDENTIALS[role];
    if (!cred) return;
    return await login({ identifier: cred.email, password: cred.password, role: cred.role || role });
  };

  // Forgot Password (generates OTP)
  const forgotPassword = async (email, role) => {
    return await api.forgotPassword({ email, role });
  };

  // Reset Password (verifies OTP and sets new password)
  const resetPassword = async (email, otp, newPassword) => {
    return await api.resetPassword({ email, otp, newPassword });
  };

  // Update Profile
  const updateProfile = async (updates) => {
    if (!currentUser) return;
    try {
      const res = await api.updateUserProfile({
        userId: currentUser.id,
        ...updates
      });
      if (res && res.user) {
        const merged = { ...currentUser, ...res.user };
        setCurrentUser(merged);
        localStorage.setItem('messconnect_user', JSON.stringify(merged));
        return { success: true, user: merged };
      }
    } catch (e) {
      console.warn('Profile update fallback:', e);
      const merged = { ...currentUser, ...updates };
      setCurrentUser(merged);
      localStorage.setItem('messconnect_user', JSON.stringify(merged));
      return { success: true, user: merged };
    }
  };

  // Refresh latest User data from DB
  const refreshUser = async () => {
    if (!currentUser) return;
    try {
      const res = await api.getMe();
      if (res && res.user) {
        setCurrentUser(res.user);
        localStorage.setItem('messconnect_user', JSON.stringify(res.user));
        return res.user;
      }
    } catch (e) {
      console.warn('refreshUser error:', e);
    }
  };

  // Role Switcher for dev/preview
  const switchRole = (role) => {
    quickDemoLogin(role);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      currentRole,
      authToken,
      isAuthenticated,
      loading,
      login,
      register,
      registerSendOtp,
      registerVerifyOtp,
      ownerRequestLoginOtp,
      ownerVerifyLoginOtp,
      logout,
      quickDemoLogin,
      forgotPassword,
      resetPassword,
      updateProfile,
      refreshUser,
      switchRole,
      DEMO_CREDENTIALS
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
