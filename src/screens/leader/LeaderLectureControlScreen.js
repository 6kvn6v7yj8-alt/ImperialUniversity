import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Easing, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { getBatchTodayLectures } from '../../services/lectureService';
import {
  validateQRGenerationTime,
  getRemainingTime,
  formatRemainingTime,
  getCurrentTimeString,
  getCurrentDayArabic
} from '../../utils/timeValidator';

const { width } = Dimensions.get('window');

export default function LeaderLectureControlScreen({ navigation }) {
  // State
  const [loading, setLoading] = useState(true);
  const [leaderData, setLeaderData] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorLectures, setDoctorLectures] = useState([]);
  const [step, setStep] = useState(1); // 1: اختيار الدكتور, 2: اختيار المحاضرة
  const [showQR, setShowQR] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [activeLecture, setActiveLecture] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [qrRefreshing, setQrRefreshing] = useState(false);

  // Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const doctorCardAnims = useRef({}).current;
  const timerRef = useRef(null);

  useEffect(() => {
    loadInitialData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

  useEffect(() => {
    if (showQR) {
      startAnimations();
    }
  }, [showQR]);

  const startAnimations = () => {
    // Pulse animation
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

    // Shimmer animation
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

  const loadInitialData = async () => {
    try {
      // جلب بيانات الليدر
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setLeaderData(userDoc.data());
        }
      }

      // جلب جميع الدكاترة
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const doctorsList = allUsers.filter(u => u.role === 'doctor');
      
      // إضافة أنيميشن لكل دكتور
      doctorsList.forEach(doctor => {
        if (!doctorCardAnims[doctor.id]) {
          doctorCardAnims[doctor.id] = new Animated.Value(0);
        }
      });
      
      setDoctors(doctorsList);

      // تحريك كروت الدكاترة
      const animations = doctorsList.map((doctor, index) =>
        Animated.timing(doctorCardAnims[doctor.id], {
          toValue: 1,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true
        })
      );
      Animated.stagger(100, animations).start();

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDoctor = async (doctor) => {
    // Animate selection
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();

    setSelectedDoctor(doctor);
    setStep(2);

    // جلب محاضرات الدكتور لليوم
    const todayLectures = await getBatchTodayLectures(doctor.batch || 'all');
    
    // تصفية محاضرات الدكتور
    const doctorSubjects = doctor.subjects || 
      (doctor.subject ? [{ name: doctor.subject, batch: doctor.batch || 'all' }] : []);
    
    const doctorLecturesFiltered = todayLectures.lectures.filter(lecture =>
      doctorSubjects.some(subj => 
        subj.name === lecture.subject || 
        subj.name === lecture.courseName
      )
    );

    setDoctorLectures(doctorLecturesFiltered);
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
    if (!lecture || !selectedDoctor) return;

    const code = generateRandomCode();
    const qrData = JSON.stringify({
      courseId: lecture.subject || lecture.courseId,
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

  const handleBackToDoctors = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
    
    setStep(1);
    setSelectedDoctor(null);
    setDoctorLectures([]);
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
          <TouchableOpacity style={styles.backButton} onPress={handleStopQR}>
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

        {/* QR Code */}
        <View style={styles.qrCenter}>
          <Animated.View style={[
            styles.qrBox,
            { transform: [{ scale: Animated.multiply(pulseAnim, scaleAnim) }] }
          ]}>
            <Animated.View style={[
              styles.shimmer,
              { transform: [{ translateX: shimmerTranslate }] }
            ]} />
            
            {qrValue ? (
              <QRCode
                value={qrValue}
                size={200}
                backgroundColor="#FFFFFF"
                color="#8B5CF6"
                logo={require('../../../assets/icon.png')}
                logoSize={40}
                logoBackgroundColor="#FFFFFF"
              />
            ) : (
              <ActivityIndicator size="large" color="#8B5CF6" />
            )}
          </Animated.View>

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
            📱 اطلب من زملائك مسح الكود لتسجيل حضورهم
          </Text>
          <TouchableOpacity style={styles.stopButton} onPress={handleStopQR}>
            <Ionicons name="stop-circle" size={22} color="#FFF" />
            <Text style={styles.stopButtonText}>إيقاف QR</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // شاشة تحميل
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => {
            if (step === 2) {
              handleBackToDoctors();
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
          <Text style={styles.headerBackText}>
            {step === 2 ? 'تغيير الدكتور' : 'رجوع'}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <FontAwesome5 name="crown" size={22} color="#FCD34D" />
          <Text style={styles.headerTitle}>لوحة قائد الدفعة</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {leaderData?.name || 'قائد الدفعة'} - {getCurrentDayArabic()}
        </Text>
      </Animated.View>

      {/* Current Time */}
      <View style={styles.currentTimeBar}>
        <MaterialCommunityIcons name="clock-digital" size={20} color="#8B5CF6" />
        <Text style={styles.currentTimeText}>{getCurrentTimeString()}</Text>
      </View>

      {/* Step 1: اختيار الدكتور */}
      {step === 1 && (
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="chalkboard-teacher" size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>اختر الدكتور</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            يمكنك توليد QR Code نيابة عن الدكتور في وقت المحاضرة فقط
          </Text>

          {doctors.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome5 name="user-slash" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>لا يوجد دكاترة</Text>
            </View>
          ) : (
            doctors.map((doctor, index) => {
              const anim = doctorCardAnims[doctor.id] || new Animated.Value(1);
              
              return (
                <Animated.View
                  key={doctor.id}
                  style={{
                    opacity: anim,
                    transform: [{
                      translateX: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0]
                      })
                    }]
                  }}
                >
                  <TouchableOpacity
                    style={styles.doctorCard}
                    onPress={() => handleSelectDoctor(doctor)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.doctorAvatar}>
                      <Text style={styles.doctorAvatarText}>
                        {doctor.name?.charAt(0) || 'د'}
                      </Text>
                    </View>
                    <View style={styles.doctorInfo}>
                      <Text style={styles.doctorName}>{doctor.name || 'دكتور'}</Text>
                      <Text style={styles.doctorSubjects}>
                        📚 {doctor.subjects?.length || (doctor.subject ? 1 : 0)} مواد
                      </Text>
                      {doctor.batch && (
                        <Text style={styles.doctorBatch}>🏷️ دفعة {doctor.batch}</Text>
                      )}
                    </View>
                    <View style={styles.selectArrow}>
                      <Ionicons name="chevron-forward" size={22} color="#8B5CF6" />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </Animated.View>
      )}

      {/* Step 2: محاضرات الدكتور */}
      {step === 2 && selectedDoctor && (
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          {/* Doctor Info Card */}
          <View style={styles.selectedDoctorCard}>
            <View style={styles.doctorAvatar}>
              <Text style={styles.doctorAvatarText}>
                {selectedDoctor.name?.charAt(0) || 'د'}
              </Text>
            </View>
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{selectedDoctor.name}</Text>
              <Text style={styles.doctorEmail}>{selectedDoctor.email}</Text>
            </View>
            <FontAwesome5 name="check-circle" size={22} color="#10B981" />
          </View>

          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="book-open-page-variant" size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>محاضرات اليوم</Text>
          </View>

          {doctorLectures.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-blank" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>لا توجد محاضرات اليوم لهذا الدكتور</Text>
            </View>
          ) : (
            doctorLectures.map((lecture, index) => {
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
                  {/* Status */}
                  <View style={[
                    styles.lectureStatus,
                    isActive && styles.lectureStatusActive,
                    isFinished && styles.lectureStatusFinished
                  ]}>
                    <Text style={styles.lectureStatusText}>
                      {isActive ? '🟢 جارية' : isFinished ? '⚫ منتهية' : '🔵 قادمة'}
                    </Text>
                  </View>

                  {/* Info */}
                  <Text style={styles.lectureName}>
                    {lecture.courseName || lecture.subject}
                  </Text>
                  <View style={styles.lectureDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={15} color="#64748B" />
                      <Text style={styles.detailText}>
                        {lecture.startTime} - {lecture.endTime}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="location-outline" size={15} color="#64748B" />
                      <Text style={styles.detailText}>
                        {lecture.room || 'غير محدد'}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="people-outline" size={15} color="#64748B" />
                      <Text style={styles.detailText}>
                        دفعة {lecture.batch || 'الكل'}
                      </Text>
                    </View>
                  </View>

                  {/* Action */}
                  {isActive && validation.canGenerate && (
                    <TouchableOpacity
                      style={styles.generateQRButton}
                      onPress={() => handleGenerateQR(lecture)}
                    >
                      <MaterialCommunityIcons name="qrcode-scan" size={22} color="#FFF" />
                      <Text style={styles.generateQRText}>توليد QR Code</Text>
                    </TouchableOpacity>
                  )}

                  {isActive && !validation.canGenerate && (
                    <View style={styles.warningBox}>
                      <Ionicons name="warning-outline" size={16} color="#F59E0B" />
                      <Text style={styles.warningText}>{validation.message}</Text>
                    </View>
                  )}
                </Animated.View>
              );
            })
          )}
        </Animated.View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F3FF'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B'
  },

  // Header
  header: {
    backgroundColor: '#7C3AED',
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800'
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
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    gap: 8
  },
  currentTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED'
  },

  // Section
  section: {
    padding: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 8,
    marginTop: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right'
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    marginBottom: 12
  },

  // Doctor Card
  doctorCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E9D5FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  },
  doctorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(124,58,237,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  doctorAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7C3AED'
  },
  doctorInfo: {
    flex: 1
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right'
  },
  doctorSubjects: {
    fontSize: 12,
    color: '#7C3AED',
    textAlign: 'right',
    marginTop: 3
  },
  doctorBatch: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 2
  },
  selectArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(124,58,237,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4
  },

  // Selected Doctor
  selectedDoctorCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  doctorEmail: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'right'
  },

  // Lecture Card
  lectureCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0'
  },
  lectureCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4'
  },
  lectureCardFinished: {
    borderColor: '#CBD5E1',
    opacity: 0.7
  },
  lectureStatus: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    marginBottom: 8
  },
  lectureStatusActive: {
    backgroundColor: '#D1FAE5'
  },
  lectureStatusFinished: {
    backgroundColor: '#F1F5F9'
  },
  lectureStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF'
  },
  lectureName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'right',
    marginBottom: 10
  },
  lectureDetails: {
    gap: 6,
    marginBottom: 12
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6
  },
  detailText: {
    fontSize: 13,
    color: '#64748B'
  },

  // Generate QR Button
  generateQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    padding: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 8
  },
  generateQRText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700'
  },

  // Warning
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    gap: 6,
    marginTop: 8
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500'
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFF',
    borderRadius: 16
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12
  },

  // QR Screen Styles
  qrContainer: {
    flex: 1,
    backgroundColor: '#0F0722',
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
  leaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(252,211,77,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginBottom: 8
  },
  leaderBadgeText: {
    color: '#FCD34D',
    fontSize: 11,
    fontWeight: '600'
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
  qrDoctor: {
    color: '#A78BFA',
    fontSize: 13,
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
    borderWidth: 3,
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
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
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.3)'
  },
  timerWarning: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.3)'
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
  stopButton: {
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
  }
});