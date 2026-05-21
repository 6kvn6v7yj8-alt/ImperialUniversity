import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Platform } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function ViewAttendanceScreen({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const snapshot = await getDocs(collection(db, 'courses'));
    setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  };

  const fetchAttendance = async (course) => {
    setSelectedCourse(course);
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'attendance'));
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = allData.filter(a => a.courseId === course.id);
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAttendance(filtered);
      setFilteredAttendance(filtered);
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: [...new Set(filteredAttendance.map(a => a.studentId))].length,
    records: filteredAttendance.length,
  };

  const handlePrint = () => {
    if (Platform.OS === 'web') window.print();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📋 سجل الحضور</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseScroll}>
        {courses.map(course => (
          <TouchableOpacity
            key={course.id}
            style={[styles.courseChip, selectedCourse?.id === course.id && styles.courseChipActive]}
            onPress={() => fetchAttendance(course)}
          >
            <Text style={[styles.courseChipText, selectedCourse?.id === course.id && styles.courseChipTextActive]}>
              {course.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedCourse && (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{stats.total}</Text>
              <Text style={styles.statLabel}>طالب</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{stats.records}</Text>
              <Text style={styles.statLabel}>تسجيل</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
            <Text style={styles.printBtnText}>🖨️ طباعة</Text>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator size="large" color="#1E40AF" style={{ padding: 30 }} />
          ) : filteredAttendance.length === 0 ? (
            <Text style={styles.emptyText}>لا يوجد حضور</Text>
          ) : (
            filteredAttendance.map((record, index) => (
              <View key={index} style={styles.recordCard}>
                <Text style={styles.recordName}>{record.studentName}</Text>
                <Text style={styles.recordDate}>{record.date}</Text>
                <Text style={styles.recordTime}>{record.time}</Text>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  header: { backgroundColor: '#1E40AF', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
  backBtn: { alignSelf: 'flex-end', marginBottom: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  backText: { fontSize: 14, color: '#FFF', fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  courseScroll: { paddingHorizontal: 16, marginVertical: 12 },
  courseChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', marginRight: 8 },
  courseChipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  courseChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  courseChipTextActive: { color: '#FFF' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1E40AF' },
  statLabel: { fontSize: 11, color: '#64748B' },
  printBtn: { backgroundColor: '#10B981', marginHorizontal: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  printBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#94A3B8', padding: 20 },
  recordCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 6, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  recordDate: { fontSize: 12, color: '#64748B' },
  recordTime: { fontSize: 12, color: '#64748B' },
});