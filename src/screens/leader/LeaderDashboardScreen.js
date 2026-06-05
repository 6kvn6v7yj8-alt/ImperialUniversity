import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, Modal, Pressable, Image, StatusBar, ScrollView, Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import QRCode from 'react-native-qrcode-svg';
import { collection, getDocs } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function LeaderDashboardScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(350)).current;
  const [userData, setUserData] = useState(null);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courses, setCourses] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();
    fetchUserData();
    fetchCourses();
    fetchPendingCount();
    updateTime();
    const timeInterval = setInterval(updateTime, 60000);
    return () => { clearInterval(timeInterval); clearInterval(timerRef.current); };
  }, []);

  const updateTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'مساءً' : 'صباحاً';
    const displayHours = hours % 12 || 12;
    setCurrentTime(`${displayHours}:${minutes} ${period}`);
  };

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) setUserData(docSnap.data());
      }
    } catch (error) { console.log('Error:', error); }
  };

  const fetchPendingCount = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const leaderBatch = userDoc.exists() ? userDoc.data().batch : null;
      if (!leaderBatch) return;
      const snap = await getDocs(collection(db, 'users'));
      const pending = snap.docs.filter(d => {
        const data = d.data();
        return data.role === 'student' && data.status === 'pending' && data.batch === leaderBatch;
      }).length;
      setPendingCount(pending);
    } catch (error) { console.log('Error:', error); }
  };

  const fetchCourses = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userBatch = userDoc.exists() ? userDoc.data().batch : null;
      const snapshot = await getDocs(collection(db, 'courses'));
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (userBatch) {
        data = data.filter(c => c.batch === userBatch || c.batch === 'all' || !c.batch);
      }
      setCourses(data);
    } catch (error) { console.log('Error:', error); }
  };

  const getUserImage = () => {
    if (!userData) return null;
    const img = userData.profileImage || userData.photo || userData.image;
    if (!img || img.length < 50) return null;
    if (img.startsWith('data:image')) return { uri: img };
    if (img.startsWith('http')) return { uri: img };
    return { uri: `data:image/jpeg;base64,${img}` };
  };

  const userImage = getUserImage();

  const flipCard = () => {
    Animated.spring(flipAnim, { toValue: cardFlipped ? 0 : 1, friction: 6, tension: 8, useNativeDriver: true }).start();
    setCardFlipped(!cardFlipped);
  };

  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const generateQR = (course) => {
    if (!course) return;
    
    // ✅ التحقق من وقت المحاضرة
    const now = new Date();
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const currentDay = days[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    if (course.day && course.startTime && course.endTime) {
      if (course.day !== currentDay) {
        Alert.alert('⏰ غير مسموح', `هذه المادة يوم ${course.day} وليس اليوم`);
        return;
      }
      
      const [startH, startM] = (course.startTime || '09:00').split(':').map(Number);
      const [endH, endM] = (course.endTime || '10:30').split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      if (currentMinutes < startMinutes) {
        const remaining = startMinutes - currentMinutes;
        const remainH = Math.floor(remaining / 60);
        const remainM = remaining % 60;
        Alert.alert('⏰ لم تبدأ بعد', `المحاضرة تبدأ الساعة ${course.startTime}\nمتبقي ${remainH}:${remainM.toString().padStart(2, '0')}`);
        return;
      }
      
      if (currentMinutes > endMinutes) {
        Alert.alert('⏰ انتهت', `انتهت المحاضرة الساعة ${course.endTime}`);
        return;
      }
    }
    
    setSelectedCourse(course);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setQrValue(JSON.stringify({
      courseId: course.id, courseName: course.name, courseCode: course.code,
      timestamp: Date.now(), code, generatedBy: 'leader', batch: userData?.batch || '',
      startTime: course.startTime, endTime: course.endTime
    }));
    setShowQR(true);
    setTimeLeft(5);

    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { generateNewQR(course); return 5; }
        return prev - 1;
      });
    }, 1000);
  };

  const generateNewQR = (course) => {
    if (!course) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setQrValue(JSON.stringify({
      courseId: course.id, courseName: course.name, courseCode: course.code,
      timestamp: Date.now(), code, generatedBy: 'leader', batch: userData?.batch || '',
      startTime: course.startTime, endTime: course.endTime
    }));
  };

  const stopQR = () => { setShowQR(false); setQrValue(''); setSelectedCourse(null); clearInterval(timerRef.current); pulseAnim.setValue(1); };

  const openMenu = () => { setMenuVisible(true); Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }).start(); };
  const closeMenu = () => { Animated.spring(slideAnim, { toValue: 350, friction: 6, tension: 40, useNativeDriver: true }).start(() => setMenuVisible(false)); };

  if (showQR) {
    return (
      <View style={styles.qrFullScreen}>
        <View style={styles.qrHeader}>
          <TouchableOpacity style={styles.qrBackBtn} onPress={stopQR}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
            <Text style={styles.qrBackText}>رجوع</Text>
          </TouchableOpacity>
          <View style={styles.qrHeaderInfo}>
            <View style={styles.leaderBadgeQR}>
              <FontAwesome5 name="crown" size={12} color="#FCD34D" />
              <Text style={styles.leaderBadgeQRText}>قائد الدفعة</Text>
            </View>
            <Text style={styles.qrTitle}>📱 QR Code الحضور</Text>
            <Text style={styles.qrSubtitle}>{selectedCourse?.name}</Text>
          </View>
        </View>
        <View style={styles.qrCenter}>
          <Animated.View style={[styles.qrBox, { transform: [{ scale: pulseAnim }] }]}>
            {qrValue ? <QRCode value={qrValue} size={200} backgroundColor="#FFF" color="#7C3AED" /> : null}
          </Animated.View>
          <View style={[styles.qrTimer, timeLeft <= 2 && styles.qrTimerWarn]}>
            <MaterialCommunityIcons name="timer-sand" size={18} color={timeLeft <= 2 ? '#EF4444' : '#FCD34D'} />
            <Text style={[styles.qrTimerText, timeLeft <= 2 && { color: '#EF4444' }]}>يتجدد خلال {timeLeft} ثانية</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.qrStopBtn} onPress={stopQR}>
          <Ionicons name="stop-circle" size={20} color="#FFF" />
          <Text style={styles.qrStopText}>إيقاف QR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
      <LinearGradient colors={['#7C3AED', '#A78BFA']} style={styles.bg}>
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
      </LinearGradient>

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideUp }] }]}>
        <TouchableOpacity style={styles.menuBtn} onPress={openMenu}>
          <Ionicons name="menu" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.leaderBadge}>
            <FontAwesome5 name="crown" size={14} color="#FCD34D" />
            <Text style={styles.leaderBadgeText}>قائد دفعة {userData?.batch || ''}</Text>
          </View>
          <Text style={styles.greetingName}>{userData?.name || 'قائد الدفعة'} 👋</Text>
          <Text style={styles.timeText}>{currentTime}</Text>
        </View>
        <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('EditProfile')}>
          {userImage ? <Image source={userImage} style={styles.avatar} /> : <View style={styles.avatarPlaceholder}><Text style={styles.avatarPlaceholderText}>{(userData?.name||'ق').charAt(0)}</Text></View>}
        </TouchableOpacity>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Quick Info */}
        <Animated.View style={[styles.quickInfo, { opacity: fadeAnim }]}>
          <View style={styles.quickCard}>
            <MaterialCommunityIcons name="account-group" size={20} color="#7C3AED" />
            <Text style={styles.quickLabel}>الدفعة</Text>
            <Text style={styles.quickValue}>{userData?.batch || '-'}</Text>
          </View>
          <View style={styles.quickCard}>
            <MaterialCommunityIcons name="book-open-variant" size={20} color="#10B981" />
            <Text style={styles.quickLabel}>المواد</Text>
            <Text style={styles.quickValue}>{courses.length}</Text>
          </View>
          <View style={styles.quickCard}>
            <MaterialCommunityIcons name="account-clock" size={20} color="#F59E0B" />
            <Text style={styles.quickLabel}>معلق</Text>
            <Text style={styles.quickValue}>{pendingCount}</Text>
          </View>
        </Animated.View>

        {/* Digital ID Card */}
        <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity activeOpacity={0.95} onPress={flipCard}>
            <Animated.View style={[styles.card, styles.cardFront, { transform: [{ rotateY: frontInterpolate }, { perspective: 1000 }] }]}>
              <View style={styles.cardHeader}>
                <Image source={require('../../../assets/logo.png')} style={styles.cardLogo} resizeMode="contain" />
                <View><Text style={styles.cardUni}>IMPERIAL</Text><Text style={styles.cardUniSub}>UNIVERSITY</Text></View>
                <View style={styles.cardLeaderBadge}><FontAwesome5 name="crown" size={12} color="#FCD34D" /><Text style={styles.cardLeaderText}>قائد</Text></View>
              </View>
              <View style={styles.cardPhotoRing}>
                {userImage ? <Image source={userImage} style={styles.cardPhoto} /> : <FontAwesome5 name="user-graduate" size={36} color="#7C3AED" />}
              </View>
              <Text style={styles.cardName}>{userData?.name || 'الاسم'}</Text>
              <View style={styles.cardChips}>
                <View style={[styles.cardChip, { backgroundColor: '#EDE9FE' }]}><Text style={[styles.cardChipText, { color: '#7C3AED' }]}>دفعة {userData?.batch || '-'}</Text></View>
              </View>
              <Text style={styles.tapHint}>👆 اضغط لرؤية الخلف</Text>
            </Animated.View>
            <Animated.View style={[styles.card, styles.cardBack, { transform: [{ rotateY: backInterpolate }, { perspective: 1000 }], position: 'absolute', top: 0 }]}>
              <View style={styles.magStripe} />
              <View style={styles.barcodeSection}>{[...Array(40)].map((_, i) => (<View key={i} style={[styles.barLine, { height: 15 + Math.random() * 30 }]} />))}</View>
              <Text style={styles.backId}>SN: {userData?.serialNumber || userData?.nationalId || '-'}</Text>
              <Text style={styles.tapHint}>👆 اضغط للرجوع</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View style={[styles.quickActions, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('LeaderLectureControl')}>
            <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.actionGradient}>
              <MaterialCommunityIcons name="qrcode-scan" size={22} color="#FFF" />
              <Text style={styles.actionText}>توليد QR</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ActivateLeaderAccounts')}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.actionGradient}>
              <MaterialCommunityIcons name="account-check" size={22} color="#FFF" />
              <Text style={styles.actionText}>تفعيل حسابات {pendingCount > 0 ? `(${pendingCount})` : ''}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Schedule')}>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.actionGradient}>
              <Ionicons name="calendar" size={22} color="#FFF" />
              <Text style={styles.actionText}>الجدول</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* القائمة الجانبية */}
      <Modal visible={menuVisible} transparent animationType="none">
        <Pressable style={styles.overlay} onPress={closeMenu}><View /></Pressable>
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <LinearGradient colors={['#7C3AED', '#A78BFA']} style={styles.drawerHeader}>
            <Image source={require('../../../assets/logo.png')} style={styles.drawerLogo} resizeMode="contain" />
            <View><Text style={styles.drawerTitle}>القائمة</Text><Text style={styles.drawerSub}>{userData?.name}</Text></View>
            <TouchableOpacity onPress={closeMenu} style={styles.drawerClose}><Ionicons name="close" size={20} color="#FFF" /></TouchableOpacity>
          </LinearGradient>
          <ScrollView style={styles.drawerContent}>
            {[
              { icon: 'calendar-outline', label: 'الجدول الدراسي', screen: 'Schedule' },
              { icon: 'book-outline', label: 'المواد الدراسية', screen: 'Courses' },
              { icon: 'stats-chart-outline', label: 'النتائج', screen: 'Grades' },
              { icon: 'library-outline', label: 'المكتبة', screen: 'Library' },
              { icon: 'notifications-outline', label: 'الإشعارات', screen: 'Notifications' },
              { icon: 'chatbubbles-outline', label: 'الدعم الفني', screen: 'Chat' },
              { icon: 'person-outline', label: 'الملف الشخصي', screen: 'EditProfile' },
              { icon: 'hourglass-outline', label: `تفعيل حسابات الطلاب${pendingCount > 0 ? ` (${pendingCount})` : ''}`, screen: 'ActivateLeaderAccounts', color: '#F59E0B' },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate(item.screen); }}>
                <Ionicons name={item.icon} size={20} color={item.color || '#7C3AED'} />
                <Text style={[styles.drawerItemText, item.color && { color: item.color }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.drawerLogout} onPress={() => { closeMenu(); navigation.navigate('Login'); }}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.drawerLogoutText}>تسجيل الخروج</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  bg: { position: 'absolute', top: 0, left: 0, right: 0, height: 280, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  bgCircle1: { position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)' },
  bgCircle2: { position: 'absolute', bottom: 20, left: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.04)' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 55, paddingBottom: 15 },
  menuBtn: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center', flex: 1 },
  leaderBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(252,211,77,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4, marginBottom: 6 },
  leaderBadgeText: { color: '#FCD34D', fontSize: 11, fontWeight: '700' },
  greetingName: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 2 },
  timeText: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  avatarBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholderText: { fontSize: 18, fontWeight: '700', color: '#7C3AED' },

  quickInfo: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: -10, marginBottom: 16 },
  quickCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 14, alignItems: 'center' },
  quickLabel: { fontSize: 10, color: '#94A3B8', marginTop: 6 },
  quickValue: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginTop: 2 },

  cardContainer: { paddingHorizontal: 22, marginBottom: 16 },
  card: { width: '100%', borderRadius: 24, padding: 24, backfaceVisibility: 'hidden', alignItems: 'center' },
  cardFront: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E9D5FF' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, width: '100%', justifyContent: 'space-between' },
  cardLogo: { width: 32, height: 32, borderRadius: 8 },
  cardUni: { fontSize: 13, fontWeight: '800', color: '#7C3AED', letterSpacing: 3 },
  cardUniSub: { fontSize: 8, fontWeight: '600', color: '#94A3B8', letterSpacing: 2 },
  cardLeaderBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4 },
  cardLeaderText: { fontSize: 9, fontWeight: '700', color: '#92400E' },
  cardPhotoRing: { width: 80, height: 80, borderRadius: 22, borderWidth: 3, borderColor: '#7C3AED', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', backgroundColor: '#F8FAFC', marginBottom: 12 },
  cardPhoto: { width: '100%', height: '100%' },
  cardName: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  cardChips: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cardChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  cardChipText: { fontSize: 11, fontWeight: '700' },
  tapHint: { fontSize: 9, color: '#CBD5E1', marginTop: 14 },
  cardBack: { backgroundColor: '#1E293B', borderColor: '#334155', alignItems: 'stretch' },
  magStripe: { height: 40, backgroundColor: '#0F172A', borderRadius: 8, marginBottom: 16 },
  barcodeSection: { flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: 50, marginBottom: 12 },
  barLine: { width: 2.5, backgroundColor: '#E2E8F0', borderRadius: 1 },
  backId: { color: '#94A3B8', fontSize: 11, letterSpacing: 2, fontWeight: '600', textAlign: 'center' },

  quickActions: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  actionBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  actionGradient: { padding: 16, alignItems: 'center', gap: 6, flexDirection: 'row', justifyContent: 'center' },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  qrFullScreen: { flex: 1, backgroundColor: '#0F0722', paddingTop: 50 },
  qrHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 24, gap: 16 },
  qrBackBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 10, gap: 4 },
  qrBackText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  qrHeaderInfo: { flex: 1, alignItems: 'flex-end' },
  leaderBadgeQR: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(252,211,77,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4, marginBottom: 8 },
  leaderBadgeQRText: { color: '#FCD34D', fontSize: 10, fontWeight: '600' },
  qrTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  qrSubtitle: { color: '#A78BFA', fontSize: 14, marginTop: 4 },
  qrCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  qrBox: { backgroundColor: '#FFF', padding: 24, borderRadius: 24, borderWidth: 3, borderColor: '#7C3AED' },
  qrTimer: { flexDirection: 'row', alignItems: 'center', marginTop: 20, padding: 10, backgroundColor: 'rgba(252,211,77,0.1)', borderRadius: 12, gap: 6 },
  qrTimerWarn: { backgroundColor: 'rgba(239,68,68,0.1)' },
  qrTimerText: { color: '#FCD34D', fontSize: 14, fontWeight: '700' },
  qrStopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', marginHorizontal: 40, padding: 14, borderRadius: 14, marginBottom: 40, gap: 8 },
  qrStopText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  drawer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 300, backgroundColor: '#FFF' },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 55, gap: 12 },
  drawerLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF', padding: 4 },
  drawerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  drawerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  drawerClose: { marginLeft: 'auto', width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  drawerContent: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, marginBottom: 4, gap: 12 },
  drawerItemText: { fontSize: 14, fontWeight: '600', color: '#1E293B', flex: 1, textAlign: 'right' },
  drawerLogout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 18, backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, gap: 8 },
  drawerLogoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});