import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function ViewStudentsScreen({ navigation }) {
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // فلاتر
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const students = allUsers.filter(u => u.role === 'student');
      setAllStudents(students);
      setFilteredStudents(students);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (error) { console.log('Error:', error); }
    finally { setLoading(false); }
  };

  // تطبيق الفلاتر
  const applyFilters = (batch, spec) => {
    let filtered = [...allStudents];
    if (batch !== 'all') filtered = filtered.filter(s => s.batch === batch);
    if (spec !== 'all') filtered = filtered.filter(s => s.specialization === spec);
    setFilteredStudents(filtered);
    setSelectedBatch(batch);
    setSelectedSpecialization(spec);
  };

  // استخراج قيم فريدة للفلاتر
  const batches = ['all', ...new Set(allStudents.map(s => s.batch).filter(Boolean))];
  const specializations = ['all', ...new Set(allStudents.map(s => s.specialization).filter(Boolean))];

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#1E40AF" /></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>👨‍🎓 الطلاب</Text>
        <Text style={styles.subtitle}>{filteredStudents.length} طالب</Text>
      </View>

      {/* فلاتر */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>الدفعة:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {batches.map(b => (
            <TouchableOpacity
              key={b}
              style={[styles.filterChip, selectedBatch === b && styles.filterChipActive]}
              onPress={() => applyFilters(b, selectedSpecialization)}
            >
              <Text style={[styles.filterChipText, selectedBatch === b && styles.filterChipTextActive]}>
                {b === 'all' ? '🌐 الكل' : `دفعة ${b}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>التخصص:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {specializations.map(spec => (
            <TouchableOpacity
              key={spec}
              style={[styles.filterChip, selectedSpecialization === spec && styles.filterChipActive]}
              onPress={() => applyFilters(selectedBatch, spec)}
            >
              <Text style={[styles.filterChipText, selectedSpecialization === spec && styles.filterChipTextActive]}>
                {spec === 'all' ? '🌐 الكل' : spec}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ملخص سريع */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{filteredStudents.length}</Text>
          <Text style={styles.summaryLabel}>طالب</Text>
        </View>
        {selectedBatch !== 'all' && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>دفعة {selectedBatch}</Text>
            <Text style={styles.summaryLabel}>الدفعة المختارة</Text>
          </View>
        )}
        {selectedSpecialization !== 'all' && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{selectedSpecialization}</Text>
            <Text style={styles.summaryLabel}>التخصص المختار</Text>
          </View>
        )}
      </View>

      {/* قائمة الطلاب */}
      {filteredStudents.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👨‍🎓</Text>
          <Text style={styles.emptyText}>لا يوجد طلاب بهذه المعايير</Text>
        </View>
      ) : (
        filteredStudents.map((student, i) => (
          <Animated.View key={student.id} style={[styles.card, { opacity: fadeAnim }]}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{student.name?.charAt(0) || 'ط'}</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.nameRow}>
                <Text style={styles.studentName}>{student.name || 'غير معروف'}</Text>
                <View style={styles.batchBadge}>
                  <Text style={styles.batchText}>دفعة {student.batch || '-'}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>التخصص:</Text>
                <Text style={styles.infoValue}>{student.specialization || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>رقم الهاتف:</Text>
                <Text style={styles.infoValue}>{student.phone || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>تاريخ التسجيل:</Text>
                <Text style={styles.infoValue}>{student.createdAt || '-'}</Text>
              </View>
            </View>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  header: { backgroundColor: '#1E40AF', padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 12 },
  backBtn: { marginBottom: 8 },
  backText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  title: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'right', marginTop: 8 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'right' },

  // فلاتر
  filterSection: { paddingHorizontal: 16, marginBottom: 12 },
  filterLabel: { fontSize: 13, fontWeight: '600', color: '#1E293B', textAlign: 'right', marginBottom: 6, marginTop: 8 },
  filterRow: { flexDirection: 'row', marginBottom: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', marginRight: 6 },
  filterChipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFF' },

  // ملخص
  summaryBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  summaryItem: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryNum: { fontSize: 16, fontWeight: '800', color: '#1E40AF' },
  summaryLabel: { fontSize: 10, color: '#64748B', marginTop: 2 },

  empty: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#94A3B8' },
  card: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  avatarBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(30,64,175,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#1E40AF' },
  cardContent: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  studentName: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  batchBadge: { backgroundColor: 'rgba(30,64,175,0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  batchText: { fontSize: 10, color: '#1E40AF', fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  infoLabel: { fontSize: 11, color: '#64748B' },
  infoValue: { fontSize: 11, fontWeight: '600', color: '#1E293B' },
});