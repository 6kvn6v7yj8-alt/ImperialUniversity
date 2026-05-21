import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Platform } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function AdminViewAttendanceScreen({ navigation }) {
  const [attendance, setAttendance] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const attendanceSnap = await getDocs(collection(db, 'attendance'));
      const attendanceData = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      attendanceData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAttendance(attendanceData);
      setFilteredAttendance(attendanceData);

      const coursesSnap = await getDocs(collection(db, 'courses'));
      setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  };

  const filterByCourse = (courseId) => {
    setSelectedCourse(courseId);
    if (courseId === 'all') {
      setFilteredAttendance(attendance);
    } else {
      setFilteredAttendance(attendance.filter(a => a.courseId === courseId));
    }
  };

  const stats = {
    total: filteredAttendance.length,
    students: [...new Set(filteredAttendance.map(a => a.studentId))].length,
  };

  const handlePrint = () => {
    if (Platform.OS === 'web') window.print();
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
        <Text style={styles.title}>📋 سجل الحضور الشامل</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLabel}>تسجيل</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.students}</Text>
          <Text style={styles.statLabel}>طالب</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <TouchableOpacity
          style={[styles.filterChip, selectedCourse === 'all' && styles.filterChipActive]}
          onPress={() => filterByCourse('all')}
        >
          <Text style={[styles.filterChipText, selectedCourse === 'all' && styles.filterChipTextActive]}>📚 الكل</Text>
        </TouchableOpacity>
        {courses.map(course => (
          <TouchableOpacity
            key={course.id}
            style={[styles.filterChip, selectedCourse === course.id && styles.filterChipActive]}
            onPress={() => filterByCourse(course.id)}
          >
            <Text style={[styles.filterChipText, selectedCourse === course.id && styles.filterChipTextActive]}>
              {course.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
        <Text style={styles.printBtnText}>🖨️ طباعة</Text>
      </TouchableOpacity>

      {filteredAttendance.length === 0 ? (
        <Text style={styles.emptyText}>لا توجد سجلات</Text>
      ) : (
        filteredAttendance.map((record, index) => (
          <View key={index} style={styles.recordCard}>
            <View>
              <Text style={styles.recordName}>{record.studentName}</Text>
              <Text style={styles.recordCourse}>{record.courseName}</Text>
            </View>
            <View style={styles.recordRight}>
              <Text style={styles.recordDate}>{record.date}</Text>
              <Text style={styles.recordTime}>{record.time}</Text>
            </View>
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
  header: { backgroundColor: '#1E293B', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
  backBtn: { alignSelf: 'flex-end', marginBottom: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  backText: { fontSize: 14, color: '#FFF', fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginVertical: 12 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1E40AF' },
  statLabel: { fontSize: 11, color: '#64748B' },
  filterScroll: { paddingHorizontal: 16, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', marginRight: 6 },
  filterChipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFF' },
  printBtn: { backgroundColor: '#10B981', marginHorizontal: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  printBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#94A3B8', padding: 20 },
  recordCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 6, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  recordCourse: { fontSize: 11, color: '#64748B' },
  recordRight: { alignItems: 'flex-end' },
  recordDate: { fontSize: 12, color: '#64748B' },
  recordTime: { fontSize: 12, color: '#64748B' },
});