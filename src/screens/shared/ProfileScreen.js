import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, ActivityIndicator, Animated, Dimensions 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchUserData();
    
    // Shimmer animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 2500, useNativeDriver: true })
      ])
    ).start();
    
    // Refresh on focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserData();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) setUserData(docSnap.data());
      }
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true })
      ]).start();
    }
  };

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

  const getRoleLabel = (role) => {
    switch (role) {
      case 'student': return 'طالب';
      case 'doctor': return 'دكتور';
      case 'admin': return 'مدير';
      case 'leader': return 'قائد دفعة';
      default: return 'طالب';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'student': return '#3B82F6';
      case 'doctor': return '#10B981';
      case 'admin': return '#F59E0B';
      case 'leader': return '#8B5CF6';
      default: return '#3B82F6';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'student': return 'school';
      case 'doctor': return 'teach';
      case 'admin': return 'shield-account';
      case 'leader': return 'crown';
      default: return 'account';
    }
  };

  const infoItems = [
    { icon: 'person-outline', label: 'الاسم الكامل', value: userData?.name },
    { icon: 'mail-outline', label: 'البريد الإلكتروني', value: userData?.email },
    { icon: 'call-outline', label: 'رقم الهاتف', value: userData?.phone },
    { icon: 'finger-print-outline', label: 'الرقم التسلسلي', value: userData?.serialNumber },
    { icon: 'id-card-outline', label: 'رقم الهوية', value: userData?.nationalId },
    { icon: 'school-outline', label: 'الدفعة', value: userData?.batch ? `دفعة ${userData.batch}` : '-' },
    { icon: 'ribbon-outline', label: 'التخصص', value: userData?.specialization },
    { icon: 'calendar-outline', label: 'تاريخ التسجيل', value: userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('ar-SA') : '-' },
    { icon: 'location-outline', label: 'العنوان', value: userData?.address || '-' },
    { icon: 'earth-outline', label: 'الجنسية', value: userData?.nationality || 'سعودي' },
  ];

  const menuItems = [
    { icon: 'create-outline', label: 'تعديل الملف الشخصي', screen: 'EditProfile', color: '#3B82F6' },
    { icon: 'camera-outline', label: 'تغيير الصورة الشخصية', screen: 'ChangeProfileImage', color: '#8B5CF6' },
    { icon: 'notifications-outline', label: 'الإشعارات', screen: 'Notifications', color: '#F59E0B' },
    { icon: 'chatbubbles-outline', label: 'الدعم الفني', screen: 'Chat', color: '#10B981' },
    { icon: 'shield-checkmark-outline', label: 'إعدادات الأمان', screen: 'SecuritySettings', color: '#EF4444' },
    { icon: 'wallet-outline', label: 'المصروفات', screen: 'Payment', color: '#EC4899' },
  ];

  if (loading || !userData) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>جاري تحميل الملف الشخصي...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with Gradient */}
      <LinearGradient colors={['#1E40AF', '#3B82F6', '#6366F1']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>الملف الشخصي</Text>
          <View style={{ width: 40 }} />
        </View>
        
        {/* Avatar Section */}
        <Animated.View style={[styles.avatarContainer, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarBox}>
              {userImage ? (
                <Image source={userImage} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarText}>
                  {userData.name?.charAt(0) || 'م'}
                </Text>
              )}
            </View>
          </View>
          
          <Text style={styles.name}>{userData.name || 'مستخدم'}</Text>
          
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(userData.role) + '20', borderColor: getRoleColor(userData.role) + '40' }]}>
            <MaterialCommunityIcons name={getRoleIcon(userData.role)} size={16} color={getRoleColor(userData.role)} />
            <Text style={[styles.roleText, { color: getRoleColor(userData.role) }]}>
              {getRoleLabel(userData.role)}
            </Text>
          </View>
          
          {userData.serialNumber && (
            <View style={styles.serialBadge}>
              <Ionicons name="finger-print" size={14} color="#94A3B8" />
              <Text style={styles.serialText}>{userData.serialNumber}</Text>
            </View>
          )}
        </Animated.View>
      </LinearGradient>

      {/* Info Card */}
      <Animated.View style={[styles.infoCard, { opacity: fadeAnim, transform: [{ translateY: slideUp }] }]}>
        <Text style={styles.infoTitle}>📋 المعلومات الشخصية</Text>
        
        {infoItems.map((item, i) => (
          <View key={i}>
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name={item.icon} size={18} color="#94A3B8" />
                <Text style={styles.infoValue}>{item.value || '-'}</Text>
              </View>
              <Text style={styles.infoLabel}>{item.label}</Text>
            </View>
            {i < infoItems.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Animated.View>

      {/* Menu Items */}
      <Animated.View style={[styles.menuSection, { opacity: fadeAnim }]}>
        <Text style={styles.menuTitle}>⚙️ الإعدادات والخيارات</Text>
        
        {menuItems.map((item, i) => (
          <TouchableOpacity 
            key={i}
            style={styles.menuItem} 
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: item.color + '12' }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={styles.menuText}>{item.label}</Text>
            <Ionicons name="chevron-back" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Logout Button */}
      <TouchableOpacity 
        style={styles.logoutBtn} 
        onPress={() => { 
          logout(); 
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); 
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },

  // Header
  header: { 
    paddingBottom: 30, 
    borderBottomLeftRadius: 35, 
    borderBottomRightRadius: 35,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 55,
    marginBottom: 10
  },
  backBtn: { 
    width: 40, height: 40, borderRadius: 14, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },

  // Avatar
  avatarContainer: { alignItems: 'center', marginTop: 10 },
  avatarRing: { 
    width: 100, height: 100, borderRadius: 30, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 14
  },
  avatarBox: { 
    width: 82, height: 82, borderRadius: 22, 
    backgroundColor: '#FFF', 
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3, borderColor: '#FFF'
  },
  avatar: { width: '100%', height: '100%' },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#1E40AF' },
  
  name: { fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  
  roleBadge: { 
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 6, 
    borderRadius: 20, marginTop: 10, gap: 6,
    borderWidth: 1
  },
  roleText: { fontSize: 13, fontWeight: '700' },
  
  serialBadge: { 
    flexDirection: 'row', alignItems: 'center',
    marginTop: 8, gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 14
  },
  serialText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', letterSpacing: 1 },

  // Info Card
  infoCard: { 
    backgroundColor: '#FFF', 
    marginHorizontal: 16, 
    marginTop: -16, 
    borderRadius: 24, 
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6
  },
  infoTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 18 },
  
  infoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12 
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' },
  infoLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  divider: { height: 1, backgroundColor: '#F1F5F9' },

  // Menu
  menuSection: { padding: 16 },
  menuTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 14 },
  
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  menuIconBox: { 
    width: 44, height: 44, borderRadius: 14, 
    justifyContent: 'center', alignItems: 'center', 
    marginRight: 14 
  },
  menuText: { fontSize: 15, fontWeight: '600', color: '#1E293B', flex: 1 },

  // Logout
  logoutBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16, 
    marginTop: 10,
    marginBottom: 32, 
    backgroundColor: '#FEF2F2', 
    borderRadius: 18, 
    padding: 18, 
    gap: 8,
    borderWidth: 1.5, 
    borderColor: '#FECACA' 
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#EF4444' }
});