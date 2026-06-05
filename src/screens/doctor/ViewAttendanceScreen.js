import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Platform } from 'react-native';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

export default function ViewAttendanceScreen({ navigation }) {
  const [attendance, setAttendance] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [doctorData, setDoctorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    try {
      const user = auth.currentUser;
      let doctorName = '';
      let doctorSubjects = [];
      
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDoctorData(data);
          doctorName = data.name || '';
          doctorSubjects = data.subjects || [];
          if (!doctorSubjects.length && data.subject) {
            doctorSubjects = [{ name: data.subject, batch: 'all' }];
          }
        }
      }

      const snap = await getDocs(collection(db, 'attendance'));
      const allData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // فلترة بالمواد المخصصة للدكتور
      const doctorSubjectNames = doctorSubjects.map(s => s.name);
      const filtered = allData.filter(a => 
        a.doctorName === doctorName || 
        a.courseDoctor === doctorName ||
        doctorSubjectNames.includes(a.courseName)
      );
      
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAttendance(filtered);
      setFilteredAttendance(filtered);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (error) { console.log('Error:', error); }
    finally { setLoading(false); }
  };

  const filterBySubject = (subject) => {
    setSelectedSubject(subject);
    if (subject === 'all') {
      setFilteredAttendance(attendance);
    } else {
      setFilteredAttendance(attendance.filter(a => a.courseName === subject));
    }
  };

  const subjects = doctorData?.subjects || [];
  if (!subjects.length && doctorData?.subject) {
    subjects.push({ name: doctorData.subject, batch: 'all' });
  }
  const uniqueSubjects = ['all', ...new Set(attendance.map(a => a.courseName))];

  const stats = { total: filteredAttendance.length, students: [...new Set(filteredAttendance.map(a => a.studentId))].length };

  const handlePrint = () => { if (Platform.OS === 'web') window.print(); };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#1E40AF" /></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>← رجوع</Text></TouchableOpacity>
        <Text style={styles.title}>📋 سجل الحضور</Text>
        <Text style={styles.subtitle}>{doctorData?.name || 'دكتور'}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statNum}>{stats.total}</Text><Text style={styles.statLabel}>تسجيل</Text></View>
        <View style={styles.statCard}><Text style={styles.statNum}>{stats.students}</Text><Text style={styles.statLabel}>طالب</Text></View>
      </View>

      {/* فلترة بالمادة */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {uniqueSubjects.map(subject => (
          <TouchableOpacity
            key={subject}
            style={[styles.filterChip, selectedSubject === subject && styles.filterChipActive]}
            onPress={() => filterBySubject(subject)}
          >
            <Text style={[styles.filterChipText, selectedSubject === subject && styles.filterChipTextActive]}>
              {subject === 'all' ? '📚 الكل' : subject}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.printBtn} onPress={handlePrint}><Text style={styles.printBtnText}>🖨️ طباعة</Text></TouchableOpacity>

      {filteredAttendance.length === 0 ? (
        <Text style={styles.emptyText}>لا يوجد حضور</Text>
      ) : (
        filteredAttendance.map((record, index) => (
          <View key={index} style={styles.recordCard}>
            <View><Text style={styles.recordName}>{record.studentName}</Text><Text style={styles.recordCourse}>{record.courseName}</Text></View>
            <View style={styles.recordRight}><Text style={styles.recordDate}>{record.date}</Text><Text style={styles.recordTime}>{record.time}</Text></View>
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1E40AF', padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  backBtn: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  title: { color: '#FFF', fontSize: 20, fontWeight: '800', textAlign: 'right', marginTop: 8 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1E40AF' },
  statLabel: { fontSize: 11, color: '#64748B' },
  filterRow: { paddingHorizontal: 16, marginBottom: 12 },
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