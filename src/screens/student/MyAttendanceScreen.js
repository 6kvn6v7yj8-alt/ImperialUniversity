import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

export default function MyAttendanceScreen({ navigation }) {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  const fetchMyAttendance = async () => {
    try {
      const user = auth.currentUser;
      if (!user) { setLoading(false); return; }

      const snapshot = await getDocs(collection(db, 'attendance'));
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const myData = allData.filter(record => record.studentId === user.uid);
      
      // ترتيب من الأحدث للأقدم
      myData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setAttendance(myData);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📋 سجل حضوري</Text>
        <Text style={styles.subtitle}>المحاضرات التي حضرتها</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
          <Text style={[styles.statNum, { color: '#1E40AF' }]}>{attendance.length}</Text>
          <Text style={styles.statLabel}>محاضرة</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
          <Text style={[styles.statNum, { color: '#10B981' }]}>
            {[...new Set(attendance.map(a => a.courseId))].length}
          </Text>
          <Text style={styles.statLabel}>مادة</Text>
        </View>
      </View>

      {attendance.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>لا يوجد سجل حضور</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchMyAttendance}>
            <Text style={styles.refreshText}>🔄 تحديث</Text>
          </TouchableOpacity>
        </View>
      ) : (
        attendance.map((record, index) => (
          <View key={index} style={styles.recordCard}>
            <View style={styles.recordDot} />
            <View style={styles.recordContent}>
              <Text style={styles.recordCourse}>{record.courseName}</Text>
              <View style={styles.recordDetails}>
                <Text style={styles.recordDate}>📅 {record.date}</Text>
                <Text style={styles.recordTime}>🕐 {record.time}</Text>
              </View>
            </View>
            <Text style={styles.recordCheck}>✓</Text>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  header: { backgroundColor: '#1E40AF', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { alignSelf: 'flex-end', marginBottom: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  backText: { fontSize: 14, color: '#FFF', fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#94A3B8', fontWeight: '600' },
  refreshBtn: { marginTop: 16, backgroundColor: '#1E40AF', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
  refreshText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  recordCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 6, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center' },
  recordDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', marginRight: 10 },
  recordContent: { flex: 1 },
  recordCourse: { fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: 'right' },
  recordDetails: { flexDirection: 'row', gap: 12, marginTop: 4 },
  recordDate: { fontSize: 11, color: '#64748B' },
  recordTime: { fontSize: 11, color: '#64748B' },
  recordCheck: { fontSize: 16, color: '#10B981', fontWeight: '700' },
});