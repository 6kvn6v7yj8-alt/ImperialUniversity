import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Modal, Pressable, Image } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

const { width, height } = Dimensions.get('window');

export default function StudentDashboardScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [userData, setUserData] = useState(null);
  const [cardFlipped, setCardFlipped] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) setUserData(docSnap.data());
      }
    } catch (error) {
      console.log('Error:', error);
    }
  };

  const flipCard = () => {
    const toValue = cardFlipped ? 0 : 1;
    Animated.spring(flipAnim, { toValue, friction: 8, tension: 10, useNativeDriver: true }).start();
    setCardFlipped(!cardFlipped);
  };

  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const openMenu = () => {
    setMenuVisible(true);
    Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }).start();
  };

  const closeMenu = () => {
    Animated.spring(slideAnim, { toValue: 300, friction: 8, tension: 40, useNativeDriver: true }).start(() => setMenuVisible(false));
  };

  const menuItems = [
    { icon: '▦', label: 'الجدول الدراسي', screen: 'Schedule' },
    { icon: '◫', label: 'المواد الدراسية', screen: 'Courses' },
    { icon: '◬', label: 'النتائج', screen: 'Grades' },
    { icon: '▣', label: 'المكتبة', screen: 'Library' },
    { icon: '◈', label: 'الحضور', screen: 'QR' },
    { icon: '◎', label: 'الإشعارات', screen: 'Notifications' },
    { icon: '◉', label: 'الدعم الفني', screen: 'Chat' },
    { icon: '◇', label: 'المصروفات', screen: 'Payment' },
    { icon: '📋', label: 'سجل حضوري', screen: 'MyAttendance' },
  ];

  return (
    <View style={styles.container}>
      {/* الهيدر */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.menuBtn} onPress={openMenu}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Image source={require('../../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.avatarIcon}>○</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.greeting}>مرحباً، {userData?.name || 'طالب'} 👋</Text>
        <Text style={styles.headerSub}>جامعة إمبريال</Text>
      </View>

      {/* محتوى الصفحة - البطاقة في النصف */}
      <View style={styles.body}>
        <Animated.View style={[styles.cardWrapper, { opacity: fadeAnim }]}>
          <TouchableOpacity activeOpacity={1} onPress={flipCard}>
            
            {/* وجه أمامي */}
            <Animated.View style={[styles.idCard, { transform: [{ rotateY: frontInterpolate }] }]}>
              <View style={styles.cardTop}>
                <Image source={require('../../../assets/logo.png')} style={styles.cardLogo} resizeMode="contain" />
                <Text style={styles.cardUni}>IMPERIAL UNIVERSITY</Text>
                <Text style={styles.cardUniAr}>جامعة إمبريال</Text>
              </View>

              <View style={styles.cardPhotoBox}>
                {userData?.photo ? (
                  <Image source={{ uri: `data:image/jpeg;base64,${userData.photo}` }} style={styles.cardPhoto} />
                ) : (
                  <View style={styles.cardPhotoPlaceholder}>
                    <Text style={styles.cardPhotoIcon}>○</Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardName}>{userData?.name || 'الاسم الكامل'}</Text>
              <Text style={styles.cardId}>رقم الهوية: {userData?.nationalId || '00000000'}</Text>
              
              <View style={styles.cardDivider} />

              <View style={styles.cardInfoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>التخصص</Text>
                  <Text style={styles.infoValue}>{userData?.specialization || '-'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>الدفعة</Text>
                  <Text style={styles.infoValue}>{userData?.batch || '-'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>الجنسية</Text>
                  <Text style={styles.infoValue}>{userData?.nationality || '-'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>الهاتف</Text>
                  <Text style={styles.infoValue}>{userData?.phone || '-'}</Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.cardValid}>سارية حتى 2027</Text>
              </View>
            </Animated.View>

            {/* وجه خلفي */}
            <Animated.View style={[styles.idCard, styles.idCardBack, { transform: [{ rotateY: backInterpolate }] }]}>
              <View style={styles.magneticStripe} />
              <View style={styles.backContent}>
                <Image source={require('../../../assets/logo.png')} style={styles.backLogo} resizeMode="contain" />
                <Text style={styles.backTitle}>IMPERIAL UNIVERSITY</Text>
                <View style={styles.barcodeBox}>
                  <Text style={styles.barcodeText}>||| || |||| | ||| || | ||||</Text>
                  <Text style={styles.barcodeId}>{userData?.nationalId || '00000000'}</Text>
                </View>
                <Text style={styles.backNote}>هذه البطاقة ملك لجامعة إمبريال. في حالة العثور عليها يرجى إعادتها إلى أقرب حرم جامعي.</Text>
                <Text style={styles.backContact}>imperial.edu</Text>
              </View>
            </Animated.View>

          </TouchableOpacity>

          <TouchableOpacity style={styles.flipHint} onPress={flipCard}>
            <Text style={styles.flipText}>🔄 اضغط لقلب البطاقة</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* القائمة الجانبية */}
      <Modal visible={menuVisible} transparent animationType="none">
        <Pressable style={styles.overlay} onPress={closeMenu}><View /></Pressable>
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.drawerHeader}>
            <Image source={require('../../../assets/logo.png')} style={styles.drawerLogo} resizeMode="contain" />
            <Text style={styles.drawerTitle}>القائمة</Text>
            <TouchableOpacity onPress={closeMenu} style={styles.closeBtn}><Text style={styles.closeIcon}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.drawerContent}>
            {menuItems.map((item, i) => (
              <TouchableOpacity key={i} style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate(item.screen); }}>
                <Text style={styles.drawerItemIcon}>{item.icon}</Text>
                <Text style={styles.drawerItemText}>{item.label}</Text>
                <Text style={styles.drawerItemArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.drawerLogout} onPress={() => { closeMenu(); navigation.navigate('Login'); }}>
            <Text style={styles.drawerLogoutText}>⇥ تسجيل الخروج</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  
  // الهيدر
  header: { 
    backgroundColor: '#1E40AF', 
    paddingHorizontal: 20, 
    paddingTop: 50, 
    paddingBottom: 16,
    borderBottomLeftRadius: 24, 
    borderBottomRightRadius: 24,
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12,
  },
  menuBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.25)' 
  },
  menuIcon: { fontSize: 18, color: '#FFF' },
  headerLogo: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFF', padding: 3 },
  avatarBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.25)' 
  },
  avatarIcon: { fontSize: 16, color: '#FFF' },
  greeting: { fontSize: 16, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: 2 },

  // محتوى الصفحة
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
  },

  // البطاقة العمودية
  idCard: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(30,64,175,0.1)',
    backfaceVisibility: 'hidden',
  },
  idCardBack: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'absolute',
    top: 0,
  },
  cardTop: { alignItems: 'center', marginBottom: 14 },
  cardLogo: { width: 44, height: 44, borderRadius: 10, marginBottom: 4 },
  cardUni: { fontSize: 11, fontWeight: '800', color: '#1E40AF', letterSpacing: 1.5 },
  cardUniAr: { fontSize: 10, color: '#64748B', marginTop: 1 },
  cardPhotoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#1E40AF',
    overflow: 'hidden',
    marginBottom: 10,
  },
  cardPhoto: { width: '100%', height: '100%' },
  cardPhotoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardPhotoIcon: { fontSize: 30, color: '#1E40AF' },
  cardName: { fontSize: 16, fontWeight: '800', color: '#1E293B', textAlign: 'center', marginBottom: 3 },
  cardId: { fontSize: 12, color: '#64748B', textAlign: 'center', marginBottom: 10 },
  cardDivider: { width: '70%', height: 1, backgroundColor: '#E2E8F0', marginBottom: 12 },
  cardInfoGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: { width: '50%', paddingVertical: 6, paddingHorizontal: 8 },
  infoLabel: { fontSize: 10, color: '#94A3B8', textAlign: 'right' },
  infoValue: { fontSize: 12, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginTop: 1 },
  cardBottom: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', width: '100%', alignItems: 'center' },
  cardValid: { fontSize: 9, color: '#94A3B8', fontWeight: '600', letterSpacing: 1 },

  // ظهر البطاقة
  magneticStripe: { width: '100%', height: 30, backgroundColor: '#2D3748', marginBottom: 16, borderRadius: 4 },
  backContent: { alignItems: 'center', paddingHorizontal: 12 },
  backLogo: { width: 32, height: 32, borderRadius: 6, marginBottom: 6 },
  backTitle: { fontSize: 12, fontWeight: '800', color: '#FFFFFF', letterSpacing: 2, marginBottom: 10 },
  barcodeBox: { backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8, marginBottom: 10, alignItems: 'center' },
  barcodeText: { fontSize: 10, color: '#000', letterSpacing: 2, fontFamily: 'monospace' },
  barcodeId: { fontSize: 9, color: '#64748B', marginTop: 3 },
  backNote: { fontSize: 9, color: '#94A3B8', textAlign: 'center', lineHeight: 14, marginBottom: 8 },
  backContact: { fontSize: 10, color: '#64748B', fontWeight: '600' },

  flipHint: { marginTop: 12 },
  flipText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },

  // القائمة الجانبية
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  drawer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 280, backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderBottomLeftRadius: 30, paddingTop: 50, shadowColor: '#000', shadowOffset: { width: -4, height: 0 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  drawerLogo: { width: 28, height: 28, borderRadius: 6 },
  drawerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  closeBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  closeIcon: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  drawerContent: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 1 },
  drawerItemIcon: { fontSize: 15, color: '#1E40AF', marginRight: 10 },
  drawerItemText: { fontSize: 13, fontWeight: '600', color: '#1E293B', flex: 1 },
  drawerItemArrow: { fontSize: 13, color: '#CBD5E1' },
  drawerLogout: { margin: 16, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  drawerLogoutText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
});