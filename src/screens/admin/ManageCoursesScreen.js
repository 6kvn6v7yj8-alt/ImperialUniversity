import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function ManageCoursesScreen({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [doctor, setDoctor] = useState('');
  const [hours, setHours] = useState('');
  const [batch, setBatch] = useState('all');
  
  // حقول الجدول الجديدة
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [room, setRoom] = useState('');
  const [addToSchedule, setAddToSchedule] = useState(true);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const snapshot = await getDocs(collection(db, 'courses'));
    setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleAdd = async () => {
    if (!code || !name || !doctor || !hours) {
      Alert.alert('تنبيه', 'الرجاء ملء جميع الحقول المطلوبة');
      return;
    }
    setLoading(true);
    try {
      // إضافة المادة
      await addDoc(collection(db, 'courses'), {
        code, name, doctor, hours, batch,
        day, time, room,
        createdAt: new Date().toISOString()
      });

      // إضافة للجدول تلقائياً إذا تم تحديد اليوم والوقت
      if (addToSchedule && day && time && room) {
        await addDoc(collection(db, 'schedules'), {
          day, time, subject: name, room, batch,
          doctor,
          courseCode: code,
          createdAt: new Date().toISOString()
        });
      }

      Alert.alert('تم', addToSchedule && day ? 'تمت إضافة المادة والجدول بنجاح' : 'تمت إضافة المادة بنجاح');
      setCode(''); setName(''); setDoctor(''); setHours(''); setBatch('all');
      setDay(''); setTime(''); setRoom(''); setAddToSchedule(true);
      fetchCourses();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'courses', id));
      fetchCourses();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    }
  };

  const batches = ['all', 'A', 'B', 'C', 'D'];
  const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← رجوع</Text>
      </TouchableOpacity>

      <View style={styles.headerCard}>
        <Text style={styles.title}>📚 إضافة مادة جديدة</Text>
        <Text style={styles.subtitle}>تضاف للمواد والجدول تلقائياً</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>كود المادة *</Text>
        <TextInput style={styles.input} placeholder="مثال: CS101" value={code} onChangeText={setCode} placeholderTextColor="#94A3B8" textAlign="right" />

        <Text style={styles.label}>اسم المادة *</Text>
        <TextInput style={styles.input} placeholder="اسم المادة" value={name} onChangeText={setName} placeholderTextColor="#94A3B8" textAlign="right" />

        <Text style={styles.label}>الدكتور *</Text>
        <TextInput style={styles.input} placeholder="اسم الدكتور" value={doctor} onChangeText={setDoctor} placeholderTextColor="#94A3B8" textAlign="right" />

        <Text style={styles.label}>عدد الساعات *</Text>
        <TextInput style={styles.input} placeholder="مثال: 3" value={hours} onChangeText={setHours} keyboardType="number-pad" placeholderTextColor="#94A3B8" textAlign="right" />

        <View style={styles.divider} />

        <View style={styles.scheduleHeader}>
          <Text style={styles.sectionLabel}>📅 إضافة للجدول الدراسي</Text>
          <TouchableOpacity 
            style={[styles.toggleBtn, addToSchedule && styles.toggleBtnActive]} 
            onPress={() => setAddToSchedule(!addToSchedule)}
          >
            <Text style={[styles.toggleText, addToSchedule && styles.toggleTextActive]}>
              {addToSchedule ? '✅ مضاف' : '➕ إضافة'}
            </Text>
          </TouchableOpacity>
        </View>

        {addToSchedule && (
          <>
            <Text style={styles.label}>اليوم</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {days.map(d => (
                <TouchableOpacity key={d} style={[styles.chip, day === d && styles.chipActive]} onPress={() => setDay(d)}>
                  <Text style={[styles.chipText, day === d && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>الوقت</Text>
            <TextInput style={styles.input} placeholder="مثال: 8:00 - 9:30" value={time} onChangeText={setTime} placeholderTextColor="#94A3B8" textAlign="right" />

            <Text style={styles.label}>القاعة</Text>
            <TextInput style={styles.input} placeholder="مثال: قاعة 101" value={room} onChangeText={setRoom} placeholderTextColor="#94A3B8" textAlign="right" />
          </>
        )}

        <View style={styles.divider} />

        <Text style={styles.label}>الدفعة المستهدفة</Text>
        <View style={styles.chipRow}>
          {batches.map(b => (
            <TouchableOpacity key={b} style={[styles.chip, batch === b && styles.chipActive]} onPress={() => setBatch(b)}>
              <Text style={[styles.chipText, batch === b && styles.chipTextActive]}>
                {b === 'all' ? '🌐 الكل' : '📚 دفعة ' + b}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.addBtn, loading && styles.addBtnDisabled]} onPress={handleAdd} disabled={loading}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.addBtnText}> جاري الإضافة...</Text>
            </View>
          ) : (
            <Text style={styles.addBtnText}>
              {addToSchedule && day ? '✅ إضافة المادة والجدول' : '✅ إضافة المادة'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>📚 المواد الحالية ({courses.length})</Text>
      
      {courses.map(course => (
        <View key={course.id} style={styles.courseCard}>
          <View style={styles.courseContent}>
            <View style={styles.courseHeader}>
              <Text style={styles.courseCode}>{course.code}</Text>
              <View style={styles.badgeRow}>
                {course.day && <View style={styles.scheduleBadge}><Text style={styles.scheduleBadgeText}>📅 {course.day}</Text></View>}
                <View style={styles.batchBadge}><Text style={styles.batchBadgeText}>{course.batch === 'all' ? 'عام' : 'دفعة ' + course.batch}</Text></View>
              </View>
            </View>
            <Text style={styles.courseName}>{course.name}</Text>
            <Text style={styles.courseInfo}>👨‍🏫 {course.doctor} | 📊 {course.hours} ساعة</Text>
            {course.time && course.room && (
              <Text style={styles.courseSchedule}>🕐 {course.time} | 📍 {course.room}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => handleDelete(course.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      ))}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  backBtn: { alignSelf: 'flex-end', marginTop: 16, marginRight: 16, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: '#FFF' },
  backText: { fontSize: 14, color: '#1E40AF', fontWeight: '700' },
  headerCard: { backgroundColor: '#1E40AF', marginHorizontal: 16, marginTop: 12, borderRadius: 20, padding: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 4 },
  formCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: -10, borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: 'right', marginBottom: 8, marginTop: 12 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 4, color: '#1E293B' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },
  scheduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#E2E8F0' },
  toggleBtnActive: { backgroundColor: '#D1FAE5', borderColor: '#34D399' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  toggleTextActive: { color: '#059669' },
  chipScroll: { marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', marginRight: 8 },
  chipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFF' },
  addBtn: { backgroundColor: '#1E40AF', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 16, shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  addBtnDisabled: { backgroundColor: '#93C5FD' },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginHorizontal: 16, marginBottom: 12 },
  courseCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  courseContent: { flex: 1 },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  courseCode: { fontSize: 14, color: '#1E40AF', fontWeight: '600' },
  badgeRow: { flexDirection: 'row', gap: 4 },
  scheduleBadge: { backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  scheduleBadgeText: { fontSize: 10, color: '#D97706', fontWeight: '600' },
  batchBadge: { backgroundColor: 'rgba(30,64,175,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  batchBadgeText: { fontSize: 10, color: '#1E40AF', fontWeight: '700' },
  courseName: { fontSize: 16, fontWeight: '600', color: '#1E293B', textAlign: 'right' },
  courseInfo: { fontSize: 12, color: '#64748B', textAlign: 'right', marginTop: 4 },
  courseSchedule: { fontSize: 12, color: '#1E40AF', textAlign: 'right', marginTop: 2, fontWeight: '600' },
  deleteBtn: { padding: 8 },
  deleteText: { fontSize: 20 },
});