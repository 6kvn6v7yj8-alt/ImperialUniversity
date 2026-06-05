import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function ActivateAccountsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingStudents, setPendingStudents] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPendingStudents();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const loadPendingStudents = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const students = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.role === 'student' && u.status === 'pending');
      setPendingStudents(students);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const activateStudent = async (studentId, studentName) => {
    Alert.alert('تفعيل الحساب', `هل تريد تفعيل حساب ${studentName}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تفعيل',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'users', studentId), {
              status: 'active',
              activatedAt: new Date().toISOString()
            });
            setPendingStudents(prev => prev.filter(s => s.id !== studentId));
            Alert.alert('✅ تم', 'تم تفعيل الحساب بنجاح');
          } catch (error) {
            Alert.alert('خطأ', 'فشل في تفعيل الحساب');
          }
        }
      }
    ]);
  };

  const rejectStudent = async (studentId, studentName) => {
    Alert.alert('رفض الحساب', `هل تريد رفض حساب ${studentName}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'رفض', style: 'destructive',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'users', studentId), {
              status: 'rejected',
              rejectedAt: new Date().toISOString()
            });
            setPendingStudents(prev => prev.filter(s => s.id !== studentId));
            Alert.alert('✅ تم', 'تم رفض الحساب');
          } catch (error) {
            Alert.alert('خطأ', 'فشل في رفض الحساب');
          }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loading}><ActivityIndicator size="large" color="#1E40AF" /></View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPendingStudents(); }} />}>
      <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⏳ تفعيل الحسابات</Text>
        <Text style={styles.headerSub}>{pendingStudents.length} حساب معلق</Text>
      </LinearGradient>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {pendingStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="check-circle" size={64} color="#10b981" />
            <Text style={styles.emptyTitle}>لا توجد حسابات معلقة</Text>
            <Text style={styles.emptySub}>جميع الحسابات مفعلة</Text>
          </View>
        ) : (
          pendingStudents.map(student => (
            <View key={student.id} style={styles.studentCard}>
              <View style={styles.studentInfo}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{(student.name||'?').charAt(0)}</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={14} color="#64748B" />
                    <Text style={styles.infoText}>{student.phone || '-'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="school-outline" size={14} color="#64748B" />
                    <Text style={styles.infoText}>دفعة {student.batch} - {student.specialization}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.activateBtn} onPress={() => activateStudent(student.id, student.name)}>
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.activateText}>تفعيل</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectStudent(student.id, student.name)}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                  <Text style={styles.rejectText}>رفض</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'right' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'right', marginTop: 4 },
  content: { padding: 16 },
  emptyState: { alignItems: 'center', padding: 50, backgroundColor: '#FFF', borderRadius: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  studentCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#FEF3C7' },
  studentInfo: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#1E40AF' },
  infoContent: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 4 },
  infoText: { fontSize: 12, color: '#64748B' },
  actionRow: { flexDirection: 'row', gap: 10 },
  activateBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#10b981', padding: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 6 },
  activateText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  rejectBtn: { flexDirection: 'row', padding: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  rejectText: { color: '#EF4444', fontSize: 14, fontWeight: '600' }
});