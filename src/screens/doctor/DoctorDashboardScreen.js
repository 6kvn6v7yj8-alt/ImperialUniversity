import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';

export default function DoctorDashboardScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>مرحباً دكتور! 👋</Text>
        <Text style={styles.subtitle}>لوحة تحكم الدكتور</Text>
      </View>

      <View style={styles.statsRow}>
        {[
          { num: '120', label: 'طالب', icon: '◆' },
          { num: '3', label: 'مواد', icon: '◫' },
          { num: '90%', label: 'نسبة النجاح', icon: '◬' },
        ].map((stat, i) => (
          <Animated.View key={i} style={[styles.statCard, { opacity: fadeAnim }]}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={styles.statNum}>{stat.num}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Animated.View>
        ))}
      </View>

      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>الإجراءات</Text>
        
        <TouchableOpacity style={styles.qrButton} onPress={() => navigation.navigate('DoctorQRCode')} activeOpacity={0.8}>
          <View style={styles.qrIconBox}>
            <Text style={styles.qrIcon}>📱</Text>
          </View>
          <View style={styles.qrContent}>
            <Text style={styles.qrTitle}>عرض QR Code للحضور</Text>
            <Text style={styles.qrSub}>اسمح للطلاب بمسح الكود لتسجيل حضورهم</Text>
          </View>
          <Text style={styles.qrArrow}>→</Text>
        </TouchableOpacity>

        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('ViewAttendance')} activeOpacity={0.8}>
            <View style={styles.menuIconBox}>
              <Text style={styles.menuIcon}>📋</Text>
            </View>
            <Text style={styles.menuLabel}>سجل الحضور</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuCard} activeOpacity={0.8}>
            <View style={styles.menuIconBox}>
              <Text style={styles.menuIcon}>👨‍🎓</Text>
            </View>
            <Text style={styles.menuLabel}>إدارة الطلاب</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuCard} activeOpacity={0.8}>
            <View style={styles.menuIconBox}>
              <Text style={styles.menuIcon}>📊</Text>
            </View>
            <Text style={styles.menuLabel}>رفع درجات</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuCard} activeOpacity={0.8}>
            <View style={styles.menuIconBox}>
              <Text style={styles.menuIcon}>◎</Text>
            </View>
            <Text style={styles.menuLabel}>الإشعارات</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.logoutText}>⇥ تسجيل الخروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  header: { backgroundColor: '#1E40AF', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: -16, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 14, alignItems: 'center' },
  statIcon: { fontSize: 18, color: '#1E40AF', marginBottom: 4 },
  statNum: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 14 },
  qrButton: { backgroundColor: '#1E40AF', borderRadius: 20, padding: 22, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  qrIconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  qrIcon: { fontSize: 28 },
  qrContent: { flex: 1 },
  qrTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  qrSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'right', marginTop: 4 },
  qrArrow: { fontSize: 24, color: '#FFF', marginLeft: 8 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuCard: { width: '47%', backgroundColor: '#FFF', borderRadius: 16, padding: 20, alignItems: 'center' },
  menuIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(30,64,175,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  menuIcon: { fontSize: 24 },
  menuLabel: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  logoutBtn: { marginHorizontal: 20, marginBottom: 32, marginTop: 8, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});