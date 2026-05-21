import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function ManageScheduleScreen({ navigation }) {
  const [schedules, setSchedules] = useState([]);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [subject, setSubject] = useState('');
  const [room, setRoom] = useState('');
  const [batch, setBatch] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    const snapshot = await getDocs(collection(db, 'schedules'));
    setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleAdd = async () => {
    if (!day || !time || !subject || !room) {
      Alert.alert('تنبيه', 'الرجاء ملء جميع الحقول');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'schedules'), {
        day, time, subject, room, batch,
        createdAt: new Date().toISOString()
      });
      Alert.alert('تم', 'تمت إضافة المحاضرة بنجاح');
      setDay(''); setTime(''); setSubject(''); setRoom(''); setBatch('all');
      fetchSchedules();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'schedules', id));
      fetchSchedules();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    }
  };

  const batches = ['all', 'A', 'B', 'C', 'D'];

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← رجوع</Text>
      </TouchableOpacity>

      <Text style={styles.title}>إضافة محاضرة جديدة</Text>
      
      <TextInput style={styles.input} placeholder="اليوم (مثال: السبت)" value={day} onChangeText={setDay} placeholderTextColor="#94A3B8" textAlign="right" />
      <TextInput style={styles.input} placeholder="الوقت (مثال: 8:00 - 9:30)" value={time} onChangeText={setTime} placeholderTextColor="#94A3B8" textAlign="right" />
      <TextInput style={styles.input} placeholder="المادة" value={subject} onChangeText={setSubject} placeholderTextColor="#94A3B8" textAlign="right" />
      <TextInput style={styles.input} placeholder="القاعة" value={room} onChangeText={setRoom} placeholderTextColor="#94A3B8" textAlign="right" />

      <Text style={styles.label}>الدفعة (الطلاب اللي هيشوفوا المحاضرة)</Text>
      <View style={styles.batchRow}>
        {batches.map(b => (
          <TouchableOpacity 
            key={b} 
            style={[styles.batchBtn, batch === b && styles.batchBtnActive]} 
            onPress={() => setBatch(b)}
          >
            <Text style={[styles.batchText, batch === b && styles.batchTextActive]}>
              {b === 'all' ? 'الكل' : 'دفعة ' + b}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleAdd} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>إضافة المحاضرة</Text>}
      </TouchableOpacity>

      <Text style={styles.subtitle}>المحاضرات الحالية ({schedules.length})</Text>
      
      {schedules.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDay}>{item.day} - {item.time}</Text>
              <View style={styles.batchBadge}>
                <Text style={styles.batchBadgeText}>{item.batch === 'all' ? 'عام' : 'دفعة ' + item.batch}</Text>
              </View>
            </View>
            <Text style={styles.cardSubject}>{item.subject}</Text>
            <Text style={styles.cardRoom}>📍 {item.room}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF', padding: 16 },
  backBtn: { alignSelf: 'flex-end', marginBottom: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F1F5F9' },
  backText: { fontSize: 14, color: '#1E40AF', fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 16, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: 'right', marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12, color: '#1E293B' },
  batchRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  batchBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0' },
  batchBtnActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  batchText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  batchTextActive: { color: '#FFF' },
  button: { backgroundColor: '#1E40AF', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 24, marginTop: 4 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', textAlign: 'right', marginBottom: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#1E40AF' },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardDay: { fontSize: 13, color: '#1E40AF', fontWeight: '600' },
  batchBadge: { backgroundColor: 'rgba(30,64,175,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  batchBadgeText: { fontSize: 10, color: '#1E40AF', fontWeight: '700' },
  cardSubject: { fontSize: 16, fontWeight: '600', color: '#1E293B', textAlign: 'right' },
  cardRoom: { fontSize: 12, color: '#64748B', textAlign: 'right', marginTop: 4 },
  deleteText: { fontSize: 20 },
});