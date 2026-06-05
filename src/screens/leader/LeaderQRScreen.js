import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Easing, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { 
  validateQRGenerationTime,
  getRemainingTime,
  formatRemainingTime,
  getCurrentTimeString,
  getCurrentDay,
  getCurrentTimeInMinutes,
  timeToMinutes,
  QR_CODE_VALIDITY_SECONDS
} from '../../utils/timeValidator';
import { LinearGradient } from 'expo-linear-gradient';

export default function LeaderLectureControlScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [leaderData, setLeaderData] = useState(null);
  const [leaderBatch, setLeaderBatch] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorLectures, setDoctorLectures] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [activeLecture, setActiveLecture] = useState(null);
  const [timeLeft, setTimeLeft] = useState(QR_CODE_VALIDITY_SECONDS);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    loadLeaderData();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ).start();
    }
  }, [showQR]);

  const loadLeaderData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) return;
      
      const data = userDoc.data();
      setLeaderData(data);
      setLeaderBatch(data.batch);

      // ✅ جلب دكاترة نفس الدفعة فقط
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const batchDoctors = allUsers.filter(u => {
        if (u.role !== 'doctor') return false;
        
        // الدكتور عنده مواد في نفس دفعة الليدر
        if (u.subjects && Array.isArray(u.subjects)) {
          return u.subjects.some(s => s.batch === data.batch || s.batch === 'all');
        }
        
        // لو الدكتور عنده batch مباشر
        if (u.batch) {
          return u.batch === data.batch || u.batch === 'all';
        }
        
        return false;
      });

      setDoctors(batchDoctors);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDoctor = async (doctor) => {
    setSelectedDoctor(doctor);
    
    // استخراج مواد الدكتور في دفعة الليدر
    let subjects = [];
    if (doctor.subjects && Array.isArray(doctor.subjects)) {
      subjects = doctor.subjects.filter(s => 
        s.batch === leaderBatch || s.batch === 'all'
      );
    }
    if (subjects.length === 0 && doctor.subject) {
      subjects = [{ name: doctor.subject, batch: doctor.batch || 'all' }];
    }

    // ✅ جلب الجدول وتصفيته
    const schedulesSnap = await getDocs(collection(db, 'schedules'));
    const allSchedules = schedulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const today = getCurrentDay();
    const currentTime = getCurrentTimeInMinutes();
    
    const lectures = allSchedules
      .filter(schedule => {
        const scheduleSubject = schedule.subject || schedule.courseName || '';
        const isDoctorSubject = subjects.some(s => 
          scheduleSubject.includes(s.name) || s.name.includes(scheduleSubject)
        );
        if (!isDoctorSubject) return false;
        
        const scheduleDay = schedule.day || schedule.dayOfWeek || '';
        return scheduleDay === today || scheduleDay === '';
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

    setDoctorLectures(lectures);
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
    if (!lecture || !selectedDoctor) return;

    const code = generateRandomCode();
    const qrData = JSON.stringify({
      courseId: lecture.subject || lecture.courseId || lecture.id,
      courseName: lecture.courseName || lecture.subject,
      courseCode: lecture.code || lecture.subject,
      courseDoctor: selectedDoctor.name || 'دكتور',
      doctorName: selectedDoctor.name || 'دكتور',
      doctorId: selectedDoctor.id,
      timestamp: Date.now(),
      code: code,
      generatedBy: 'leader',
      generatedByName: leaderData?.name || 'قائد الدفعة',
      batch: lecture.batch === 'all' ? null : lecture.batch,
      room: lecture.room,
      startTime: lecture.startTime,
      endTime: lecture.endTime
    });

    setQrValue(qrData);
    setTimeLeft(QR_CODE_VALIDITY_SECONDS);

    // ✅ QR يتجدد كل 5 ثواني
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          generateNewQRCode(lecture);
          return QR_CODE_VALIDITY_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
  }, [selectedDoctor, leaderData]);

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
    
    return (
      <View style={styles.qrContainer}>
        <View style={styles.qrHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={handleStopQR}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
            <Text style={styles.backText}>رجوع</Text>
          </TouchableOpacity>
          <View style={styles.qrHeaderInfo}>
            <View style={styles.leaderBadge}>
              <FontAwesome5 name="crown" size={14} color="#FCD34D" />
              <Text style={styles.leaderBadgeText}>قائد الدفعة</Text>
            </View>
            <Text style={styles.qrTitle}>📱 QR Code الحضور</Text>
            <Text style={styles.qrSubtitle}>{activeLecture.courseName || activeLecture.subject}</Text>
            <Text style={styles.qrDoctor}>👨‍🏫 {selectedDoctor?.name}</Text>
          </View>
        </View>

        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#10B981" />
            <Text style={styles.statusText}>متبقي {formatRemainingTime(remaining)}</Text>
          </View>
        </View>

        <View style={styles.qrCenter}>
          <Animated.View style={[styles.qrBox, { transform: [{ scale: Animated.multiply(pulseAnim, scaleAnim) }] }]}>
            {qrValue ? (
              <QRCode value={qrValue} size={200} backgroundColor="#FFFFFF" color="#8B5CF6" />
            ) : (
              <ActivityIndicator size="large" color="#8B5CF6" />
            )}
          </Animated.View>

          <View style={[styles.timerContainer, timeLeft <= 2 && styles.timerWarning]}>
            <MaterialCommunityIcons name="timer-sand" size={20} color={timeLeft <= 2 ? '#EF4444' : '#FCD34D'} />
            <Text style={[styles.timerText, timeLeft <= 2 && { color: '#EF4444' }]}>
              يتجدد خلال {timeLeft} ثانية
            </Text>
          </View>
        </View>

        <View style={styles.qrActions}>
          <Text style={styles.qrHint}>📱 اطلب من زملائك مسح الكود</Text>
          <TouchableOpacity style={styles.stopBtn} onPress={handleStopQR}>
            <Ionicons name="stop-circle" size={22} color="#FFF" />
            <Text style={styles.stopBtnText}>إيقاف QR</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#7C3AED', '#A78BFA']} style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
          <Text style={styles.headerBackText}>رجوع</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <FontAwesome5 name="crown" size={20} color="#FCD34D" />
          <Text style={styles.headerTitle}>لوحة قائد الدفعة</Text>
        </View>
        <Text style={styles.headerSub}>
          {leaderData?.name || 'قائد الدفعة'} - دفعة {leaderBatch}
        </Text>
      </LinearGradient>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {!selectedDoctor ? (
          <>
            <Text style={styles.sectionTitle}>👨‍🏫 دكاترة دفعة {leaderBatch}</Text>
            {doctors.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome5 name="user-md" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>لا يوجد دكاترة لدفعتك</Text>
              </View>
            ) : (
              doctors.map(doctor => (
                <TouchableOpacity
                  key={doctor.id}
                  style={styles.doctorCard}
                  onPress={() => handleSelectDoctor(doctor)}
                  activeOpacity={0.8}
                >
                  <View style={styles.doctorAvatar}>
                    <Text style={styles.doctorAvatarText}>{doctor.name?.charAt(0) || 'د'}</Text>
                  </View>
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{doctor.name}</Text>
                    <Text style={styles.doctorSubs}>
                      📚 {doctor.subjects?.filter(s => s.batch === leaderBatch || s.batch === 'all').length || 0} مواد
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#7C3AED" />
                </TouchableOpacity>
              ))
            )}
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.backLink} onPress={() => { setSelectedDoctor(null); setDoctorLectures([]); }}>
              <Ionicons name="arrow-back" size={20} color="#7C3AED" />
              <Text style={styles.backLinkText}>تغيير الدكتور</Text>
            </TouchableOpacity>

            <View style={styles.selectedDocCard}>
              <View style={styles.docAvatarLg}>
                <Text style={styles.docAvatarLgText}>{selectedDoctor.name?.charAt(0) || 'د'}</Text>
              </View>
              <Text style={styles.docNameLg}>{selectedDoctor.name}</Text>
            </View>

            <Text style={styles.sectionTitle}>📚 محاضرات اليوم</Text>
            
            {doctorLectures.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="calendar-blank" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>لا توجد محاضرات اليوم</Text>
              </View>
            ) : (
              doctorLectures.map((lecture, index) => {
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
                        <Ionicons name="time-outline" size={15} color="#64748B" />
                        <Text style={styles.detailText}>{lecture.startTime} - {lecture.endTime}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={15} color="#64748B" />
                        <Text style={styles.detailText}>{lecture.room || 'غير محدد'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="people-outline" size={15} color="#64748B" />
                        <Text style={styles.detailText}>دفعة {lecture.batch || 'الكل'}</Text>
                      </View>
                    </View>

                    {isActive && (
                      <TouchableOpacity style={styles.qrBtn} onPress={() => handleGenerateQR(lecture)}>
                        <MaterialCommunityIcons name="qrcode-scan" size={22} color="#FFF" />
                        <Text style={styles.qrBtnText}>توليد QR Code</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F3FF' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },

  header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerBackBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 12, gap: 4 },
  headerBackText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'right', marginTop: 4 },

  content: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 12, marginTop: 16 },

  // Doctor Card
  doctorCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#E9D5FF' },
  doctorAvatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(124,58,237,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  doctorAvatarText: { fontSize: 20, fontWeight: '800', color: '#7C3AED' },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  doctorSubs: { fontSize: 12, color: '#7C3AED', textAlign: 'right', marginTop: 3 },

  // Selected Doctor
  backLink: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  backLinkText: { color: '#7C3AED', fontSize: 14, fontWeight: '600' },
  selectedDocCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#7C3AED', marginBottom: 16 },
  docAvatarLg: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(124,58,237,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  docAvatarLgText: { fontSize: 24, fontWeight: '800', color: '#7C3AED' },
  docNameLg: { fontSize: 18, fontWeight: '800', color: '#1E293B' },

  // Lecture Card
  lectureCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#E2E8F0' },
  lectureCardActive: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  lectureCardFinished: { borderColor: '#CBD5E1', opacity: 0.7 },
  statusBadge: { alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#DBEAFE', marginBottom: 10 },
  statusBadgeActive: { backgroundColor: '#D1FAE5' },
  statusBadgeFinished: { backgroundColor: '#F1F5F9' },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#1E40AF' },
  lectureName: { fontSize: 16, fontWeight: '800', color: '#1E293B', textAlign: 'right', marginBottom: 8 },
  lectureDetails: { gap: 6, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  detailText: { fontSize: 13, color: '#64748B' },
  qrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C3AED', padding: 14, borderRadius: 14, gap: 8 },
  qrBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', padding: 40, backgroundColor: '#FFF', borderRadius: 16 },
  emptyText: { fontSize: 15, color: '#94A3B8', marginTop: 12 },

  // QR Screen
  qrContainer: { flex: 1, backgroundColor: '#0F0722', paddingTop: 50 },
  qrHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, gap: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 12, gap: 4 },
  backText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  qrHeaderInfo: { flex: 1, alignItems: 'flex-end' },
  leaderBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(252,211,77,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4, marginBottom: 8 },
  leaderBadgeText: { color: '#FCD34D', fontSize: 11, fontWeight: '600' },
  qrTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  qrSubtitle: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
  qrDoctor: { color: '#A78BFA', fontSize: 13, marginTop: 4 },
  statusBar: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20, marginBottom: 20 },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { color: '#E2E8F0', fontSize: 13 },
  qrCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  qrBox: { backgroundColor: '#FFF', padding: 24, borderRadius: 24, borderWidth: 3, borderColor: '#7C3AED' },
  timerContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 20, padding: 12, backgroundColor: 'rgba(252,211,77,0.1)', borderRadius: 14, gap: 8 },
  timerWarning: { backgroundColor: 'rgba(239,68,68,0.1)' },
  timerText: { color: '#FCD34D', fontSize: 16, fontWeight: '700' },
  qrActions: { padding: 20, paddingBottom: 40 },
  qrHint: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  stopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', padding: 16, borderRadius: 14, gap: 8 },
  stopBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' }
});