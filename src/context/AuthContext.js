import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const savedUser = await AsyncStorage.getItem('userData');
      if (token && savedUser) {
        setUserData(JSON.parse(savedUser));
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.log('Auth check error');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      // محاكاة تسجيل الدخول - استبدلها بالـ API الحقيقي
      const fakeUser = {
        id: '1',
        fullName: 'Student User',
        email: email,
        studentId: 'STU001',
        department: 'Computer Science',
        role: 'student',
      };
      
      await AsyncStorage.setItem('token', 'fake-token-123');
      await AsyncStorage.setItem('userData', JSON.stringify(fakeUser));
      
      setUserData(fakeUser);
      setIsAuthenticated(true);
      setLoading(false);
      return { success: true };
    } catch (e) {
      setLoading(false);
      return { success: false, error: 'Login failed' };
    }
  };

  const register = async (userInfo) => {
    try {
      setLoading(true);
      const fakeUser = {
        id: '1',
        ...userInfo,
        role: 'student',
      };
      
      await AsyncStorage.setItem('token', 'fake-token-123');
      await AsyncStorage.setItem('userData', JSON.stringify(fakeUser));
      
      setUserData(fakeUser);
      setIsAuthenticated(true);
      setLoading(false);
      return { success: true };
    } catch (e) {
      setLoading(false);
      return { success: false, error: 'Registration failed' };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userData');
    setUser(null);
    setUserData(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      user, userData, loading, isAuthenticated,
      login, register, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};