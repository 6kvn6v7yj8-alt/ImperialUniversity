import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Animated } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) setUserData(docSnap.data());
      }
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]).start();
    }
  };

  if (loading || !userData) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  const infoItems = [
    { label: 'الاسم الكامل', value: userData.name },
    { label: 'رقم الهوية', value: userData.nationalId },
    { label: 'رقم الهاتف', value: userData.phone },
    { label: 'الدفعة', value: userData.batch },
    { label: 'البريد الإلكتروني', value: userData.email },
    { label: 'الجنسية', value: userData.nationality },
    { label: 'التخصص', value: userData.specialization },
    { label: 'تاريخ التسجيل', value: userData.createdAt },
  ];

  const getRoleLabel = (role) => {
    if (role === 'student') return 'طالب';
    if (role === 'doctor') return 'دكتور';
    if (role === 'admin') return 'مدير';
    return 'طالب';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Image 
          source={require('../../../assets/logo.png')} 
          style={styles.logoImg}
          resizeMode="contain"
        />
        <Animated.View style={[styles.avatarBox, { transform: [{ scale: scaleAnim }] }]}>
          {userData.photo ? (
            <Image source={{ uri: `data:image/jpeg;base64,${userData.photo}` }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarIcon}>○</Text>
          )}
        </Animated.View>
        <Text style={styles.name}>{userData.name || 'مستخدم'}</Text>
        <View style={styles.roleGlass}>
          <Text style={styles.roleText}>{getRoleLabel(userData.role)}</Text>
        </View>
        {userData.specialization && <Text style={styles.spec}>{userData.specialization}</Text>}
      </View>

      <Animated.View style={[styles.infoCard, { opacity: fadeAnim }]}>
        <Text style={styles.infoTitle}>📋 المعلومات الشخصية</Text>
        {infoItems.map((item, i) => (
          <View key={i}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value || '-'}</Text>
            </View>
            {i < infoItems.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Animated.View>

      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.menuIcon}>✏️</Text>
          <Text style={styles.menuText}>تعديل الملف الشخصي</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Notifications')}>
          <Text style={styles.menuIcon}>◎</Text>
          <Text style={styles.menuText}>الإشعارات</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Chat')}>
          <Text style={styles.menuIcon}>◉</Text>
          <Text style={styles.menuText}>الدعم الفني</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Payment')}>
          <Text style={styles.menuIcon}>◇</Text>
          <Text style={styles.menuText}>المصروفات</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.logoutBtn} 
        onPress={() => { logout(); navigation.navigate('Login'); }}
      >
        <Text style={styles.logoutText}>⇥ تسجيل الخروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  header: { backgroundColor: '#1E40AF', paddingTop: 50, paddingBottom: 28, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  logoImg: { width: 55, height: 55, borderRadius: 14, marginBottom: 14, backgroundColor: '#FFFFFF', padding: 4 },
  avatarBox: { width: 90, height: 90, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarIcon: { fontSize: 38, color: '#FFF' },
  name: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 10 },
  roleGlass: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  roleText: { fontSize: 12, color: '#FFF', fontWeight: '600' },
  spec: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  infoCard: { backgroundColor: 'rgba(255,255,255,0.9)', marginHorizontal: 16, marginTop: -16, borderRadius: 20, padding: 20 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  infoLabel: { fontSize: 13, color: '#64748B' },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  divider: { height: 1, backgroundColor: 'rgba(30,64,175,0.06)' },
  menuSection: { padding: 16 },
  menuItem: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 14, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  menuIcon: { fontSize: 16, color: '#1E40AF', marginRight: 12 },
  menuText: { fontSize: 14, fontWeight: '600', color: '#1E293B', flex: 1 },
  menuArrow: { fontSize: 14, color: '#1E40AF' },
  logoutBtn: { marginHorizontal: 16, marginBottom: 32, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});