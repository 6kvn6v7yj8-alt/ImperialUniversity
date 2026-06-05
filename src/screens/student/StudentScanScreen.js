import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Animated, Easing, ActivityIndicator, Vibration, Dimensions
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { markStudentAttendance } from '../../services/attendanceService';
import { validateStudentAttendance } from '../../utils/timeValidator';
import { getBatchTodayLectures } from '../../services/lectureService';

const { width, height } = Dimensions.get('window');

export default function StudentScanScreen({ navigation }) {
  // Permission & Camera
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Student Data
  const [studentData, setStudentData] = useState(null);
  const [todayLectures, setTodayLectures] = useState([]);

  // UI State
  const [scanResult, setScanResult] = useState(null); // null | 'success' | 'error' | 'already' | 'timeout'
  const [resultMessage, setResultMessage] = useState('');
  const [resultDetails, setResultDetails] = useState('');

  // Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scanFrameAnim = useRef(new Animated.Value(0)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;
  const lineAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const resultSlideAnim = useRef(new Animated.Value(100)).current;

  // Load data
  useEffect(() => {
    loadStudentData();
    startScanningAnimations();
    
    return () => {
      // Cleanup animations
    };
  }, []);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.spring(scanFrameAnim, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true
      })
    ]).start();
  }, [permission]);

  useEffect(() => {
    if (scanResult) {
      showResultAnimation();
    }
  }, [scanResult]);

  const startScanningAnimations = () => {
    // Moving line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(lineAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(lineAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ])
    ).start();

    // Shimmer effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const showResultAnimation = () => {
    Animated.parallel([
      Animated.spring(successScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true
      }),
      Animated.timing(resultSlideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true
      })
    ]).start();

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      handleReset();
    }, 3000);
  };

  const loadStudentData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setStudentData(data);

        // جلب محاضرات اليوم للدفعة
        if (data.batch) {
          const result = await getBatchTodayLectures(data.batch);
          if (result.success) {
            setTodayLectures(result.lectures);
          }
        }
      }
    } catch (error) {
      console.error('Error loading student data:', error);
    }
  };

  const handleBarCodeScanned = useCallback(async ({ data }) => {
    if (scanned || processing) return;
    
    setScanned(true);
    setProcessing(true);
    Vibration.vibrate(200);

    try {
      // Parse QR Data
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (parseError) {
        showError('❌ QR Code غير صالح', 'الرجاء التأكد من الكود والمحاولة مرة أخرى');
        return;
      }

      // التحقق من صلاحية وقت QR Code (45 ثانية)
      const now = Date.now();
      const qrAge = (now - qrData.timestamp) / 1000;
      
      if (qrAge > 45) {
        showError(
          '⏰ انتهت صلاحية QR Code',
          'انتهت صلاحية الكود (45 ثانية). اطلب من الدكتور تحديث الكود.'
        );
        return;
      }

      // التحقق من المستخدم
      const user = auth.currentUser;
      if (!user) {
        showError('🔐 خطأ', 'الرجاء تسجيل الدخول أولاً');
        return;
      }

      // التحقق من عدم تكرار التسجيل
      const today = new Date().toISOString().split('T')[0];
      const existingQuery = query(
        collection(db, 'attendance'),
        where('studentId', '==', user.uid),
        where('courseId', '==', qrData.courseId || qrData.courseCode),
        where('date', '==', today)
      );
      
      const existingSnap = await getDocs(existingQuery);
      if (!existingSnap.empty) {
        showAlreadyMarked(qrData.courseName || qrData.courseCode);
        return;
      }

      // التحقق من وقت المحاضرة
      const currentLecture = todayLectures.find(
        l => l.subject === qrData.courseName || l.subject === qrData.courseCode
      );

      if (currentLecture) {
        const timeValidation = validateStudentAttendance(currentLecture);
        
        if (!timeValidation.valid) {
          showError('⏰ ' + timeValidation.message, 'لا يمكن تسجيل الحضور في هذا الوقت');
          return;
        }
      }

      // تسجيل الحضور
      const result = await markStudentAttendance(qrData, user.uid);

      if (result.success) {
        showSuccess(result);
      } else if (result.alreadyMarked) {
        showAlreadyMarked(qrData.courseName || qrData.courseCode);
      } else {
        showError('❌ فشل التسجيل', result.message);
      }

    } catch (error) {
      console.error('Scan error:', error);
      showError('❌ حدث خطأ', 'الرجاء المحاولة مرة أخرى');
    }
  }, [scanned, processing, studentData, todayLectures]);

  const showSuccess = (result) => {
    setScanResult('success');
    setResultMessage('✅ تم تسجيل الحضور بنجاح');
    setResultDetails(
      `المادة: ${result.courseName || ''}\n` +
      `الحالة: ${result.statusText || 'حاضر'}\n` +
      `الوقت: ${new Date().toLocaleTimeString('ar-SA')}`
    );
    Vibration.vibrate([0, 100, 100, 200]);
  };

  const showError = (title, message) => {
    setScanResult('error');
    setResultMessage(title);
    setResultDetails(message);
    Vibration.vibrate([0, 300, 100, 300]);
    setProcessing(false);
  };

  const showAlreadyMarked = (courseName) => {
    setScanResult('already');
    setResultMessage('⚠️ تم التسجيل مسبقاً');
    setResultDetails(`لقد قمت بتسجيل حضورك في ${courseName || 'هذه المحاضرة'} اليوم`);
    Vibration.vibrate([0, 200, 100, 200]);
    setProcessing(false);
  };

  const handleReset = () => {
    setScanned(false);
    setProcessing(false);
    setScanResult(null);
    setResultMessage('');
    setResultDetails('');
    
    Animated.parallel([
      Animated.timing(successScaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(resultSlideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
  };

  // Moving line position
  const lineTranslateY = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 120]
  });

  // Shimmer opacity
  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.8, 0.3]
  });

  // Permission Screen
  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Animated.View style={[styles.permissionContent, { opacity: fadeAnim }]}>
          <FontAwesome5 name="camera" size={64} color="#1E40AF" />
          <Text style={styles.permissionTitle}>صلاحية الكاميرا</Text>
          <Text style={styles.permissionText}>
            نحتاج صلاحية الكاميرا لمسح QR Code وتسجيل حضورك
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Ionicons name="camera" size={22} color="#FFF" />
            <Text style={styles.permissionButtonText}>منح الصلاحية</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backToHomeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backToHomeText}>← العودة للرئيسية</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr']
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          {/* Overlay */}
          <View style={styles.overlay}>
            {/* Top Section */}
            <View style={styles.overlayTop}>
              <View style={styles.headerBar}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="close" size={22} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>مسح QR Code</Text>
                <View style={styles.headerSpacer} />
              </View>
            </View>

            {/* Middle Section - Scan Frame */}
            <View style={styles.overlayMiddle}>
              <View style={styles.scanArea}>
                {/* Scan Frame */}
                <Animated.View
                  style={[
                    styles.scanFrame,
                    {
                      transform: [{ scale: scanFrameAnim }],
                      opacity: shimmerOpacity
                    }
                  ]}
                >
                  {/* Corners */}
                  <View style={[styles.corner, styles.topLeft]}>
                    <View style={styles.cornerLine} />
                    <View style={styles.cornerLineVertical} />
                  </View>
                  <View style={[styles.corner, styles.topRight]}>
                    <View style={styles.cornerLine} />
                    <View style={styles.cornerLineVerticalRight} />
                  </View>
                  <View style={[styles.corner, styles.bottomLeft]}>
                    <View style={styles.cornerLineBottom} />
                    <View style={styles.cornerLineVertical} />
                  </View>
                  <View style={[styles.corner, styles.bottomRight]}>
                    <View style={styles.cornerLineBottom} />
                    <View style={styles.cornerLineVerticalRight} />
                  </View>

                  {/* Moving Line */}
                  <Animated.View
                    style={[
                      styles.scanLine,
                      { transform: [{ translateY: lineTranslateY }] }
                    ]}
                  />
                </Animated.View>

                {/* Scan Text */}
                <Animated.Text style={[styles.scanText, { opacity: shimmerOpacity }]}>
                  وجه الكاميرا نحو QR Code
                </Animated.Text>
              </View>
            </View>

            {/* Bottom Section */}
            <View style={styles.overlayBottom}>
              {todayLectures.length > 0 && (
                <View style={styles.lecturesInfo}>
                  <MaterialCommunityIcons name="book-open-variant" size={18} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.lecturesInfoText}>
                    {todayLectures.length} محاضرات اليوم
                  </Text>
                </View>
              )}
            </View>
          </View>
        </CameraView>
      </View>

      {/* Result Overlay */}
      {scanResult && (
        <Animated.View
          style={[
            styles.resultOverlay,
            {
              transform: [{ translateY: resultSlideAnim }]
            }
          ]}
        >
          <Animated.View
            style={[
              styles.resultCard,
              scanResult === 'success' && styles.resultCardSuccess,
              scanResult === 'error' && styles.resultCardError,
              scanResult === 'already' && styles.resultCardWarning,
              { transform: [{ scale: successScaleAnim }] }
            ]}
          >
            {/* Icon */}
            <View style={[
              styles.resultIconContainer,
              scanResult === 'success' && { backgroundColor: 'rgba(16,185,129,0.1)' },
              scanResult === 'error' && { backgroundColor: 'rgba(239,68,68,0.1)' },
              scanResult === 'already' && { backgroundColor: 'rgba(245,158,11,0.1)' }
            ]}>
              {scanResult === 'success' && (
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              )}
              {scanResult === 'error' && (
                <Ionicons name="close-circle" size={48} color="#EF4444" />
              )}
              {scanResult === 'already' && (
                <Ionicons name="alert-circle" size={48} color="#F59E0B" />
              )}
            </View>

            {/* Message */}
            <Text style={[
              styles.resultMessage,
              scanResult === 'success' && { color: '#10B981' },
              scanResult === 'error' && { color: '#EF4444' },
              scanResult === 'already' && { color: '#F59E0B' }
            ]}>
              {resultMessage}
            </Text>
            
            {resultDetails && (
              <Text style={styles.resultDetails}>{resultDetails}</Text>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.resultButton,
                scanResult === 'success' && styles.resultButtonSuccess,
                scanResult === 'error' && styles.resultButtonError,
                scanResult === 'already' && styles.resultButtonWarning
              ]}
              onPress={handleReset}
            >
              <Text style={styles.resultButtonText}>
                {scanResult === 'success' ? 'مسح آخر' : 'حاول مرة أخرى'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}

      {/* Processing Indicator */}
      {processing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color="#1E40AF" />
            <Text style={styles.processingText}>جاري تسجيل الحضور...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden'
  },
  camera: {
    flex: 1
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between'
  },

  // Header
  overlayTop: {
    paddingTop: 50,
    paddingHorizontal: 20
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700'
  },
  headerSpacer: {
    width: 40
  },

  // Middle - Scan Area
  overlayMiddle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scanArea: {
    alignItems: 'center'
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative'
  },

  // Corners
  corner: {
    position: 'absolute',
    width: 30,
    height: 30
  },
  topLeft: {
    top: 0,
    left: 0
  },
  topRight: {
    top: 0,
    right: 0
  },
  bottomLeft: {
    bottom: 0,
    left: 0
  },
  bottomRight: {
    bottom: 0,
    right: 0
  },
  cornerLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 3,
    backgroundColor: '#1E40AF',
    borderRadius: 2
  },
  cornerLineBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 3,
    backgroundColor: '#1E40AF',
    borderRadius: 2
  },
  cornerLineVertical: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 3,
    height: 30,
    backgroundColor: '#1E40AF',
    borderRadius: 2
  },
  cornerLineVerticalRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 3,
    height: 30,
    backgroundColor: '#1E40AF',
    borderRadius: 2
  },

  // Moving Line
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
    top: '50%'
  },

  // Scan Text
  scanText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 30,
    textAlign: 'center'
  },

  // Bottom
  overlayBottom: {
    paddingBottom: 40,
    alignItems: 'center'
  },
  lecturesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20
  },
  lecturesInfoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12
  },

  // Result Overlay
  resultOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center'
  },
  resultCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12
  },
  resultCardSuccess: {
    borderWidth: 2,
    borderColor: '#10B981'
  },
  resultCardError: {
    borderWidth: 2,
    borderColor: '#EF4444'
  },
  resultCardWarning: {
    borderWidth: 2,
    borderColor: '#F59E0B'
  },
  resultIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  resultMessage: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8
  },
  resultDetails: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16
  },
  resultButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14
  },
  resultButtonSuccess: {
    backgroundColor: '#10B981'
  },
  resultButtonError: {
    backgroundColor: '#EF4444'
  },
  resultButtonWarning: {
    backgroundColor: '#F59E0B'
  },
  resultButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700'
  },

  // Processing
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  processingCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12
  },
  processingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600'
  },

  // Permission Screen
  permissionContainer: {
    flex: 1,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  permissionContent: {
    alignItems: 'center'
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 12
  },
  permissionText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E40AF',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    gap: 8
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700'
  },
  backToHomeButton: {
    marginTop: 20,
    paddingVertical: 8
  },
  backToHomeText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600'
  }
});