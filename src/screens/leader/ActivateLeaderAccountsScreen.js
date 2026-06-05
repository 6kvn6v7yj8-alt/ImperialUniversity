import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Alert, ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, doc, updateDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { sendActivationNotification } from '../../services/notifications';
export default function ActivateLeaderAccountsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [leaderData, setLeaderData] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const showConfirm = (title, message, onOk) => {
    if (Platform.OS === 'web') {
      if (window.confirm(message)) onOk();
    } else {
      Alert.alert(title, message, [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'موافق', onPress: onOk }
      ]);
    }
  };

  const loadData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) return;
      
      const data = userDoc.data();
      setLeaderData(data);
      const leaderBatch = data.batch;

      if (!leaderBatch) {
        Alert.alert('تنبيه', 'لم يتم تحديد الدفعة الخاصة بك');
        setLoading(false);
        return;
      }

      const snap = await getDocs(collection(db, 'users'));
      const students = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.role === 'student' && u.status === 'pending' && u.batch === leaderBatch);
      
      setPendingStudents(students);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

const activateStudent = (studentId, studentName) => {
  showConfirm('تفعيل الحساب', `هل تريد تفعيل حساب ${studentName}؟`, async () => {
    try {
      await updateDoc(doc(db, 'users', studentId), {
        status: 'active',
        activatedAt: new Date().toISOString(),
        activatedBy: auth.currentUser?.uid || 'leader',
        activatedByName: leaderData?.name || 'قائد الدفعة'
      });
      
      // ✅ إرسال إشعار للطالب
      await sendActivationNotification(studentId);
      
      setPendingStudents(prev => prev.filter(s => s.id !== studentId));
      Alert.alert('✅ تم', 'تم تفعيل الحساب وإرسال إشعار للطالب');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تفعيل الحساب');
    }
  });
};

  const rejectStudent = (studentId, studentName) => {
    showConfirm('رفض الحساب', `هل تريد رفض حساب ${studentName}؟`, async () => {
      try {
        await updateDoc(doc(db, 'users', studentId), {
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
          rejectedBy: auth.currentUser?.uid || 'leader',
          rejectedByName: leaderData?.name || 'قائد الدفعة'
        });
        setPendingStudents(prev => prev.filter(s => s.id !== studentId));
        Alert.alert('✅ تم', 'تم رفض الحساب');
      } catch (error) {
        Alert.alert('خطأ', 'فشل في رفض الحساب');
      }
    });
  };

  const activateAll = () => {
    if (pendingStudents.length === 0) {
      Alert.alert('تنبيه', 'لا توجد حسابات معلقة');
      return;
    }

    showConfirm('تفعيل الكل', `هل تريد تفعيل جميع الحسابات (${pendingStudents.length} طالب)؟`, async () => {
      try {
        const batch = writeBatch(db);
        for (const student of pendingStudents) {
          batch.update(doc(db, 'users', student.id), {
            status: 'active',
            activatedAt: new Date().toISOString(),
            activatedBy: auth.currentUser?.uid || 'leader',
            activatedByName: leaderData?.name || 'قائد الدفعة'
          });
        }
        await batch.commit();
        setPendingStudents([]);
        Alert.alert('✅ تم', `تم تفعيل ${pendingStudents.length} حساب`);
      } catch (error) {
        Alert.alert('خطأ', 'فشل في تفعيل الحسابات');
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
      <LinearGradient colors={['#7C3AED', '#A78BFA']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <FontAwesome5 name="crown" size={20} color="#FCD34D" />
          <Text style={styles.headerTitle}>تفعيل حسابات الطلاب</Text>
        </View>
        <Text style={styles.headerSub}>{leaderData?.name || 'قائد'} - دفعة {leaderData?.batch}</Text>
      </LinearGradient>

      <View style={styles.statsCard}>
        <View style={styles.statItem}><Text style={styles.statNum}>{pendingStudents.length}</Text><Text style={styles.statLabel}>معلق</Text></View>
        <TouchableOpacity style={styles.activateAllBtn} onPress={activateAll}><Text style={styles.activateAllText}>تفعيل الكل</Text></TouchableOpacity>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {pendingStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="check-circle" size={64} color="#10B981" />
            <Text style={styles.emptyTitle}>لا توجد حسابات معلقة</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={loadData}><Ionicons name="refresh" size={18} color="#7C3AED" /><Text style={styles.refreshText}>تحديث</Text></TouchableOpacity>
          </View>
        ) : (
          pendingStudents.map(student => (
            <View key={student.id} style={styles.studentCard}>
              <View style={styles.studentInfo}>
                <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{(student.name||'ط').charAt(0)}</Text></View>
                <View style={styles.infoContent}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.infoText}>📱 {student.phone||'-'}</Text>
                  <Text style={styles.infoText}>🏷️ دفعة {student.batch} - {student.specialization||'-'}</Text>
                  {student.serialNumber && <Text style={styles.infoText}>🔢 {student.serialNumber}</Text>}
                </View>
              </View>
              <View style={styles.pendingBadge}><MaterialCommunityIcons name="clock-outline" size={14} color="#F59E0B" /><Text style={styles.pendingText}>في انتظار التفعيل</Text></View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.activateBtn} onPress={() => activateStudent(student.id, student.name)}><Ionicons name="checkmark-circle" size={18} color="#FFF" /><Text style={styles.activateText}>تفعيل</Text></TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectStudent(student.id, student.name)}><Ionicons name="close-circle" size={18} color="#EF4444" /><Text style={styles.rejectText}>رفض</Text></TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </Animated.View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },
  header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'right', marginTop: 4 },
  statsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 16, marginTop: -16, borderRadius: 16, padding: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#7C3AED' },
  statLabel: { fontSize: 10, color: '#64748B', marginTop: 2 },
  activateAllBtn: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  activateAllText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  content: { padding: 16 },
  emptyState: { alignItems: 'center', padding: 40, backgroundColor: '#FFF', borderRadius: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 12 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#F5F3FF', borderRadius: 12, gap: 6 },
  refreshText: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },
  studentCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: '#FEF3C7' },
  studentInfo: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#7C3AED' },
  infoContent: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 4 },
  infoText: { fontSize: 11, color: '#64748B', textAlign: 'right', marginTop: 2 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 12, gap: 6 },
  pendingText: { fontSize: 11, fontWeight: '600', color: '#92400E' },
  actionRow: { flexDirection: 'row', gap: 10 },
  activateBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#10B981', padding: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 6 },
  activateText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  rejectBtn: { flex: 1, flexDirection: 'row', padding: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  rejectText: { color: '#EF4444', fontSize: 14, fontWeight: '600' }
});