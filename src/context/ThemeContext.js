import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// تعريف الألوان
const Colors = {
  light: {
    primary: '#1a237e',
    secondary: '#0d47a1',
    accent: '#2196f3',
    background: '#f5f5f5',
    surface: '#ffffff',
    cardBackground: '#ffffff',
    text: '#212121',
    textSecondary: '#757575',
    border: '#e0e0e0',
    error: '#d32f2f',
    success: '#388e3c',
    warning: '#f57c00',
    info: '#1976d2',
    inputBackground: '#fafafa',
    disabled: '#9e9e9e',
    placeholder: '#bdbdbd',
    overlay: 'rgba(0,0,0,0.5)',
    shadow: '#000000',
  },
  dark: {
    primary: '#3f51b5',
    secondary: '#1976d2',
    accent: '#64b5f6',
    background: '#121212',
    surface: '#1e1e1e',
    cardBackground: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#b0b0b0',
    border: '#333333',
    error: '#ef5350',
    success: '#66bb6a',
    warning: '#ffa726',
    info: '#42a5f5',
    inputBackground: '#2c2c2c',
    disabled: '#616161',
    placeholder: '#757575',
    overlay: 'rgba(0,0,0,0.7)',
    shadow: '#ffffff',
  },
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);
  const [theme, setTheme] = useState(Colors.light);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('theme');
      if (saved) {
        setIsDark(saved === 'dark');
        setTheme(saved === 'dark' ? Colors.dark : Colors.light);
      }
    } catch (e) {
      console.log('Error loading theme');
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    setTheme(newTheme ? Colors.dark : Colors.light);
    await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, Colors }}>
      {children}
    </ThemeContext.Provider>
  );
};