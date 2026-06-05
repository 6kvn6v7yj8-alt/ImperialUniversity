import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkBiometricSupport, authenticateForSensitiveAction } from '../../services/biometricService';

export default function SecuritySettingsScreen({ navigation }) {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [requireForGrades, setRequireForGrades] = useState(false);
  const [requireForAttendance, setRequireForAttendance] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const support = await checkBiometricSupport();
    setBiometricAvailable(support.available);
    setBiometricType(support.type);
    const saved = await AsyncStorage.getItem('biometricEnabled');
    setBiometricEnabled(saved === 'true');
    const gradesAuth = await AsyncStorage.getItem('requireBiometricForGrades');
    setRequireForGrades(gradesAuth === 'true');
    const attendanceAuth = await AsyncStorage.getItem('requireBiometricForAttendance');
    setRequireForAttendance(attendanceAuth === 'true');
  };

  const toggleBiometric = async (value) => {
    if (value) {
      const success = await authenticateForSensitiveAction('لتفعيل المصادقة البيومترية');
      if (success) {
        setBiometricEnabled(true);
        await AsyncStorage.setItem('biometricEnabled', 'true');
      }
    } else {
      setBiometricEnabled(false);
      await AsyncStorage.setItem('biometricEnabled', 'false');
      await AsyncStorage.removeItem('savedEmail');
      await AsyncStorage.removeItem('savedPassword');
    }
  };

  const toggleGradesAuth = async (value) => {
    setRequireForGrades(value);
    await AsyncStorage.setItem('requireBiometricForGrades', value.toString());
  };

  const toggleAttendanceAuth = async (value) => {
    setRequireForAttendance(value);
    await AsyncStorage.setItem('requireBiometricForAttendance', value.toString());
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>← رجوع</Text></TouchableOpacity>
        <Text style={styles.title}>🔐 إعدادات الأمان</Text>
      </View>

      {!biometricAvailable ? (
        <View style={styles.card}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>{biometricType} غير متوفر على هذا الجهاز</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>تفعيل {biometricType}</Text>
                <Text style={styles.settingDesc}>استخدم {biometricType} لتسجيل الدخول بسرعة وأمان</Text>
              </View>
              <Switch value={biometricEnabled} onValueChange={toggleBiometric} trackColor={{ false: '#E2E8F0', true: '#93C5FD' }} thumbColor={biometricEnabled ? '#1E40AF' : '#94A3B8'} />
            </View>
          </View>

          {biometricEnabled && (
            <>
              <View style={styles.card}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}><Text style={styles.settingTitle}>تأكيد النتائج</Text><Text style={styles.settingDesc}>يتطلب {biometricType} لعرض النتائج</Text></View>
                  <Switch value={requireForGrades} onValueChange={toggleGradesAuth} trackColor={{ false: '#E2E8F0', true: '#93C5FD' }} thumbColor={requireForGrades ? '#1E40AF' : '#94A3B8'} />
                </View>
              </View>
              <View style={styles.card}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}><Text style={styles.settingTitle}>تأكيد الحضور</Text><Text style={styles.settingDesc}>يتطلب {biometricType} لتسجيل الحضور</Text></View>
                  <Switch value={requireForAttendance} onValueChange={toggleAttendanceAuth} trackColor={{ false: '#E2E8F0', true: '#93C5FD' }} thumbColor={requireForAttendance ? '#1E40AF' : '#94A3B8'} />
                </View>
              </View>
            </>
          )}
        </>
      )}

      <View style={styles.card}>
        <Text style={styles.securityTitle}>🔒 نصائح الأمان</Text>
        <Text style={styles.securityText}>• لا تشارك كلمة المرور مع أي شخص</Text>
        <Text style={styles.securityText}>• تأكد من تسجيل الخروج عند استخدام أجهزة مشتركة</Text>
        <Text style={styles.securityText}>• قم بتغيير كلمة المرور بشكل دوري</Text>
        <Text style={styles.securityText}>• تأكد من تحديث التطبيق لأحدث إصدار</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  header: { backgroundColor: '#1E40AF', padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  backBtn: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  title: { color: '#FFF', fontSize: 20, fontWeight: '800', textAlign: 'right', marginTop: 8 },
  card: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 16, padding: 18, marginBottom: 12 },
  warningIcon: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  warningText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingInfo: { flex: 1, marginRight: 12 },
  settingTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  settingDesc: { fontSize: 12, color: '#64748B', textAlign: 'right', marginTop: 2 },
  securityTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 10 },
  securityText: { fontSize: 12, color: '#64748B', textAlign: 'right', marginBottom: 6 },
});