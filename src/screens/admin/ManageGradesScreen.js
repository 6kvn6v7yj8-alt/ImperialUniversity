import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function ManageGradesScreen() {
  const [grades, setGrades] = useState([]);
  const [subject, setSubject] = useState('');
  const [score, setScore] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    const snapshot = await getDocs(collection(db, 'grades'));
    setGrades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleAdd = async () => {
    if (!subject || !score || !grade) {
      Alert.alert('تنبيه', 'الرجاء ملء جميع الحقول');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'grades'), {
        subject, score: Number(score), grade,
        createdAt: new Date().toISOString()
      });
      Alert.alert('تم', 'تمت إضافة النتيجة بنجاح');
      setSubject(''); setScore(''); setGrade('');
      fetchGrades();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'grades', id));
      fetchGrades();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>إضافة نتيجة جديدة</Text>
      
      <TextInput style={styles.input} placeholder="المادة" value={subject} onChangeText={setSubject} placeholderTextColor="#94A3B8" textAlign="right" />
      <TextInput style={styles.input} placeholder="الدرجة (رقم)" value={score} onChangeText={setScore} keyboardType="number-pad" placeholderTextColor="#94A3B8" textAlign="right" />
      <TextInput style={styles.input} placeholder="التقدير (A+, B, ...)" value={grade} onChangeText={setGrade} placeholderTextColor="#94A3B8" textAlign="right" />
      
      <TouchableOpacity style={styles.button} onPress={handleAdd} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>إضافة النتيجة</Text>}
      </TouchableOpacity>

      <Text style={styles.subtitle}>النتائج الحالية ({grades.length})</Text>
      
      {grades.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.cardSubject}>{item.subject}</Text>
            <Text style={styles.cardScore}>{item.score} - {item.grade}</Text>
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
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A', textAlign: 'right', marginBottom: 16, marginTop: 20 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12, color: '#0F172A' },
  button: { backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 24 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 18, fontWeight: '600', color: '#0F172A', textAlign: 'right', marginBottom: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  cardContent: { flex: 1 },
  cardSubject: { fontSize: 16, fontWeight: '600', color: '#0F172A', textAlign: 'right' },
  cardScore: { fontSize: 18, fontWeight: '700', color: '#2563EB', textAlign: 'right', marginTop: 4 },
  deleteText: { fontSize: 20 },
});