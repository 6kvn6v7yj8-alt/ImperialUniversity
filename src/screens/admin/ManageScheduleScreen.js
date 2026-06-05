import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function ManageScheduleScreen({ navigation }) {
  const [schedules, setSchedules] = useState([]);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [subject, setSubject] = useState('');
  const [room, setRoom] = useState('');
  const [batch, setBatch] = useState('all');
  const [startHour, setStartHour] = useState('');
  const [endHour, setEndHour] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    const snapshot = await getDocs(collection(db, 'schedules'));
    setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleAdd = async () => {
    if (!day || !time || !subject || !room || !startHour || !endHour) {
      Alert.alert('تنبيه', 'الرجاء ملء جميع الحقول');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'schedules'), {
        day, time, subject, room, batch,
        startHour: parseInt(startHour),
        endHour: parseInt(endHour),
        cancelled: false,
        cancelledAt: null,
        totalLectures: 16,
        createdAt: new Date().toISOString()
      });
      Alert.alert('تم', 'تمت إضافة المحاضرة بنجاح');
      setDay(''); setTime(''); setSubject(''); setRoom(''); setBatch('all'); setStartHour(''); setEndHour('');
      fetchSchedules();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    Alert.alert('إلغاء المحاضرة', 'هل تريد إلغاء هذه المحاضرة؟ (لن تحتسب غياباً للطلاب)', [
      { text: 'لا', style: 'cancel' },
      { text: 'نعم', onPress: async () => {
        try {
          await updateDoc(doc(db, 'schedules', id), {
            cancelled: true,
            cancelledAt: new Date().toISOString()
          });
          fetchSchedules();
          Alert.alert('تم', 'تم إلغاء المحاضرة');
        } catch (error) {
          Alert.alert('خطأ', error.message);
        }
      }}
    ]);
  };

  const handleUncancel = async (id) => {
    try {
      await updateDoc(doc(db, 'schedules', id), {
        cancelled: false,
        cancelledAt: null
      });
      fetchSchedules();
      Alert.alert('تم', 'تم إعادة تفعيل المحاضرة');
    } catch (error) {
      Alert.alert('خطأ', error.message);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert('حذف', 'هل أنت متأكد من حذف المحاضرة؟', [
      { text: 'لا', style: 'cancel' },
      { text: 'نعم', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'schedules', id));
          fetchSchedules();
        } catch (error) {
          Alert.alert('خطأ', error.message);
        }
      }}
    ]);
  };

  const batches = ['all', 'A', 'B', 'C', 'D'];
  const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← رجوع</Text>
      </TouchableOpacity>

      <View style={styles.headerCard}>
        <Text style={styles.title}>📅 إدارة الجدول</Text>
        <Text style={styles.subtitle}>إضافة وإلغاء المحاضرات</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>اليوم</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {days.map(d => (
            <TouchableOpacity key={d} style={[styles.chip, day === d && styles.chipActive]} onPress={() => setDay(d)}>
              <Text style={[styles.chipText, day === d && styles.chipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>المادة</Text>
        <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="اسم المادة" placeholderTextColor="#94A3B8" textAlign="right" />

        <Text style={styles.label}>القاعة</Text>
        <TextInput style={styles.input} value={room} onChangeText={setRoom} placeholder="رقم القاعة" placeholderTextColor="#94A3B8" textAlign="right" />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>ساعة البداية</Text>
            <TextInput style={styles.input} value={startHour} onChangeText={setStartHour} placeholder="8" keyboardType="number-pad" placeholderTextColor="#94A3B8" textAlign="center" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>ساعة النهاية</Text>
            <TextInput style={styles.input} value={endHour} onChangeText={setEndHour} placeholder="10" keyboardType="number-pad" placeholderTextColor="#94A3B8" textAlign="center" />
          </View>
        </View>

        <Text style={styles.label}>الوقت المعروض</Text>
        <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="مثال: 8:00 - 10:00" placeholderTextColor="#94A3B8" textAlign="right" />

        <Text style={styles.label}>الدفعة</Text>
        <View style={styles.chipRow}>
          {batches.map(b => (
            <TouchableOpacity key={b} style={[styles.chip, batch === b && styles.chipActive]} onPress={() => setBatch(b)}>
              <Text style={[styles.chipText, batch === b && styles.chipTextActive]}>{b === 'all' ? 'الكل' : 'دفعة ' + b}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.addBtnText}>✅ إضافة المحاضرة</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>📅 المحاضرات الحالية ({schedules.length})</Text>
      
      {schedules.map(item => (
        <View key={item.id} style={[styles.card, item.cancelled && styles.cardCancelled]}>
          {item.cancelled && (
            <View style={styles.cancelledBadge}>
              <Text style={styles.cancelledText}>❌ ملغاة</Text>
            </View>
          )}
          <View style={styles.cardContent}>
            <Text style={styles.cardSubject}>{item.subject}</Text>
            <Text style={styles.cardInfo}>📅 {item.day} | 🕐 {item.time}</Text>
            <Text style={styles.cardInfo}>📍 {item.room} | 🏷️ {item.batch === 'all' ? 'عام' : 'دفعة ' + item.batch}</Text>
            {item.startHour && <Text style={styles.cardInfo}>⏰ الساعة {item.startHour}:00 - {item.endHour}:00</Text>}
          </View>
          <View style={styles.actions}>
            {item.cancelled ? (
              <TouchableOpacity style={styles.uncancelBtn} onPress={() => handleUncancel(item.id)}>
                <Text style={styles.uncancelText}>✅ تفعيل</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
                <Text style={styles.cancelText}>❌ إلغاء</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
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
  formCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: -10, borderRadius: 20, padding: 20, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: 'right', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', marginRight: 8 },
  chipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFF' },
  addBtn: { backgroundColor: '#1E40AF', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginHorizontal: 16, marginBottom: 12 },
  card: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: '#1E40AF' },
  cardCancelled: { borderLeftColor: '#EF4444', backgroundColor: '#FEF2F2' },
  cancelledBadge: { alignSelf: 'flex-end', backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  cancelledText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },
  cardContent: { marginBottom: 10 },
  cardSubject: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  cardInfo: { fontSize: 12, color: '#64748B', textAlign: 'right', marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 },
  cancelBtn: { backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' },
  cancelText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  uncancelBtn: { backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' },
  uncancelText: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  deleteIcon: { fontSize: 20 },
});