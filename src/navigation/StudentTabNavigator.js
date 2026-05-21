import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import ScheduleScreen from '../screens/student/ScheduleScreen';
import LibraryScreen from '../screens/student/LibraryScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function StudentTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 12,
          left: 16,
          right: 16,
          backgroundColor: '#FFFFFF',
          borderRadius: 22,
          height: 68,
          paddingBottom: 8,
          paddingTop: 6,
          borderTopWidth: 0,
          shadowColor: '#1E40AF',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 20,
          elevation: 8,
          borderWidth: 1,
          borderColor: 'rgba(30,64,175,0.06)',
        },
        tabBarActiveTintColor: '#1E40AF',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: -2 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={StudentDashboardScreen}
        options={{
          tabBarLabel: 'الرئيسية',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
              <Text style={[styles.icon, focused && styles.iconActive]}>⌂</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          tabBarLabel: 'الجدول',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
              <Text style={[styles.icon, focused && styles.iconActive]}>▦</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarLabel: 'المكتبة',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
              <Text style={[styles.icon, focused && styles.iconActive]}>▣</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'حسابي',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
              <Text style={[styles.icon, focused && styles.iconActive]}>○</Text>
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconBox: { 
    width: 36, 
    height: 36, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    transform: [{ scale: 1 }],
  },
  iconBoxActive: { 
    backgroundColor: 'rgba(30,64,175,0.08)',
    transform: [{ scale: 1.1 }],
  },
  icon: { fontSize: 20, color: '#94A3B8' },
  iconActive: { color: '#1E40AF', fontSize: 22 },
});