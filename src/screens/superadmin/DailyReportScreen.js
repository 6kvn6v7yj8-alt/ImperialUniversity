import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { generateDailyReport, saveReportToFirestore, getPreviousReports } from '../../services/reportService';

export default function DailyReportScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [previousReports, setPreviousReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadReports();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const loadReports = async () => {
    const prevResult = await getPreviousReports(7);
    if (prevResult.success) {
      setPreviousReports(prevResult.reports);
      if (prevResult.reports.length > 0) {
        setSelectedReport(prevResult.reports[0]);
      }
    }
    setLoading(false);
  };

  const handleGenerateNew = async () => {
    setLoading(true);
    const result = await generateDailyReport();
    if (result.success) {
      await saveReportToFirestore(result.report);
      setSelectedReport(result.report);
      loadReports();
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  const reportData = selectedReport?.report || selectedReport;
  const sections = reportData?.sections || {};

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E3A5F']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 التقارير اليومية</Text>
        <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateNew}>
          <Ionicons name="refresh" size={20} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Previous Reports List */}
      {previousReports.length > 0 && (
        <ScrollView horizontal style={styles.reportsList} showsHorizontalScrollIndicator={false}>
          {previousReports.map((r, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.reportChip, selectedReport?.id === r.id && styles.reportChipActive]}
              onPress={() => setSelectedReport(r)}
            >
              <Text style={[styles.reportChipText, selectedReport?.id === r.id && styles.reportChipTextActive]}>
                {r.date || r.report?.date}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {reportData && (
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>📋 ملخص اليوم</Text>
            <Text style={styles.summaryDate}>{reportData.date} - {reportData.time}</Text>
            
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{reportData.summary?.totalOperations || 0}</Text>
                <Text style={styles.summaryLabel}>عملية</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{reportData.summary?.activeDoctors || 0}</Text>
                <Text style={styles.summaryLabel}>دكتور نشط</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{reportData.summary?.activeLectures || 0}</Text>
                <Text style={styles.summaryLabel}>محاضرة جارية</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{reportData.summary?.attendanceRate || 0}%</Text>
                <Text style={styles.summaryLabel}>نسبة الحضور</Text>
              </View>
            </View>
          </View>

          {/* Users Section */}
          {sections.users && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>👥 المستخدمين</Text>
              <View style={styles.row}><Text style={styles.label}>الإجمالي:</Text><Text style={styles.value}>{sections.users.total}</Text></View>
              <View style={styles.row}><Text style={styles.label}>طلاب:</Text><Text style={styles.value}>{sections.users.students}</Text></View>
              <View style={styles.row}><Text style={styles.label}>دكاترة:</Text><Text style={styles.value}>{sections.users.doctors}</Text></View>
              <View style={styles.row}><Text style={styles.label}>قادة:</Text><Text style={styles.value}>{sections.users.leaders}</Text></View>
              <View style={styles.row}><Text style={styles.label}>مسجلين اليوم:</Text><Text style={styles.value}>{sections.users.newToday}</Text></View>
            </View>
          )}

          {/* Attendance Section */}
          {sections.attendance && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📋 الحضور</Text>
              <View style={styles.row}><Text style={styles.label}>إجمالي:</Text><Text style={styles.value}>{sections.attendance.total}</Text></View>
              <View style={styles.row}><Text style={styles.label}>حاضر:</Text><Text style={[styles.value, { color: '#10B981' }]}>{sections.attendance.present}</Text></View>
              <View style={styles.row}><Text style={styles.label}>متأخر:</Text><Text style={[styles.value, { color: '#F59E0B' }]}>{sections.attendance.late}</Text></View>
              <View style={styles.row}><Text style={styles.label}>غائب:</Text><Text style={[styles.value, { color: '#EF4444' }]}>{sections.attendance.absent}</Text></View>
            </View>
          )}

          {/* Lectures Section */}
          {sections.lectures && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📅 المحاضرات</Text>
              <View style={styles.row}><Text style={styles.label}>إجمالي:</Text><Text style={styles.value}>{sections.lectures.total}</Text></View>
              <View style={styles.row}><Text style={styles.label}>جارية:</Text><Text style={[styles.value, { color: '#10B981' }]}>{sections.lectures.active}</Text></View>
              {sections.lectures.list?.slice(0, 5).map((l, i) => (
                <View key={i} style={styles.lectureItem}>
                  <Text style={styles.lectureName}>{l.subject}</Text>
                  <Text style={styles.lectureInfo}>{l.startTime}-{l.endTime} | {l.room}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Doctor Activity */}
          {sections.doctorActivity && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>👨‍🏫 نشاط الدكاترة</Text>
              {sections.doctorActivity.map((d, i) => (
                <View key={i} style={styles.doctorRow}>
                  <Text style={styles.doctorName}>{d.name}</Text>
                  <Text style={styles.doctorStats}>
                    {d.lecturesToday} محاضرة | {d.attendanceRecorded} حضور
                    {d.activeNow && ' 🟢'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Payments */}
          {sections.payments && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>💰 المدفوعات</Text>
              <View style={styles.row}><Text style={styles.label}>عدد الدفعات:</Text><Text style={styles.value}>{sections.payments.count}</Text></View>
              <View style={styles.row}><Text style={styles.label}>المبلغ الإجمالي:</Text><Text style={styles.value}>{sections.payments.totalAmount} ريال</Text></View>
            </View>
          )}
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 55, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', flex: 1, textAlign: 'right' },
  generateBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.3)', justifyContent: 'center', alignItems: 'center' },

  reportsList: { paddingHorizontal: 16, marginVertical: 12 },
  reportChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FFF', marginRight: 8, borderWidth: 1.5, borderColor: '#E2E8F0' },
  reportChipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  reportChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  reportChipTextActive: { color: '#FFF' },

  content: { padding: 16 },

  summaryCard: { backgroundColor: '#1E40AF', borderRadius: 20, padding: 20, marginBottom: 16 },
  summaryTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'right' },
  summaryDate: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'right', marginTop: 4, marginBottom: 16 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryItem: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14, alignItems: 'center' },
  summaryNum: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 },

  sectionCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  label: { fontSize: 13, color: '#64748B' },
  value: { fontSize: 14, fontWeight: '600', color: '#1E293B' },

  lectureItem: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginBottom: 6 },
  lectureName: { fontSize: 13, fontWeight: '600', color: '#1E293B', textAlign: 'right' },
  lectureInfo: { fontSize: 11, color: '#64748B', textAlign: 'right', marginTop: 2 },

  doctorRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  doctorName: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  doctorStats: { fontSize: 11, color: '#64748B' }
});