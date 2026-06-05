import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Easing, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { 
  validateQRGenerationTime, 
  getRemainingTime, 
  formatRemainingTime,
  getCurrentTimeString,
  getCurrentDay,
  getCurrentTimeInMinutes,
  timeToMinutes
} from '../../utils/timeValidator';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function DoctorLectureControlScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [doctorData, setDoctorData] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [activeLecture, setActiveLecture] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [qrRefreshing, setQrRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    loadAllData();
    refreshIntervalRef.current = setInterval(loadAllData, 30000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
      ]).start();
    }
  }, [loading]);

  useEffect(() => {
    if (showQR) {
      startPulseAnimation();
      startShimmerAnimation();
    } else {
      pulseAnim.setValue(1);
      shimmerAnim.setValue(0);
    }
  }, [showQR]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();
  };

  const startShimmerAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 2000, easing: Easing.linear, useNativeDriver: true })
      ])
    ).start();
  };

  const loadAllData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. جلب بيانات الدكتور
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        setLoading(false);
        return;
      }
      
      const doctorData = userDoc.data();
      setDoctorData(doctorData);

      // 2. استخراج أسماء مواد الدكتور
      let doctorSubjectNames = [];
      
      if (doctorData.subjects && Array.isArray(doctorData.subjects)) {
        doctorSubjectNames = doctorData.subjects.map(s => s.name);
      }
      
      if (doctorData.subject && !doctorSubjectNames.includes(doctorData.subject)) {
        doctorSubjectNames.push(doctorData.subject);
      }

      console.log('👨‍🏫 Doctor subjects:', doctorSubjectNames);

      if (doctorSubjectNames.length === 0) {
        setLectures([]);
        setLoading(false);
        return;
      }

      // 3. جلب الجدول من schedules
      const schedulesSnap = await getDocs(collection(db, 'schedules'));
      const allSchedules = schedulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 4. تصفية محاضرات الدكتور لليوم الحالي
      const today = getCurrentDay();
      const currentTime = getCurrentTimeInMinutes();

      console.log('📅 Today:', today);
      console.log('🕐 Current time (minutes):', currentTime);

      const doctorLectures = allSchedules
        .filter(schedule => {
          const scheduleSubject = schedule.subject || schedule.courseName || '';
          
          // التحقق من أن المادة من مواد الدكتور
          const isDoctorSubject = doctorSubjectNames.some(
            subj => scheduleSubject.includes(subj) || subj.includes(scheduleSubject)
          );

          if (!isDoctorSubject) return false;

          // التحقق من اليوم
          const scheduleDay = schedule.day || schedule.dayOfWeek || '';
          const isToday = scheduleDay === today || scheduleDay === '';

          return isToday;
        })
        .map(schedule => {
          const startMinutes = timeToMinutes(schedule.startTime || '09:00');
          const endMinutes = timeToMinutes(schedule.endTime || '10:30');
          
          let lectureStatus = 'upcoming';
          if (currentTime >= startMinutes && currentTime <= endMinutes) {
            lectureStatus = 'active';
          } else if (currentTime > endMinutes) {
            lectureStatus = 'finished';
          }

          return {
            ...schedule,
            lectureStatus,
            startMinutes,
            endMinutes,
            canGenerateQR: lectureStatus === 'active'
          };
        })
        .sort((a, b) => {
          const order = { active: 0, upcoming: 1, finished: 2 };
          return (order[a.lectureStatus] || 3) - (order[b.lectureStatus] || 3);
        });

      console.log('📋 Doctor lectures found:', doctorLectures.length);
      console.log('🟢 Active:', doctorLectures.filter(l => l.lectureStatus === 'active').length);

      setLectures(doctorLectures);
      setActiveLecture(doctorLectures.find(l => l.lectureStatus === 'active') || null);

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = (lecture) => {
    const validation = validateQRGenerationTime(lecture);
    
    if (!validation.canGenerate) {
      Alert.alert('⏰ غير مسموح', validation.message);
      return;
    }
    
    setActiveLecture(lecture);
    generateNewQRCode(lecture);
    setShowQR(true);
  };

  const generateNewQRCode = useCallback((lecture) => {
    if (!lecture) return;
    
    const code = generateRandomCode();
    const qrData = JSON.stringify({
      courseId: lecture.subject || lecture.courseId || lecture.id,
      courseName: lecture.courseName || lecture.subject,
      courseCode: lecture.code || lecture.subject,
      courseDoctor: doctorData?.name || 'دكتور',
      doctorName: doctorData?.name || 'دكتور',
      doctorId: auth.currentUser?.uid,
      timestamp: Date.now(),
      code: code,
      generatedBy: 'doctor',
      batch: lecture.batch === 'all' ? null : lecture.batch,
      room: lecture.room,
      startTime: lecture.startTime,
      endTime: lecture.endTime
    });
    
    setQrValue(qrData);
    setTimeLeft(30);
    
    setQrRefreshing(true);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 150, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true })
    ]).start(() => setQrRefreshing(false));
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          generateNewQRCode(lecture);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
  }, [doctorData]);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleStopQR = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowQR(false);
    setQrValue('');
    setActiveLecture(null);
  };

  // شاشة QR Code
  if (showQR && activeLecture) {
    const remaining = getRemainingTime(activeLecture.endTime);
    const shimmerTranslate = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-200, 200]
    });
    
    return (
      <View style={styles.qrContainer}>
        <View style={styles.qrHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleStopQR}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
            <Text style={styles.backText}>رجوع</Text>
          </TouchableOpacity>
          <View style={styles.qrHeaderInfo}>
            <Text style={styles.qrTitle}>📱 QR Code الحضور</Text>
            <Text style={styles.qrSubtitle}>{activeLecture.courseName || activeLecture.subject}</Text>
            {activeLecture.batch !== 'all' && (
              <View style={styles.batchBadge}>
                <Text style={styles.batchText}>دفعة {activeLecture.batch}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={remaining.isFinished ? '#EF4444' : '#10B981'} />
            <Text style={[styles.statusText, remaining.isFinished && { color: '#EF4444' }]}>
              {remaining.isFinished ? 'انتهت المحاضرة' : `متبقي ${formatRemainingTime(remaining)}`}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.liveDot, !remaining.isFinished && styles.liveDotActive]} />
            <Text style={styles.statusText}>{remaining.isFinished ? 'منتهية' : 'جارية'}</Text>
          </View>
        </View>

        <View style={styles.qrCenter}>
          <Animated.View style={[styles.qrBox, { transform: [{ scale: Animated.multiply(pulseAnim, scaleAnim) }] }]}>
            <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }] }]} />
            {qrValue ? (
              <QRCode value={qrValue} size={200} backgroundColor="#FFFFFF" color="#1E40AF" />
            ) : (
              <ActivityIndicator size="large" color="#1E40AF" />
            )}
          </Animated.View>

          <View style={[styles.timerContainer, timeLeft <= 10 && styles.timerWarning]}>
            <MaterialCommunityIcons name="timer-sand" size={20} color={timeLeft <= 10 ? '#EF4444' : '#FCD34D'} />
            <Text style={[styles.timerText, timeLeft <= 10 && { color: '#EF4444' }]}>
              يتجدد خلال {timeLeft} ثانية
            </Text>
          </View>
        </View>

        <View style={styles.qrActions}>
          <Text style={styles.qrHint}>📱 اطلب من الطلاب مسح الكود لتسجيل حضورهم</Text>
          <TouchableOpacity style={styles.stopButton} onPress={handleStopQR}>
            <Ionicons name="stop-circle" size={22} color="#FFF" />
            <Text style={styles.stopButtonText}>إيقاف QR</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>جاري تحميل المحاضرات...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
          <Text style={styles.headerBackText}>رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📋 محاضرات اليوم</Text>
        <Text style={styles.headerSubtitle}>
          {doctorData?.name || 'دكتور'} - {getCurrentTimeString()}
        </Text>
      </LinearGradient>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {lectures.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>لا توجد محاضرات اليوم</Text>
            <Text style={styles.emptySubtitle}>
              تحقق من إضافة المواد في الجدول الدراسي
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={loadAllData}
            >
              <Ionicons name="refresh" size={20} color="#1E40AF" />
              <Text style={styles.refreshText}>تحديث</Text>
            </TouchableOpacity>
          </View>
        ) : (
          lectures.map((lecture, index) => {
            const isActive = lecture.lectureStatus === 'active';
            const isFinished = lecture.lectureStatus === 'finished';
            
            return (
              <View key={lecture.id || index} style={[
                styles.lectureCard,
                isActive && styles.lectureCardActive,
                isFinished && styles.lectureCardFinished
              ]}>
                <View style={[styles.statusBadge, isActive && styles.statusBadgeActive, isFinished && styles.statusBadgeFinished]}>
                  <Text style={styles.statusBadgeText}>
                    {isActive ? '🟢 جارية' : isFinished ? '⚫ منتهية' : '🔵 قادمة'}
                  </Text>
                </View>

                <Text style={styles.lectureName}>{lecture.courseName || lecture.subject}</Text>
                
                <View style={styles.lectureDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color="#64748B" />
                    <Text style={styles.detailText}>{lecture.startTime} - {lecture.endTime}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#64748B" />
                    <Text style={styles.detailText}>{lecture.room || 'غير محدد'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={16} color="#64748B" />
                    <Text style={styles.detailText}>دفعة {lecture.batch || 'الكل'}</Text>
                  </View>
                </View>

                {isActive && (
                  <TouchableOpacity style={styles.qrButton} onPress={() => handleGenerateQR(lecture)}>
                    <MaterialCommunityIcons name="qrcode-scan" size={22} color="#FFF" />
                    <Text style={styles.qrButtonText}>عرض QR Code</Text>
                  </TouchableOpacity>
                )}

                {!isActive && !isFinished && (
                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={16} color="#3B82F6" />
                    <Text style={styles.infoText}>
                      {lecture.startMinutes ? 
                        `تبدأ الساعة ${lecture.startTime}` : 
                        'في انتظار وقت المحاضرة'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
        
        <View style={{ height: 30 }} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },

  header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerBackBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 12, gap: 4 },
  headerBackText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'right' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'right', marginTop: 4 },

  content: { padding: 16 },

  emptyState: { alignItems: 'center', padding: 40, backgroundColor: '#FFF', borderRadius: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'center' },
  refreshButton: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#EEF2FF', borderRadius: 12, gap: 8 },
  refreshText: { fontSize: 14, fontWeight: '600', color: '#1E40AF' },

  lectureCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 2, borderColor: '#E2E8F0' },
  lectureCardActive: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  lectureCardFinished: { borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', opacity: 0.8 },

  statusBadge: { alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#DBEAFE', marginBottom: 10 },
  statusBadgeActive: { backgroundColor: '#D1FAE5' },
  statusBadgeFinished: { backgroundColor: '#F1F5F9' },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#1E40AF' },

  lectureName: { fontSize: 17, fontWeight: '800', color: '#1E293B', textAlign: 'right', marginBottom: 8 },
  lectureDetails: { gap: 6, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  detailText: { fontSize: 13, color: '#64748B' },

  qrButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E40AF', padding: 14, borderRadius: 14, gap: 8 },
  qrButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  infoBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: '#EFF6FF', borderRadius: 12, gap: 6 },
  infoText: { fontSize: 12, color: '#3B82F6', fontWeight: '500' },

  // QR Screen
  qrContainer: { flex: 1, backgroundColor: '#0F172A', paddingTop: 50 },
  qrHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, gap: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 12, gap: 4 },
  backText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  qrHeaderInfo: { flex: 1, alignItems: 'flex-end' },
  qrTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  qrSubtitle: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
  batchBadge: { backgroundColor: 'rgba(252,211,77,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  batchText: { color: '#FCD34D', fontSize: 12, fontWeight: '600' },

  statusBar: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginBottom: 20 },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { color: '#E2E8F0', fontSize: 13 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#64748B' },
  liveDotActive: { backgroundColor: '#10B981' },

  qrCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  qrBox: { backgroundColor: '#FFF', padding: 24, borderRadius: 24, position: 'relative', overflow: 'hidden' },
  shimmer: { position: 'absolute', top: 0, left: 0, right: 0, height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', width: 100 },

  timerContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 20, padding: 12, backgroundColor: 'rgba(252,211,77,0.1)', borderRadius: 14, gap: 8 },
  timerWarning: { backgroundColor: 'rgba(239,68,68,0.1)' },
  timerText: { color: '#FCD34D', fontSize: 16, fontWeight: '700' },

  qrActions: { padding: 20, paddingBottom: 40 },
  qrHint: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  stopButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', padding: 16, borderRadius: 14, gap: 8 },
  stopButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' }
});