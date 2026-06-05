import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Animated, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sendLocalNotification } from '../../services/notifications';

const BATCHES = ['A', 'B', 'C', 'D'];
const SPECIALIZATIONS = ['طب', 'صيدلة', 'تمريض', 'اسنان', 'مختبرات'];

export default function SendNotificationScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [target, setTarget] = useState('all');
  const [targetBatch, setTargetBatch] = useState('A');
  const [targetSpecialization, setTargetSpecialization] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();
  }, []);

  const types = [
    { key: 'general', label: 'عام', icon: 'notifications-outline', color: '#475569' },
    { key: 'grade', label: 'نتيجة', icon: 'stats-chart-outline', color: '#059669' },
    { key: 'lecture', label: 'محاضرة', icon: 'calendar-outline', color: '#1E40AF' },
    { key: 'payment', label: 'مالي', icon: 'wallet-outline', color: '#D97706' },
    { key: 'urgent', label: 'عاجل', icon: 'warning-outline', color: '#DC2626' },
  ];

  const targets = [
    { key: 'all', label: 'جميع المستخدمين', icon: 'earth-outline' },
    { key: 'students', label: 'الطلاب فقط', icon: 'school-outline' },
    { key: 'batch', label: 'دفعة محددة', icon: 'layers-outline' },
    { key: 'specialization', label: 'تخصص ودفعة', icon: 'ribbon-outline' },
    { key: 'student', label: 'طالب واحد', icon: 'person-outline' },
  ];

  const loadStudents = async () => {
    if (!targetBatch) return;
    setLoadingStudents(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'student'), where('batch', '==', targetBatch))
      );
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (targetSpecialization) {
        list = list.filter(s => s.specialization === targetSpecialization);
      }
      setStudents(list);
    } catch (e) {
      console.log('Error:', e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const openStudentPicker = () => {
    loadStudents();
    setShowStudentPicker(true);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('تنبيه', 'الرجاء كتابة العنوان والنص');
      return;
    }

    if (target === 'specialization' && !targetSpecialization) {
      Alert.alert('تنبيه', 'الرجاء اختيار التخصص');
      return;
    }

    if (target === 'student' && !selectedStudent) {
      Alert.alert('تنبيه', 'الرجاء اختيار طالب');
      return;
    }

    setLoading(true);
    try {
      const notificationData = {
        title: title.trim(),
        body: body.trim(),
        type,
        target,
        targetBatch: (target === 'batch' || target === 'specialization') ? targetBatch : null,
        targetSpecialization: target === 'specialization' ? targetSpecialization : null,
        targetStudent: target === 'student' ? selectedStudent?.name : null,
        targetStudentId: target === 'student' ? selectedStudent?.id : null,
        sentAt: new Date().toISOString(),
        readBy: [],
      };

      await addDoc(collection(db, 'notifications'), notificationData);
      await sendLocalNotification(title.trim(), body.trim());

      Alert.alert('✅ تم', 'تم إرسال الإشعار بنجاح', [
        { text: 'حسناً', onPress: () => {
          setTitle(''); setBody(''); setType('general'); setTarget('all');
          setSelectedStudent(null); setTargetSpecialization('');
        }}
      ]);
    } catch (error) {
      Alert.alert('خطأ', 'فشل إرسال الإشعار: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔔 إرسال إشعار</Text>
        <Text style={styles.headerSub}>إرسال إشعارات للمستخدمين</Text>
      </LinearGradient>

      <Animated.View style={[styles.form, { opacity: fadeAnim, transform: [{ translateY: slideUp }] }]}>
        {/* نوع الإشعار */}
        <Text style={styles.sectionTitle}>📋 نوع الإشعار</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
          {types.map(t => (
            <TouchableOpacity 
              key={t.key} 
              style={[styles.typeChip, type === t.key && { backgroundColor: t.color + '15', borderColor: t.color }]} 
              onPress={() => setType(t.key)}
            >
              <Ionicons name={t.icon} size={18} color={type === t.key ? t.color : '#94A3B8'} />
              <Text style={[styles.typeChipText, type === t.key && { color: t.color, fontWeight: '700' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* المستهدفون */}
        <Text style={styles.sectionTitle}>👥 المستهدفون</Text>
        <View style={styles.targetGrid}>
          {targets.map(t => (
            <TouchableOpacity 
              key={t.key} 
              style={[styles.targetCard, target === t.key && styles.targetCardActive]} 
              onPress={() => { setTarget(t.key); if (t.key === 'student') setSelectedStudent(null); if (t.key !== 'specialization') setTargetSpecialization(''); }}
            >
              <Ionicons name={t.icon} size={22} color={target === t.key ? '#1E40AF' : '#94A3B8'} />
              <Text style={[styles.targetText, target === t.key && styles.targetTextActive]}>{t.label}</Text>
              {target === t.key && <Ionicons name="checkmark-circle" size={18} color="#1E40AF" style={{ position: 'absolute', top: 6, left: 6 }} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* دفعة محددة أو تخصص ودفعة */}
        {(target === 'batch' || target === 'specialization') && (
          <View style={styles.subSection}>
            <Text style={styles.label}>اختر الدفعة</Text>
            <View style={styles.chipRow}>
              {BATCHES.map(b => (
                <TouchableOpacity key={b} style={[styles.chip, targetBatch === b && styles.chipActive]} onPress={() => setTargetBatch(b)}>
                  <Text style={[styles.chipText, targetBatch === b && styles.chipTextActive]}>دفعة {b}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {target === 'specialization' && (
              <>
                <Text style={[styles.label, { marginTop: 14 }]}>اختر التخصص</Text>
                <View style={styles.chipRow}>
                  {SPECIALIZATIONS.map(s => (
                    <TouchableOpacity key={s} style={[styles.chip, targetSpecialization === s && styles.chipActive]} onPress={() => setTargetSpecialization(s)}>
                      <Text style={[styles.chipText, targetSpecialization === s && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* طالب واحد */}
        {target === 'student' && (
          <View style={styles.subSection}>
            <Text style={styles.label}>اختر الدفعة</Text>
            <View style={styles.chipRow}>
              {BATCHES.map(b => (
                <TouchableOpacity key={b} style={[styles.chip, targetBatch === b && styles.chipActive]} onPress={() => { setTargetBatch(b); setSelectedStudent(null); }}>
                  <Text style={[styles.chipText, targetBatch === b && styles.chipTextActive]}>دفعة {b}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>اختر التخصص (اختياري)</Text>
            <View style={styles.chipRow}>
              {SPECIALIZATIONS.map(s => (
                <TouchableOpacity key={s} style={[styles.chip, targetSpecialization === s && styles.chipActive]} onPress={() => { setTargetSpecialization(s); setSelectedStudent(null); }}>
                  <Text style={[styles.chipText, targetSpecialization === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.pickStudentBtn} onPress={openStudentPicker}>
              <Ionicons name="person-outline" size={20} color="#1E40AF" />
              <Text style={styles.pickStudentText}>{selectedStudent ? `✅ ${selectedStudent.name}` : 'اختيار طالب'}</Text>
              <Ionicons name="chevron-down" size={18} color="#1E40AF" />
            </TouchableOpacity>
          </View>
        )}

        {/* عنوان الإشعار */}
        <Text style={styles.label}>عنوان الإشعار *</Text>
        <TextInput style={styles.input} placeholder="اكتب عنوان الإشعار" value={title} onChangeText={setTitle} placeholderTextColor="#94A3B8" textAlign="right" maxLength={50} />
        <Text style={styles.counter}>{title.length}/50</Text>

        {/* نص الإشعار */}
        <Text style={styles.label}>نص الإشعار *</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="اكتب نص الإشعار التفصيلي" value={body} onChangeText={setBody} placeholderTextColor="#94A3B8" textAlign="right" multiline numberOfLines={5} maxLength={200} />
        <Text style={styles.counter}>{body.length}/200</Text>

        {/* زر الإرسال */}
        <TouchableOpacity style={[styles.sendBtn, loading && { opacity: 0.7 }]} onPress={handleSend} disabled={loading}>
          <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.sendGradient}>
            {loading ? <ActivityIndicator color="#FFF" size="small" /> : (
              <View style={styles.sendContent}>
                <Ionicons name="paper-plane" size={20} color="#FFF" />
                <Text style={styles.sendText}>إرسال الإشعار</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Student Picker Modal */}
      <Modal visible={showStudentPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👨‍🎓 اختر طالب</Text>
              <TouchableOpacity onPress={() => setShowStudentPicker(false)}><Ionicons name="close" size={22} color="#64748B" /></TouchableOpacity>
            </View>
            {loadingStudents ? <ActivityIndicator size="large" color="#1E40AF" style={{ marginTop: 20 }} /> :
              students.length === 0 ? <Text style={styles.noStudents}>لا يوجد طلاب</Text> :
              <ScrollView style={styles.studentList}>
                {students.map(s => (
                  <TouchableOpacity key={s.id} style={[styles.studentItem, selectedStudent?.id === s.id && styles.studentItemActive]} onPress={() => { setSelectedStudent(s); setShowStudentPicker(false); }}>
                    <View style={styles.studentAvatar}><Text style={styles.studentAvatarText}>{(s.name||'ط').charAt(0)}</Text></View>
                    <View style={styles.studentInfo}><Text style={styles.studentName}>{s.name}</Text><Text style={styles.studentDetails}>{s.specialization||''} - {s.serialNumber||''}</Text></View>
                    {selectedStudent?.id === s.id && <Ionicons name="checkmark-circle" size={22} color="#10B981" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            }
          </View>
        </View>
      </Modal>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  header: { padding: 20, paddingTop: 50, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'right' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'right', marginTop: 4 },
  form: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 12, marginTop: 16 },
  typeRow: { flexDirection: 'row', marginBottom: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', marginRight: 8, gap: 6 },
  typeChipText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  targetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  targetCard: { width: '47%', backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', gap: 8 },
  targetCardActive: { borderColor: '#1E40AF', backgroundColor: '#EEF2FF' },
  targetText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  targetTextActive: { color: '#1E40AF' },
  subSection: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  label: { fontSize: 13, fontWeight: '600', color: '#1E293B', textAlign: 'right', marginBottom: 8, marginTop: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFF' },
  pickStudentBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 12, padding: 14, marginTop: 14, gap: 10, borderWidth: 1.5, borderColor: '#DBEAFE' },
  pickStudentText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1E40AF', textAlign: 'right' },
  input: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, fontSize: 14, color: '#1E293B' },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  counter: { fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 4 },
  sendBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 24 },
  sendGradient: { padding: 18, alignItems: 'center' },
  sendContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sendText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  noStudents: { textAlign: 'center', color: '#94A3B8', padding: 30 },
  studentList: { maxHeight: 400 },
  studentItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 6, backgroundColor: '#F8FAFC', gap: 12 },
  studentItemActive: { backgroundColor: '#EEF2FF', borderWidth: 1.5, borderColor: '#1E40AF' },
  studentAvatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  studentAvatarText: { fontSize: 16, fontWeight: '700', color: '#64748B' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: 'right' },
  studentDetails: { fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 2 },
});