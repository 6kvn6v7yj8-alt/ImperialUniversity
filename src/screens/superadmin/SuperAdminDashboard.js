import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator, RefreshControl, Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { generateDailyReport, saveReportToFirestore } from '../../services/reportService';

const { width } = Dimensions.get('window');

export default function SuperAdminDashboard({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [report, setReport] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDashboard();
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const loadDashboard = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) setUserData(userDoc.data());
      }
      const result = await generateDailyReport();
      if (result.success) setReport(result.report);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleGenerateAndSave = async () => {
    setLoading(true);
    const result = await generateDailyReport();
    if (result.success) {
      await saveReportToFirestore(result.report);
      setReport(result.report);
      alert('✅ تم إنشاء وحفظ التقرير اليومي');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>جاري إنشاء التقرير...</Text>
      </View>
    );
  }

  const s = report?.sections || {};
  const sum = report?.summary || {};

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} />}>
      <LinearGradient colors={['#0F172A', '#1E3A5F']} style={styles.header}>
        <Text style={styles.headerTitle}>👑 لوحة المدير العام</Text>
        <Text style={styles.headerSub}>مرحباً، {userData?.name || 'Super Admin'}</Text>
        <Text style={styles.headerDate}>{report?.date} - {report?.time}</Text>
      </LinearGradient>

      {/* Summary Cards */}
      <Animated.View style={[styles.statsGrid, { opacity: fadeAnim }]}>
        <View style={[styles.statCard, { backgroundColor: '#FFF7ED' }]}>
          <Text style={[styles.statNum, { color: '#f59e0b' }]}>{sum.onlineNow || 0}</Text>
          <Text style={styles.statLabel}>🟢 متصل الآن</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
          <Text style={[styles.statNum, { color: '#3b82f6' }]}>{sum.totalStudents || 0}</Text>
          <Text style={styles.statLabel}>👨‍🎓 طالب</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
          <Text style={[styles.statNum, { color: '#10b981' }]}>{sum.activeDoctors || 0}</Text>
          <Text style={styles.statLabel}>👨‍🏫 دكتور نشط</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.statNum, { color: '#d97706' }]}>{sum.activeLectures || 0}</Text>
          <Text style={styles.statLabel}>📅 محاضرة جارية</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
          <Text style={[styles.statNum, { color: '#ef4444' }]}>{sum.cancelledLectures || 0}</Text>
          <Text style={styles.statLabel}>❌ محاضرة ملغية</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#EDE9FE' }]}>
          <Text style={[styles.statNum, { color: '#8b5cf6' }]}>{sum.attendanceRate || 0}%</Text>
          <Text style={styles.statLabel}>📋 نسبة الحضور</Text>
        </View>
      </Animated.View>

      {/* Generate Report Button */}
      <TouchableOpacity style={styles.reportBtn} onPress={handleGenerateAndSave}>
        <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.reportGradient}>
          <MaterialCommunityIcons name="file-document-edit" size={22} color="#FFF" />
          <Text style={styles.reportBtnText}>إنشاء وحفظ التقرير اليومي</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Animated.View style={{ opacity: fadeAnim }}>
        {/* المستخدمون المتصلون */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🟢 المتصلون الآن ({sum.onlineNow || 0})</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineChip}><Text style={styles.onlineChipText}>👨‍🎓 {s.users?.onlineStudents || 0} طلاب</Text></View>
            <View style={styles.onlineChip}><Text style={styles.onlineChipText}>👨‍🏫 {s.users?.onlineDoctors || 0} دكاترة</Text></View>
            <View style={styles.onlineChip}><Text style={styles.onlineChipText}>👨‍💼 {s.users?.onlineAdmins || 0} إدارة</Text></View>
          </View>
        </View>

        {/* إحصائيات المستخدمين */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 المستخدمين ({s.users?.total || 0})</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>طلاب:</Text><Text style={styles.infoValue}>{s.users?.students || 0}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>دكاترة:</Text><Text style={styles.infoValue}>{s.users?.doctors || 0}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>قادة:</Text><Text style={styles.infoValue}>{s.users?.leaders || 0}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>إدارة:</Text><Text style={styles.infoValue}>{s.users?.admins || 0}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>جدد اليوم:</Text><Text style={[styles.infoValue, { color: '#10b981' }]}>{s.users?.newToday || 0}</Text></View>
          <Text style={styles.subTitle}>التوزيع حسب الدفعات:</Text>
          <View style={styles.batchRow}>
            {Object.entries(s.users?.byBatch || {}).map(([k, v]) => (
              <View key={k} style={styles.batchChip}><Text style={styles.batchChipText}>دفعة {k}: {v}</Text></View>
            ))}
          </View>
        </View>

        {/* نشاط الدكاترة */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍🏫 نشاط الدكاترة</Text>
          {(s.doctorActivity || []).slice(0, 5).map((d, i) => (
            <View key={i} style={styles.doctorCard}>
              <View style={styles.doctorHeader}>
                <Text style={styles.doctorName}>{d.name}</Text>
                <View style={[styles.statusDot, { backgroundColor: d.isOnline ? '#10b981' : '#94a3b8' }]} />
              </View>
              <Text style={styles.doctorInfo}>📚 {d.lecturesToday} محاضرات | 🟢 {d.activeLectures} جارية | ❌ {d.cancelledLectures} ملغية | 📋 {d.attendanceRecorded} حضور</Text>
            </View>
          ))}
        </View>

        {/* المحاضرات */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 المحاضرات اليوم</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>إجمالي:</Text><Text style={styles.infoValue}>{s.lectures?.todayTotal || 0}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>جارية:</Text><Text style={[styles.infoValue, { color: '#10b981' }]}>{s.lectures?.todayActive || 0}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>مكتملة:</Text><Text style={[styles.infoValue, { color: '#3b82f6' }]}>{s.lectures?.todayCompleted || 0}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>ملغية:</Text><Text style={[styles.infoValue, { color: '#ef4444' }]}>{s.lectures?.todayCancelled || 0}</Text></View>
          
          {s.lectures?.cancelledList?.length > 0 && (
            <>
              <Text style={[styles.subTitle, { color: '#ef4444' }]}>❌ المحاضرات الملغية:</Text>
              {s.lectures.cancelledList.map((l, i) => (
                <Text key={i} style={styles.cancelledText}>• {l.subject} - {l.startTime} - {l.room} - دفعة {l.batch}</Text>
              ))}
            </>
          )}
        </View>

        {/* الحضور */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 الحضور اليوم</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>إجمالي:</Text><Text style={styles.infoValue}>{s.attendance?.total || 0}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>حاضر:</Text><Text style={[styles.infoValue, { color: '#10b981' }]}>{s.attendance?.present || 0}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>متأخر:</Text><Text style={[styles.infoValue, { color: '#f59e0b' }]}>{s.attendance?.late || 0}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>غائب:</Text><Text style={[styles.infoValue, { color: '#ef4444' }]}>{s.attendance?.absent || 0}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>نسبة الحضور:</Text><Text style={[styles.infoValue, { color: '#10b981', fontSize: 18 }]}>{s.attendance?.attendanceRate || 0}%</Text></View>
        </View>

        {/* النتائج والمدفوعات */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 النتائج والمدفوعات</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>نتائج اليوم:</Text><Text style={styles.infoValue}>{s.grades?.addedToday || 0}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>مدفوعات اليوم:</Text><Text style={styles.infoValue}>{s.payments?.todayCount || 0} ({(s.payments?.todayAmount || 0).toLocaleString()} ريال)</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>إشعارات اليوم:</Text><Text style={styles.infoValue}>{s.notifications?.sentToday || 0}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>شكاوى جديدة:</Text><Text style={styles.infoValue}>{s.complaints?.newToday || 0}</Text></View>
        </View>

        {/* Navigation Menu */}
        <Text style={styles.sectionTitle}>⚙️ إدارة النظام</Text>
        {[
          { icon: 'users', label: 'إدارة المستخدمين', screen: 'ManageUsers', color: '#3b82f6' },
          { icon: 'user-md', label: 'إدارة الدكاترة', screen: 'ViewDoctors', color: '#10b981' },
          { icon: 'crown', label: 'قادة الدفعات', screen: 'ViewLeaders', color: '#f59e0b' },
          { icon: 'calendar-alt', label: 'الجدول الدراسي', screen: 'ManageSchedule', color: '#ec4899' },
          { icon: 'chart-bar', label: 'النتائج', screen: 'ManageGrades', color: '#f97316' },
          { icon: 'money-bill', label: 'المدفوعات', screen: 'ManagePayments', color: '#ef4444' },
          { icon: 'file-alt', label: 'التقارير السابقة', screen: 'DailyReport', color: '#8b5cf6' },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={() => navigation.navigate(item.screen)}>
            <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
              <FontAwesome5 name={item.icon} size={16} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-back" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        ))}
      </Animated.View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.replace('Login')}>
        <Text style={styles.logoutText}>🚪 تسجيل الخروج</Text>
      </TouchableOpacity>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b' },
  header: { padding: 24, paddingTop: 55, paddingBottom: 30, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'right' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'right', marginTop: 4 },
  headerDate: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'right', marginTop: 8 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statCard: { width: '30%', borderRadius: 14, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#64748b', marginTop: 4, textAlign: 'center' },

  reportBtn: { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, overflow: 'hidden' },
  reportGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
  reportBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', textAlign: 'right', marginBottom: 12, marginHorizontal: 16, marginTop: 8 },
  subTitle: { fontSize: 12, fontWeight: '600', color: '#64748b', textAlign: 'right', marginTop: 10, marginBottom: 6 },

  onlineRow: { flexDirection: 'row', gap: 8 },
  onlineChip: { backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  onlineChipText: { fontSize: 12, fontWeight: '600', color: '#166534' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLabel: { fontSize: 13, color: '#64748b' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },

  batchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  batchChip: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  batchChipText: { fontSize: 11, fontWeight: '600', color: '#1e40af' },

  doctorCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8 },
  doctorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  doctorName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  doctorInfo: { fontSize: 11, color: '#64748b', textAlign: 'right' },

  cancelledText: { fontSize: 12, color: '#ef4444', textAlign: 'right', marginBottom: 4 },

  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 6, borderRadius: 14, padding: 14, gap: 12 },
  menuIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b', flex: 1, textAlign: 'right' },

  logoutBtn: { marginHorizontal: 16, marginTop: 10, backgroundColor: '#fef2f2', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' }
});