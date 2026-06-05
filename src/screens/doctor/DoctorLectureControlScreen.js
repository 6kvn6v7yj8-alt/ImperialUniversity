import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Easing, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { getDoctorTodayLectures, startLecture, endLecture } from '../../services/lectureService';
import { 
  validateQRGenerationTime, 
  getRemainingTime, 
  formatRemainingTime,
  getCurrentTimeString 
} from '../../utils/timeValidator';

const { width } = Dimensions.get('window');

export default function DoctorLectureControlScreen({ navigation }) {
  // State
  const [loading, setLoading] = useState(true);
  const [doctorData, setDoctorData] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [activeLecture, setActiveLecture] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [qrRefreshing, setQrRefreshing] = useState(false);
  
  // Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    loadData();
    // تحديث حالة المحاضرات كل 30 ثانية
    refreshIntervalRef.current = setInterval(loadData, 30000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []);

  // أنيميشن الدخول
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      })
    ]).start();
  }, [loading]);

  // أنيميشن QR Code
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
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const startShimmerAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // جلب بيانات الدكتور
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setDoctorData(userDoc.data());
        }
      }
      
      // جلب محاضرات اليوم
      const result = await getDoctorTodayLectures();
      if (result.success) {
        setLectures(result.lectures);
        setActiveLecture(result.activeLecture);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = (lecture) => {
    // التحقق من صلاحية الوقت
    const validation = validateQRGenerationTime(lecture);
    
    if (!validation.canGenerate) {
      Alert.alert(
        '⏰ غير مسموح',
        validation.message,
        [{ text: 'حسناً' }]
      );
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
      courseId: lecture.subject || lecture.courseId,
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
    
    // تأثير تجديد QR
    setQrRefreshing(true);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true
      })
    ]).start(() => setQrRefreshing(false));
    
    // تجديد QR Code كل 30 ثانية
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

  const handleStartLecture = async (lecture) => {
    const result = await startLecture(lecture.id);
    if (result.success) {
      Alert.alert('✅ تم', 'تم بدء المحاضرة بنجاح');
      loadData();
    } else {
      Alert.alert('❌ خطأ', result.error);
    }
  };

  const handleEndLecture = async (lecture) => {
    Alert.alert(
      'إنهاء المحاضرة',
      'هل أنت متأكد من إنهاء المحاضرة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إنهاء',
          style: 'destructive',
          onPress: async () => {
            const result = await endLecture(lecture.id);
            if (result.success) {
              Alert.alert('✅ تم', 'تم إنهاء المحاضرة');
              handleStopQR();
              loadData();
            }
          }
        }
      ]
    );
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
        {/* Header */}
        <View style={styles.qrHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleStopQR}
          >
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

        {/* Timer & Status */}
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <MaterialCommunityIcons 
              name="clock-outline" 
              size={18} 
              color={remaining.isFinished ? '#EF4444' : '#10B981'} 
            />
            <Text style={[styles.statusText, remaining.isFinished && { color: '#EF4444' }]}>
              {remaining.isFinished ? 'انتهت المحاضرة' : `متبقي ${formatRemainingTime(remaining)}`}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.liveDot, !remaining.isFinished && styles.liveDotActive]} />
            <Text style={styles.statusText}>
              {remaining.isFinished ? 'منتهية' : 'جارية'}
            </Text>
          </View>
        </View>

        {/* QR Code Display */}
        <View style={styles.qrCenter}>
          <Animated.View style={[
            styles.qrBox,
            {
              transform: [
                { scale: Animated.multiply(pulseAnim, scaleAnim) }
              ]
            }
          ]}>
            {/* Shimmer effect */}
            <Animated.View style={[
              styles.shimmer,
              { transform: [{ translateX: shimmerTranslate }] }
            ]} />
            
            {qrValue ? (
              <QRCode
                value={qrValue}
                size={200}
                backgroundColor="#FFFFFF"
                color="#1E40AF"
                logo={require('../../../assets/icon.png')}
                logoSize={40}
                logoBackgroundColor="#FFFFFF"
              />
            ) : (
              <ActivityIndicator size="large" color="#1E40AF" />
            )}
          </Animated.View>

          {/* Timer */}
          <View style={[styles.timerContainer, timeLeft <= 10 && styles.timerWarning]}>
            <MaterialCommunityIcons 
              name="timer-sand" 
              size={20} 
              color={timeLeft <= 10 ? '#EF4444' : '#FCD34D'} 
            />
            <Text style={[styles.timerText, timeLeft <= 10 && { color: '#EF4444' }]}>
              يتجدد خلال {timeLeft} ثانية
            </Text>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.qrActions}>
          <Text style={styles.qrHint}>
            📱 اطلب من الطلاب مسح الكود لتسجيل حضورهم
          </Text>
          <View style={styles.qrButtons}>
            <TouchableOpacity 
              style={styles.stopButton}
              onPress={handleStopQR}
            >
              <Ionicons name="stop-circle" size={22} color="#FFF" />
              <Text style={styles.stopButtonText}>إيقاف QR</Text>
            </TouchableOpacity>
            
            {activeLecture && (
              <TouchableOpacity 
                style={styles.endLectureButton}
                onPress={() => handleEndLecture(activeLecture)}
              >
                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                <Text style={styles.endLectureText}>إنهاء المحاضرة</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // شاشة تحميل
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>جاري تحميل المحاضرات...</Text>
      </View>
    );
  }

  // شاشة عرض المحاضرات
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
          <Text style={styles.headerBackText}>رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📋 محاضرات اليوم</Text>
        <Text style={styles.headerSubtitle}>
          {doctorData?.name || 'دكتور'} - {new Date().toLocaleDateString('ar-SA')}
        </Text>
      </Animated.View>

      {/* Current Time */}
      <View style={styles.currentTimeBar}>
        <MaterialCommunityIcons name="clock-digital" size={20} color="#1E40AF" />
        <Text style={styles.currentTimeText}>{getCurrentTimeString()}</Text>
      </View>

      {/* Lectures List */}
      <Animated.View style={[styles.lecturesContainer, { 
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }]}>
        {lectures.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>لا توجد محاضرات اليوم</Text>
            <Text style={styles.emptySubtitle}>
              استمتع بيومك! 🎉
            </Text>
          </View>
        ) : (
          lectures.map((lecture, index) => {
            const validation = validateQRGenerationTime(lecture);
            const isActive = lecture.lectureStatus === 'active';
            const isFinished = lecture.lectureStatus === 'finished';
            
            return (
              <Animated.View
                key={lecture.id || index}
                style={[
                  styles.lectureCard,
                  isActive && styles.lectureCardActive,
                  isFinished && styles.lectureCardFinished
                ]}
              >
                {/* Status Badge */}
                <View style={[
                  styles.statusBadge,
                  isActive && styles.statusBadgeActive,
                  isFinished && styles.statusBadgeFinished
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {isActive ? '🟢 جارية' : isFinished ? '⚫ منتهية' : '🔵 قادمة'}
                  </Text>
                </View>

                {/* Lecture Info */}
                <View style={styles.lectureInfo}>
                  <Text style={styles.lectureName}>
                    {lecture.courseName || lecture.subject}
                  </Text>
                  <View style={styles.lectureDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={16} color="#64748B" />
                      <Text style={styles.detailText}>
                        {lecture.startTime} - {lecture.endTime}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={16} color="#64748B" />
                      <Text style={styles.detailText}>
                        {lecture.room || 'غير محدد'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="people-outline" size={16} color="#64748B" />
                      <Text style={styles.detailText}>
                        دفعة {lecture.batch || 'الكل'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.lectureActions}>
                  {isActive && validation.canGenerate && (
                    <TouchableOpacity
                      style={styles.qrButton}
                      onPress={() => handleGenerateQR(lecture)}
                    >
                      <MaterialCommunityIcons name="qrcode-scan" size={22} color="#FFF" />
                      <Text style={styles.qrButtonText}>عرض QR</Text>
                    </TouchableOpacity>
                  )}
                  
                  {isActive && !validation.canGenerate && (
                    <View style={styles.timeWarning}>
                      <Ionicons name="warning-outline" size={18} color="#F59E0B" />
                      <Text style={styles.timeWarningText}>{validation.message}</Text>
                    </View>
                  )}
                  
                  {lecture.lectureStatus === 'upcoming' && (
                    <TouchableOpacity
                      style={styles.startButton}
                      onPress={() => handleStartLecture(lecture)}
                    >
                      <Ionicons name="play-circle" size={22} color="#FFF" />
                      <Text style={styles.startButtonText}>بدء المحاضرة</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            );
          })
        )}
      </Animated.View>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4FF'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B'
  },

  // Header
  header: {
    backgroundColor: '#1E40AF',
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12
  },
  headerBackText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right'
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'right',
    marginTop: 4
  },

  // Current Time
  currentTimeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: -14,
    padding: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4
  },
  currentTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    marginLeft: 8
  },

  // Lectures Container
  lecturesContainer: {
    padding: 16
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginTop: 20
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4
  },

  // Lecture Card
  lectureCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  lectureCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4'
  },
  lectureCardFinished: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    opacity: 0.8
  },

  // Status Badge
  statusBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    marginBottom: 10
  },
  statusBadgeActive: {
    backgroundColor: '#D1FAE5'
  },
  statusBadgeFinished: {
    backgroundColor: '#F1F5F9'
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF'
  },

  // Lecture Info
  lectureInfo: {
    marginBottom: 12
  },
  lectureName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'right',
    marginBottom: 8
  },
  lectureDetails: {
    gap: 6
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6
  },
  detailText: {
    fontSize: 13,
    color: '#64748B'
  },

  // Lecture Actions
  lectureActions: {
    marginTop: 8
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E40AF',
    padding: 14,
    borderRadius: 14,
    gap: 8
  },
  qrButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700'
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 14,
    gap: 8
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700'
  },
  timeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    gap: 6
  },
  timeWarningText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500'
  },

  // QR Screen
  qrContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 50
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 16
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 12,
    gap: 4
  },
  backText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600'
  },
  qrHeaderInfo: {
    flex: 1,
    alignItems: 'flex-end'
  },
  qrTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800'
  },
  qrSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4
  },
  batchBadge: {
    backgroundColor: 'rgba(252,211,77,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-end'
  },
  batchText: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '600'
  },

  // Status Bar
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statusText: {
    color: '#E2E8F0',
    fontSize: 13
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#64748B'
  },
  liveDotActive: {
    backgroundColor: '#10B981'
  },

  // QR Center
  qrCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  qrBox: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: 100
  },

  // Timer
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(252,211,77,0.1)',
    borderRadius: 14,
    gap: 8
  },
  timerWarning: {
    backgroundColor: 'rgba(239,68,68,0.1)'
  },
  timerText: {
    color: '#FCD34D',
    fontSize: 16,
    fontWeight: '700'
  },

  // QR Actions
  qrActions: {
    padding: 20,
    paddingBottom: 40
  },
  qrHint: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16
  },
  qrButtons: {
    flexDirection: 'row',
    gap: 12
  },
  stopButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 14,
    gap: 8
  },
  stopButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700'
  },
  endLectureButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 14,
    gap: 8
  },
  endLectureText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700'
  }
});