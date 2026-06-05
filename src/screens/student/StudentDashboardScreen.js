import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, Modal, Pressable, Image, StatusBar, ScrollView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

const { width, height } = Dimensions.get('window');

export default function StudentDashboardScreen({ navigation }) {
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  // State
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(350)).current;
  const [userData, setUserData] = useState(null);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();

    // Pulse animation for card
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
      ])
    ).start();

    // Shimmer animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 3000, useNativeDriver: true })
      ])
    ).start();

    fetchUserData();
    updateTime();
    
    const timeInterval = setInterval(updateTime, 60000);
    return () => clearInterval(timeInterval);
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

  const flipCard = () => {
    Animated.spring(flipAnim, { 
      toValue: cardFlipped ? 0 : 1, 
      friction: 6, 
      tension: 8, 
      useNativeDriver: true 
    }).start();
    setCardFlipped(!cardFlipped);
  };

  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  // صورة المستخدم
  const getUserImage = () => {
    if (!userData) return null;
    const img = userData.profileImage || userData.photo || userData.image;
    if (!img || img.length < 50) return null;
    
    if (img.startsWith('data:image')) return { uri: img };
    if (img.startsWith('http')) return { uri: img };
    return { uri: `data:image/jpeg;base64,${img}` };
  };

  const userImage = getUserImage();

  const openMenu = () => {
    setMenuVisible(true);
    Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }).start();
  };
  
  const closeMenu = () => {
    Animated.spring(slideAnim, { toValue: 350, friction: 6, tension: 40, useNativeDriver: true })
      .start(() => setMenuVisible(false));
  };

  const menuItems = [
    { icon: 'calendar-outline', label: 'الجدول الدراسي', screen: 'Schedule', color: '#3B82F6' },
    { icon: 'book-outline', label: 'المواد الدراسية', screen: 'Courses', color: '#8B5CF6' },
    { icon: 'stats-chart-outline', label: 'النتائج', screen: 'Grades', color: '#10B981' },
    { icon: 'library-outline', label: 'المكتبة', screen: 'Library', color: '#F59E0B' },
    { icon: 'qr-code-outline', label: 'تسجيل الحضور', screen: 'QR', color: '#3B82F6' },
    { icon: 'notifications-outline', label: 'الإشعارات', screen: 'Notifications', color: '#EF4444' },
    { icon: 'chatbubbles-outline', label: 'الدعم الفني', screen: 'Chat', color: '#8B5CF6' },
    { icon: 'wallet-outline', label: 'الدفع الالكتروني', screen: 'Payment', color: '#10B981' },
    { icon: 'warning-outline', label: 'الإنذارات', screen: 'Warnings', color: '#F59E0B' },
    { icon: 'information-circle-outline', label: 'عن التطبيق', screen: 'About', color: '#64748B' },
    { icon: 'create-outline', label: 'تعديل حسابي', screen: 'EditProfile', color: '#EC4899' },
    { icon: 'document-text-outline', label: 'سجل حضوري', screen: 'MyAttendance', color: '#14B8A6' },
    { icon: 'hardware-chip-outline', label: 'المساعد الذكي', screen: 'AIChat', color: '#6366F1' },
  ];

  if (userData?.role === 'leader') {
    menuItems.splice(4, 0, { icon: 'qr-code', label: 'توليد QR حضور', screen: 'LeaderQR', color: '#F97316' });
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />
      
      {/* Background */}
      <LinearGradient colors={['#1E40AF', '#3B82F6', '#6366F1']} style={styles.bg}>
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
      </LinearGradient>

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideUp }] }]}>
        <TouchableOpacity style={styles.menuBtn} onPress={openMenu} activeOpacity={0.7}>
          <Ionicons name="menu" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.greeting}>
            {currentTime.includes('صباحاً') ? '☀️ صباح الخير' : '🌙 مساء الخير'}
          </Text>
          <Text style={styles.greetingName}>{userData?.name || 'طالب'} 👋</Text>
          <Text style={styles.timeText}>{currentTime}</Text>
        </View>
        
        <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
          {userImage ? (
            <Image source={userImage} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {userData?.name?.charAt(0) || 'ط'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Quick Info Cards */}
      <Animated.View style={[styles.quickInfo, { opacity: fadeAnim, transform: [{ translateY: slideUp }] }]}>
        <View style={styles.quickCard}>
          <MaterialCommunityIcons name="book-education" size={22} color="#3B82F6" />
          <Text style={styles.quickLabel}>الدفعة</Text>
          <Text style={styles.quickValue}>{userData?.batch || '-'}</Text>
        </View>
        <View style={styles.quickCard}>
          <MaterialCommunityIcons name="school" size={22} color="#8B5CF6" />
          <Text style={styles.quickLabel}>التخصص</Text>
          <Text style={styles.quickValue}>{userData?.specialization || '-'}</Text>
        </View>
        <View style={styles.quickCard}>
          <MaterialCommunityIcons name="fingerprint" size={22} color="#10B981" />
          <Text style={styles.quickLabel}>التسلسلي</Text>
          <Text style={styles.quickValueSmall}>{userData?.serialNumber || '-'}</Text>
        </View>
      </Animated.View>

      {/* Digital ID Card */}
      <Animated.View style={[styles.cardContainer, { opacity: fadeAnim, transform: [{ translateY: slideUp }] }]}>
        <TouchableOpacity activeOpacity={0.95} onPress={flipCard}>
          <Animated.View style={[styles.card, styles.cardFront, { 
            transform: [{ rotateY: frontInterpolate }, { perspective: 1000 }, { scale: pulseAnim }] 
          }]}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardLogoBox}>
                <Image source={require('../../../assets/logo.png')} style={styles.cardLogo} resizeMode="contain" />
              </View>
              <View>
                <Text style={styles.cardUni}>IMPERIAL</Text>
                <Text style={styles.cardUniSub}>UNIVERSITY COLLAGE </Text>
              </View>
            </View>

            {/* Card Photo */}
            <View style={styles.cardPhotoSection}>
              <View style={styles.cardPhotoRing}>
                {userImage ? (
                  <Image source={userImage} style={styles.cardPhoto} />
                ) : (
                  <FontAwesome5 name="user-graduate" size={36} color="#1E40AF" />
                )}
              </View>
            </View>

            {/* Card Info */}
            <Text style={styles.cardName}>{userData?.name || 'الاسم'}</Text>
            
            <View style={styles.cardChips}>
              <View style={[styles.cardChip, { backgroundColor: '#EEF2FF' }]}>
                <Text style={[styles.cardChipText, { color: '#1E40AF' }]}>دفعة {userData?.batch || '-'}</Text>
              </View>
              <View style={[styles.cardChip, { backgroundColor: '#F0FDF4' }]}>
                <Text style={[styles.cardChipText, { color: '#10B981' }]}>{userData?.specialization || '-'}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.cardSerial}>SN: {userData?.serialNumber || userData?.nationalId || '-'}</Text>
              <Text style={styles.tapHint}>👆 اضغط للخلف</Text>
            </View>
          </Animated.View>

          {/* Card Back */}
          <Animated.View style={[styles.card, styles.cardBack, { 
            transform: [{ rotateY: backInterpolate }, { perspective: 1000 }],
            position: 'absolute', top: 0
          }]}>
            <View style={styles.magStripe} />
            
            <View style={styles.backContent}>
              <View style={styles.backHeader}>
                <Image source={require('../../../assets/logo.png')} style={styles.backLogo} resizeMode="contain" />
                <Text style={styles.backUni}>imperial.university.college College</Text>
              </View>

              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>توقيع الطالب</Text>
                <View style={styles.signatureBox} />
              </View>

              <View style={styles.barcodeSection}>
                {[...Array(40)].map((_, i) => (
                  <View key={i} style={[styles.barLine, { height: 15 + Math.random() * 30 }]} />
                ))}
              </View>

              <View style={styles.backInfo}>
                <Text style={styles.backInfoText}>هذه البطاقة ملك لكلية إمبريال الجامعية</Text>
              </View>

              <Text style={styles.backId}>SN: {userData?.serialNumber || userData?.nationalId || '-'}</Text>
              
              <Text style={styles.tapHint}>👆 اضغط للرجوع</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View style={[styles.quickActions, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('QR')}>
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.actionGradient}>
            <Ionicons name="qr-code" size={22} color="#FFF" />
            <Text style={styles.actionText}>تسجيل حضور</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Grades')}>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.actionGradient}>
            <MaterialCommunityIcons name="chart-bar" size={22} color="#FFF" />
            <Text style={styles.actionText}>النتائج</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Schedule')}>
          <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.actionGradient}>
            <Ionicons name="calendar" size={22} color="#FFF" />
            <Text style={styles.actionText}>الجدول</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Side Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="none">
        <Pressable style={styles.overlay} onPress={closeMenu}>
          <View />
        </Pressable>
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.drawerHeader}>
            <Image source={require('../../../assets/logo.png')} style={styles.drawerLogo} resizeMode="contain" />
            <View>
              <Text style={styles.drawerTitle}>القائمة</Text>
              <Text style={styles.drawerSub}>{userData?.name}</Text>
            </View>
            <TouchableOpacity onPress={closeMenu} style={styles.drawerClose}>
              <Ionicons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
          </LinearGradient>
          
          <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
            {menuItems.map((item, i) => (
              <TouchableOpacity 
                key={i} 
                style={styles.drawerItem} 
                onPress={() => { closeMenu(); navigation.navigate(item.screen); }} 
                activeOpacity={0.7}
              >
                <View style={[styles.drawerIconBox, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={styles.drawerLabel}>{item.label}</Text>
                <Ionicons name="chevron-back" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity style={styles.drawerLogout} onPress={() => { closeMenu(); navigation.navigate('Login'); }}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.drawerLogoutText}>تسجيل الخروج</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  bg: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  bgCircle1: { position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)' },
  bgCircle2: { position: 'absolute', bottom: 20, left: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.04)' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 55, paddingBottom: 15 },
  menuBtn: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  headerCenter: { alignItems: 'center', flex: 1 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  greetingName: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 2 },
  timeText: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: '500' },
  avatarBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholderText: { fontSize: 18, fontWeight: '700', color: '#1E40AF' },

  // Quick Info
  quickInfo: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: -10, marginBottom: 16 },
  quickCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  quickLabel: { fontSize: 10, color: '#94A3B8', marginTop: 6 },
  quickValue: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginTop: 2 },
  quickValueSmall: { fontSize: 12, fontWeight: '800', color: '#1E293B', marginTop: 2 },

  // Card
  cardContainer: { paddingHorizontal: 22, marginBottom: 16 },
  card: { width: '100%', borderRadius: 24, padding: 24, backfaceVisibility: 'hidden', alignItems: 'center' },
  cardFront: { 
    backgroundColor: '#FFFFFF', 
    borderWidth: 2, 
    borderColor: '#E2E8F0',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardLogoBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  cardLogo: { width: 32, height: 32 },
  cardUni: { fontSize: 14, fontWeight: '800', color: '#1E40AF', letterSpacing: 3 },
  cardUniSub: { fontSize: 9, fontWeight: '600', color: '#94A3B8', letterSpacing: 2 },

  cardPhotoSection: { marginBottom: 14 },
  cardPhotoRing: { 
    width: 80, height: 80, borderRadius: 22, 
    borderWidth: 3, borderColor: '#1E40AF', 
    justifyContent: 'center', alignItems: 'center', 
    overflow: 'hidden', backgroundColor: '#F8FAFC' 
  },
  cardPhoto: { width: '100%', height: '100%' },
  
  cardName: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center', letterSpacing: 1 },
  
  cardChips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cardChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  cardChipText: { fontSize: 11, fontWeight: '700' },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cardSerial: { fontSize: 10, color: '#94A3B8', fontWeight: '500', letterSpacing: 1 },
  tapHint: { fontSize: 9, color: '#CBD5E1', fontWeight: '500' },

  // Card Back
  cardBack: { backgroundColor: '#1E293B', borderColor: '#334155', alignItems: 'stretch' },
  magStripe: { height: 40, backgroundColor: '#0F172A', borderRadius: 8, marginBottom: 16 },
  backContent: { alignItems: 'center', paddingHorizontal: 10 },
  backHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  backLogo: { width: 28, height: 28, borderRadius: 8 },
  backUni: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  
  signatureLine: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, width: '100%' },
  signatureLabel: { color: '#64748B', fontSize: 10 },
  signatureBox: { flex: 1, height: 1, backgroundColor: '#334155' },
  
  barcodeSection: { flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: 50, marginBottom: 16 },
  barLine: { width: 2.5, backgroundColor: '#E2E8F0', borderRadius: 1 },
  
  backInfo: { marginBottom: 12 },
  backInfoText: { color: '#64748B', fontSize: 9, textAlign: 'center', marginBottom: 2 },
  backId: { color: '#94A3B8', fontSize: 11, letterSpacing: 2, fontWeight: '600' },

  // Quick Actions
  quickActions: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  actionBtn: { flex: 1, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  actionGradient: { padding: 16, alignItems: 'center', gap: 6 },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  // Drawer
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  drawer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 300, backgroundColor: '#FFF' },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 55, gap: 12 },
  drawerLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF', padding: 4 },
  drawerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  drawerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  drawerClose: { marginLeft: 'auto', width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  
  drawerContent: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, marginBottom: 4 },
  drawerIconBox: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  drawerLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B', flex: 1 },
  
  drawerLogout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 18, backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: '#FECACA' },
  drawerLogoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' }
});
