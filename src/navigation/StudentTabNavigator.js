import React, { useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import ScheduleScreen from '../screens/student/ScheduleScreen';
import LibraryScreen from '../screens/student/LibraryScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

function AnimatedTabIcon({ icon, focused }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1.3, friction: 4, tension: 60, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 1, duration: 300, easing: Easing.bounce, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [focused]);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[
      styles.iconBox,
      focused && styles.iconBoxActive,
      { transform: [{ scale: scaleAnim }, { rotateY: spin }] }
    ]}>
      <Text style={[styles.icon, focused && styles.iconActive]}>{icon}</Text>
      {focused && <View style={styles.activeDot} />}
    </Animated.View>
  );
}

export default function StudentTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 14,
          left: 14,
          right: 14,
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          height: 68,
          paddingBottom: 8,
          paddingTop: 6,
          borderTopWidth: 0,
          shadowColor: '#1E40AF',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarActiveTintColor: '#1E40AF',
        tabBarInactiveTintColor: '#CBD5E1',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: -4 },
      }}
    >
      <Tab.Screen name="Dashboard" component={StudentDashboardScreen}
        options={{ tabBarLabel: 'الرئيسية', tabBarIcon: ({ focused }) => <AnimatedTabIcon icon="⬡" focused={focused} /> }} />
      <Tab.Screen name="Schedule" component={ScheduleScreen}
        options={{ tabBarLabel: 'الجدول', tabBarIcon: ({ focused }) => <AnimatedTabIcon icon="▦" focused={focused} /> }} />
      <Tab.Screen name="Library" component={LibraryScreen}
        options={{ tabBarLabel: 'المكتبة', tabBarIcon: ({ focused }) => <AnimatedTabIcon icon="▣" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarLabel: 'حسابي', tabBarIcon: ({ focused }) => <AnimatedTabIcon icon="○" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: 38, height: 38, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  iconBoxActive: { backgroundColor: 'rgba(30,64,175,0.08)' },
  icon: { fontSize: 21, color: '#CBD5E1' },
  iconActive: { color: '#1E40AF', fontSize: 23 },
  activeDot: { position: 'absolute', bottom: -6, width: 4, height: 4, borderRadius: 2, backgroundColor: '#1E40AF' },
});