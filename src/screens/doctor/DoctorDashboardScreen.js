import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

export default function DoctorDashboardScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) setUserData(docSnap.data());
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👨‍🏫 لوحة الدكتور</Text>
        <Text style={styles.headerSub}>مرحباً، {userData?.name || 'دكتور'}</Text>
      </View>

      {/* كارد الملف الشخصي */}
      <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('DoctorProfile')} activeOpacity={0.8}>
        <View style={styles.profileAvatar}>
          {userData?.photo ? (
            <Image source={{ uri: `data:image/jpeg;base64,${userData.photo}` }} style={styles.profileImg} />
          ) : (
            <Text style={styles.profileAvatarText}>👨‍🏫</Text>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userData?.name || 'دكتور'}</Text>
          <Text style={styles.profileEmail}>{userData?.email || ''}</Text>
          <Text style={styles.profileSubject}>{userData?.subject || userData?.specialization || 'المادة'}</Text>
        </View>
        <Text style={styles.profileArrow}>→</Text>
      </TouchableOpacity>

      {/* إحصائيات */}
      <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>3</Text>
          <Text style={styles.statLabel}>📚 مواد</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>120</Text>
          <Text style={styles.statLabel}>👨‍🎓 طالب</Text>
        </View>
      </Animated.View>

      {/* الإجراءات */}
      <Animated.View style={[styles.menuSection, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DoctorQRCode')} activeOpacity={0.8}>
          <View style={[styles.menuIcon, { backgroundColor: '#EEF2FF' }]}><Text style={styles.menuEmoji}>📱</Text></View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>QR Code الحضور</Text>
            <Text style={styles.menuSub}>عرض كود لتسجيل حضور الطلاب</Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ViewAttendance')} activeOpacity={0.8}>
          <View style={[styles.menuIcon, { backgroundColor: '#DCFCE7' }]}><Text style={styles.menuEmoji}>📋</Text></View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>سجل الحضور</Text>
            <Text style={styles.menuSub}>عرض سجلات حضور الطلاب</Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.8}>
          <View style={[styles.menuIcon, { backgroundColor: '#FCE7F3' }]}><Text style={styles.menuEmoji}>🔔</Text></View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>الإشعارات</Text>
            <Text style={styles.menuSub}>متابعة الإشعارات الواردة</Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
      </Animated.View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.logoutText}>🚪 تسجيل الخروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  header: { backgroundColor: '#1E40AF', padding: 24, paddingTop: 50, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginTop: 4 },

  profileCard: { backgroundColor: '#1E40AF', marginHorizontal: 16, borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: -20, shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
  profileAvatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 14, overflow: 'hidden' },
  profileImg: { width: '100%', height: '100%' },
  profileAvatarText: { fontSize: 28 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  profileEmail: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 2 },
  profileSubject: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: 2 },
  profileArrow: { fontSize: 22, color: '#FFF' },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statNum: { fontSize: 26, fontWeight: '800', color: '#1E40AF' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },

  menuSection: { paddingHorizontal: 16, marginBottom: 20 },
  menuItem: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  menuIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuEmoji: { fontSize: 22 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  menuSub: { fontSize: 11, color: '#64748B', textAlign: 'right', marginTop: 2 },
  menuArrow: { fontSize: 18, color: '#CBD5E1' },

  logoutBtn: { marginHorizontal: 16, marginBottom: 30, backgroundColor: '#FEF2F2', borderRadius: 18, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});