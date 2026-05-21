import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function DoctorQRCodeScreen({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [qrValue, setQrValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [isActive, setIsActive] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    fetchCourses();
    return () => clearInterval(timerRef.current);
  }, []);

  const fetchCourses = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'courses'));
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.log('Error fetching courses:', error);
    }
  };

  const generateQR = () => {
    if (!selectedCourse) {
      Alert.alert('تنبيه', 'اختر المادة أولاً');
      return;
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const qrData = JSON.stringify({
      courseId: selectedCourse.id,
      courseName: selectedCourse.name,
      courseCode: selectedCourse.code,
      timestamp: Date.now(),
      code: code,
    });

    setQrValue(qrData);
    setIsActive(true);
    setTimeLeft(30);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          generateNewQR();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const generateNewQR = () => {
    if (!selectedCourse) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setQrValue(JSON.stringify({
      courseId: selectedCourse.id,
      courseName: selectedCourse.name,
      courseCode: selectedCourse.code,
      timestamp: Date.now(),
      code: code,
    }));
  };

  const stopQR = () => {
    setIsActive(false);
    setQrValue('');
    clearInterval(timerRef.current);
    pulseAnim.setValue(1);
  };



  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📱 عرض QR Code</Text>
        <Text style={styles.subtitle}>امسح الكود من تطبيق الموبايل</Text>
      </View>

      <View style={styles.content}>
        {!isActive ? (
          <>
            <Text style={styles.selectLabel}>اختر المادة</Text>
            <View style={styles.courseList}>
              {courses.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>لا توجد مواد مضافة</Text>
                  <Text style={styles.emptyHint}>أضف مواد من لوحة الأدمن أولاً</Text>
                </View>
              ) : (
                courses.map(course => (
                  <TouchableOpacity
                    key={course.id}
                    style={[styles.courseItem, selectedCourse?.id === course.id && styles.courseItemActive]}
                    onPress={() => setSelectedCourse(course)}
                  >
                    <View style={styles.courseInfo}>
                      <Text style={[styles.courseCode, selectedCourse?.id === course.id && styles.courseCodeActive]}>
                        {course.code}
                      </Text>
                      <Text style={[styles.courseName, selectedCourse?.id === course.id && styles.courseNameActive]}>
                        {course.name}
                      </Text>
                      {course.day && <Text style={styles.courseDay}>📅 {course.day} - {course.time}</Text>}
                    </View>
                    {selectedCourse?.id === course.id && (
                      <Text style={styles.checkIcon}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>

            <TouchableOpacity 
              style={[styles.startBtn, (!selectedCourse) && styles.startBtnDisabled]} 
              onPress={generateQR}
              disabled={!selectedCourse}
            >
              <Text style={styles.startBtnText}>▶️ بدء عرض QR</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.activeHeader}>
              <Text style={styles.activeCourse}>{selectedCourse?.name}</Text>
              <Text style={styles.activeCode}>{selectedCourse?.code}</Text>
            </View>
            
            {/* QR Code */}
            <Animated.View style={[styles.qrBox, { transform: [{ scale: pulseAnim }] }]}>
              {qrValue ? (
                <QRCode
                  value={qrValue}
                  size={220}
                  backgroundColor="#FFFFFF"
                  color="#1E40AF"
                />
              ) : (
                <Text>Loading...</Text>
              )}
            </Animated.View>

            <View style={styles.timerBox}>
              <Text style={styles.timerLabel}>يتجدد خلال</Text>
              <Text style={[styles.timerNum, timeLeft <= 10 && styles.timerWarning]}>
                {timeLeft}
              </Text>
              <Text style={styles.timerLabel}>ثانية</Text>
            </View>

            <Text style={styles.infoText}>
              📱 افتح تطبيق الجامعة على الموبايل{'\n'}واذهب إلى الحضور ← امسح الكود
            </Text>

            <TouchableOpacity style={styles.stopBtn} onPress={stopQR}>
              <Text style={styles.stopBtnText}>⏹️ إيقاف</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  header: { backgroundColor: '#1E40AF', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { alignSelf: 'flex-end', marginBottom: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  backText: { fontSize: 14, color: '#FFF', fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 2 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 20 },
  selectLabel: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12, alignSelf: 'flex-end' },
  courseList: { width: '100%', marginBottom: 20 },
  courseItem: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 2, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' },
  courseItemActive: { borderColor: '#1E40AF', backgroundColor: '#EEF2FF' },
  courseInfo: { flex: 1 },
  courseCode: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  courseCodeActive: { color: '#1E40AF' },
  courseName: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  courseNameActive: { color: '#1E40AF' },
  courseDay: { fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 2 },
  checkIcon: { fontSize: 20, color: '#1E40AF', fontWeight: '700', marginLeft: 8 },
  emptyBox: { alignItems: 'center', padding: 30 },
  emptyText: { fontSize: 16, color: '#94A3B8', fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  startBtn: { backgroundColor: '#1E40AF', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 14, marginTop: 10, width: '100%', alignItems: 'center' },
  startBtnDisabled: { backgroundColor: '#93C5FD' },
  startBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  activeHeader: { alignItems: 'center', marginBottom: 20 },
  activeCourse: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  activeCode: { fontSize: 13, color: '#64748B', marginTop: 4 },
  qrBox: { backgroundColor: '#FFF', padding: 24, borderRadius: 20, shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10, marginBottom: 12 },
  timerBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  timerLabel: { fontSize: 14, color: '#64748B' },
  timerNum: { fontSize: 32, fontWeight: '800', color: '#1E40AF' },
  timerWarning: { color: '#EF4444' },
  infoText: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  stopBtn: { backgroundColor: '#FEF2F2', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA' },
  stopBtnText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
});