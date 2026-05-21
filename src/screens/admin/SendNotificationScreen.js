import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sendLocalNotification } from '../../services/notifications';

export default function SendNotificationScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [target, setTarget] = useState('all');
  const [targetBatch, setTargetBatch] = useState('A');
  const [loading, setLoading] = useState(false);

  const types = [
    { key: 'general', label: '🔔 عام', icon: '🔔' },
    { key: 'grade', label: '📊 نتيجة', icon: '📊' },
    { key: 'lecture', label: '📅 محاضرة', icon: '📅' },
    { key: 'payment', label: '💰 مالي', icon: '💰' },
    { key: 'urgent', label: '🚨 عاجل', icon: '🚨' },
  ];

  const targets = [
    { key: 'all', label: '🌐 جميع المستخدمين' },
    { key: 'students', label: '👨‍🎓 الطلاب فقط' },
    { key: 'batch', label: '📚 دفعة محددة' },
  ];

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('تنبيه', 'الرجاء كتابة العنوان والنص');
      return;
    }

    setLoading(true);
    try {
      // حفظ الإشعار في Firestore
      const notificationData = {
        title: title.trim(),
        body: body.trim(),
        type,
        target,
        targetBatch: target === 'batch' ? targetBatch : null,
        sentAt: new Date().toISOString(),
        readBy: [],
      };

      await addDoc(collection(db, 'notifications'), notificationData);

      // محاولة إرسال إشعار محلي فوري
      await sendLocalNotification(title.trim(), body.trim());

      Alert.alert('✅ تم', 'تم إرسال الإشعار بنجاح', [
        { text: 'حسناً', onPress: () => {
          setTitle('');
          setBody('');
          setType('general');
          setTarget('all');
        }}
      ]);
    } catch (error) {
      Alert.alert('خطأ', 'فشل إرسال الإشعار: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const batches = ['A', 'B', 'C', 'D'];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← رجوع</Text>
      </TouchableOpacity>

      <View style={styles.headerCard}>
        <Text style={styles.title}>🔔 إرسال إشعار</Text>
        <Text style={styles.subtitle}>أرسل إشعارات لجميع المستخدمين</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>نوع الإشعار</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {types.map(t => (
            <TouchableOpacity 
              key={t.key} 
              style={[styles.chip, type === t.key && styles.chipActive]} 
              onPress={() => setType(t.key)}
            >
              <Text style={[styles.chipText, type === t.key && styles.chipTextActive]}>
                {t.icon} {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>المستهدفون</Text>
        <View style={styles.targetRow}>
          {targets.map(t => (
            <TouchableOpacity 
              key={t.key} 
              style={[styles.targetBtn, target === t.key && styles.targetBtnActive]} 
              onPress={() => setTarget(t.key)}
            >
              <Text style={[styles.targetText, target === t.key && styles.targetTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {target === 'batch' && (
          <View style={styles.batchRow}>
            <Text style={styles.label}>اختر الدفعة</Text>
            <View style={styles.chipRow}>
              {batches.map(b => (
                <TouchableOpacity 
                  key={b} 
                  style={[styles.chip, targetBatch === b && styles.chipActive]} 
                  onPress={() => setTargetBatch(b)}
                >
                  <Text style={[styles.chipText, targetBatch === b && styles.chipTextActive]}>
                    📚 دفعة {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.label}>عنوان الإشعار *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="اكتب عنوان الإشعار" 
          value={title} 
          onChangeText={setTitle} 
          placeholderTextColor="#94A3B8" 
          textAlign="right" 
          maxLength={50}
        />
        <Text style={styles.charCount}>{title.length}/50</Text>

        <Text style={styles.label}>نص الإشعار *</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="اكتب نص الإشعار التفصيلي" 
          value={body} 
          onChangeText={setBody} 
          placeholderTextColor="#94A3B8" 
          textAlign="right" 
          multiline 
          numberOfLines={4}
          maxLength={200}
        />
        <Text style={styles.charCount}>{body.length}/200</Text>

        <TouchableOpacity 
          style={[styles.sendBtn, loading && styles.sendBtnDisabled]} 
          onPress={handleSend} 
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.sendBtnText}> جاري الإرسال...</Text>
            </View>
          ) : (
            <Text style={styles.sendBtnText}>🚀 إرسال الإشعار</Text>
          )}
        </TouchableOpacity>
      </View>
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
  formCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: -10, borderRadius: 20, padding: 20, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: 'right', marginBottom: 8, marginTop: 14 },
  chipScroll: { marginBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', marginRight: 8 },
  chipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFF' },
  targetRow: { gap: 8 },
  targetBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 6 },
  targetBtnActive: { backgroundColor: '#EEF2FF', borderColor: '#1E40AF' },
  targetText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  targetTextActive: { color: '#1E40AF' },
  batchRow: { marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1E293B' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 4, marginBottom: 4 },
  sendBtn: { backgroundColor: '#1E40AF', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 20, shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  sendBtnDisabled: { backgroundColor: '#93C5FD' },
  sendBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});