import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image, ActivityIndicator } from 'react-native';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

export default function AdminDashboardScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ 
    students: 0, 
    doctors: 0, 
    leaders: 0, 
    courses: 0, 
    batches: 0, 
    admins: 0,
    schedules: 0,
    attendance: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    fetchAllData();
    
    // إعادة تحميل الإحصائيات عند العودة للشاشة
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAllData();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchAllData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) setUserData(userDoc.data());
      }

      // جلب إحصائيات المستخدمين
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map(d => d.data());
      
      const students = allUsers.filter(u => u.role === 'student').length;
      const doctors = allUsers.filter(u => u.role === 'doctor').length;
      const leaders = allUsers.filter(u => u.role === 'leader').length;
      const admins = allUsers.filter(u => u.role === 'admin').length;
      const batches = [...new Set(allUsers.map(u => u.batch).filter(Boolean))];
      
      // جلب إحصائيات المواد
      const coursesSnap = await getDocs(collection(db, 'courses'));
      const coursesCount = coursesSnap.size;

      // جلب إحصائيات الجدول
      const schedulesSnap = await getDocs(collection(db, 'schedules'));
      const schedulesCount = schedulesSnap.size;

      // جلب إحصائيات الحضور
      const attendanceSnap = await getDocs(collection(db, 'attendance'));
      const attendanceCount = attendanceSnap.size;

      setStats({ 
        students, 
        doctors, 
        leaders, 
        admins, 
        courses: coursesCount, 
        batches: batches.length,
        schedules: schedulesCount,
        attendance: attendanceCount
      });
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* هيدر */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👑 لوحة التحكم</Text>
        <Text style={styles.headerSub}>مرحباً، {userData?.name || 'مدير النظام'}</Text>
      </View>

      {/* كارد الملف الشخصي */}
      <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('AdminProfile')} activeOpacity={0.8}>
        <View style={styles.profileAvatar}>
          {userData?.photo ? (
            <Image source={{ uri: `data:image/jpeg;base64,${userData.photo}` }} style={styles.profileImg} />
          ) : (
            <Text style={styles.profileAvatarText}>👑</Text>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userData?.name || 'مدير النظام'}</Text>
          <Text style={styles.profileEmail}>{userData?.email || 'admin@imperial.edu'}</Text>
          <Text style={styles.profileRole}>{userData?.position || 'مدير النظام - صلاحيات كاملة'}</Text>
        </View>
        <Text style={styles.profileArrow}>→</Text>
      </TouchableOpacity>

      {/* إحصائيات حقيقية */}
      <Animated.View style={[styles.statsSection, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>📊 إحصائيات النظام</Text>
        
        <View style={styles.statsGrid}>
          <TouchableOpacity style={[styles.statCard, { backgroundColor: '#EFF6FF' }]} onPress={() => navigation.navigate('ViewStudents')} activeOpacity={0.8}>
            <Text style={[styles.statNum, { color: '#1E40AF' }]}>{stats.students}</Text>
            <Text style={styles.statLabel}>👨‍🎓 طالب</Text>
          </TouchableOpacity>
          

          <TouchableOpacity style={[styles.statCard, { backgroundColor: '#F0FDF4' }]} onPress={() => navigation.navigate('ViewDoctors')} activeOpacity={0.8}>
            <Text style={[styles.statNum, { color: '#10B981' }]}>{stats.doctors}</Text>
            <Text style={styles.statLabel}>👨‍🏫 دكتور</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statCard, { backgroundColor: '#FFF7ED' }]} onPress={() => navigation.navigate('ViewLeaders')} activeOpacity={0.8}>
            <Text style={[styles.statNum, { color: '#F59E0B' }]}>{stats.leaders}</Text>
            <Text style={styles.statLabel}>◆ قائد</Text>
          </TouchableOpacity>
          
          <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.statNum, { color: '#EF4444' }]}>{stats.admins}</Text>
            <Text style={styles.statLabel}>👑 مدير</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#F3E8FF' }]}>
            <Text style={[styles.statNum, { color: '#8B5CF6' }]}>{stats.courses}</Text>
            <Text style={styles.statLabel}>📚 مادة</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#E0F2FE' }]}>
            <Text style={[styles.statNum, { color: '#0284C7' }]}>{stats.batches}</Text>
            <Text style={styles.statLabel}>📅 دفعة</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statNum, { color: '#D97706' }]}>{stats.schedules}</Text>
            <Text style={styles.statLabel}>📋 محاضرة</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.statNum, { color: '#059669' }]}>{stats.attendance}</Text>
            <Text style={styles.statLabel}>✅ حضور</Text>
          </View>
        </View>
      </Animated.View>

      {/* قائمة الإدارة - المجموعة الأولى: إدارة المستخدمين */}
      <Animated.View style={[styles.menuSection, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>👥 إدارة المستخدمين</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ViewStudents')} activeOpacity={0.8}>
          <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
            <Text style={styles.menuEmoji}>👨‍🎓</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>عرض الطلاب</Text>
            <Text style={styles.menuSub}>عرض وإدارة جميع الطلاب ({stats.students})</Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

<TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ActivateAccounts')} activeOpacity={0.8}>
  <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
    <Text style={styles.menuEmoji}>⏳</Text>
  </View>
  <View style={styles.menuContent}>
    <Text style={styles.menuTitle}>تفعيل الحسابات</Text>
    <Text style={styles.menuSub}>تفعيل حسابات الطلاب الجدد</Text>
  </View>
  <Text style={styles.menuArrow}>→</Text>
</TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ViewDoctors')} activeOpacity={0.8}>
          <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
            <Text style={styles.menuEmoji}>👨‍🏫</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>عرض الدكاترة</Text>
            <Text style={styles.menuSub}>عرض وإدارة الدكاترة ({stats.doctors})</Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ViewLeaders')} activeOpacity={0.8}>
          <View style={[styles.menuIcon, { backgroundColor: '#FFF7ED' }]}>
            <Text style={styles.menuEmoji}>◆</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>عرض قادة الدفعات</Text>
            <Text style={styles.menuSub}>عرض وإدارة قادة الدفعات ({stats.leaders})</Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* قائمة الإدارة - المجموعة الثانية: إدارة المواد والجدول */}
      <Animated.View style={[styles.menuSection, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>📚 إدارة المواد والجدول</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ManageDoctorSubjects')} activeOpacity={0.8}>
          <View style={[styles.menuIcon, { backgroundColor: '#EDE9FE' }]}>
            <Text style={styles.menuEmoji}>👨‍🏫</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>إدارة مواد الدكاترة</Text>
            <Text style={styles.menuSub}>ربط الدكاترة بالمواد والجدول الدراسي</Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ManageCourses')} activeOpacity={0.8}>
          <View style={[styles.menuIcon, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.menuEmoji}>📚</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>إدارة المواد</Text>
            <Text style={styles.menuSub}>إضافة وتعديل المواد الدراسية</Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ManageSchedule')} activeOpacity={0.8}>
          <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.menuEmoji}>📅</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>إدارة الجدول</Text>
            <Text style={styles.menuSub}>إضافة وإلغاء المحاضرات ({stats.schedules})</Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* قائمة الإدارة - المجموعة الثالثة: النتائج والمكتبة */}
      <Animated.View style={[styles.menuSection, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>📊 النتائج والمكتبة</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ManageGrades')} activeOpacity={0.8}>
          <View style={[styles.menuIcon, { backgroundColor: '#DCFCE7' }]}>
            <Text style={styles.menuEmoji}>📊</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>إدارة النتائج</Text>
            <Text style={styles.menuSub}>رفع وتعديل الدرجات</Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ManageLibrary')} activeOpacity={0.8}>
          <View style={[styles.menuIcon, { backgroundColor: '#F3E8FF' }]}>
            <Text style={styles.menuEmoji}>📖</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>إدارة المكتبة</Text>
            <Text style={styles.menuSub}>إضافة الكتب والمراجع</Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* قائمة الإدارة - المجموعة الرابعة: الحضور والإشعارات */}
      <Animated.View style={[styles.menuSection, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>📋 الحضور والإشعارات</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AdminViewAttendance')} activeOpacity={0.8}>
          <View style={[styles.menuIcon, { backgroundColor: '#E0F2FE' }]}>
            <Text style={styles.menuEmoji}>📋</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>سجل الحضور</Text>
            <Text style={styles.menuSub}>عرض وتصدير سجلات الحضور ({stats.attendance})</Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>


        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AdminLiveAttendance')} activeOpacity={0.8}>
          <View style={[styles.menuIcon, { backgroundColor: '#FFF7ED' }]}>
            <Text style={styles.menuEmoji}>🟢</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>الحضور المباشر</Text>
            <Text style={styles.menuSub}>متابعة الحضور بشكل مباشر</Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('SendNotification')} activeOpacity={0.8}>
          <View style={[styles.menuIcon, { backgroundColor: '#FCE7F3' }]}>
            <Text style={styles.menuEmoji}>🔔</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>إرسال إشعارات</Text>
            <Text style={styles.menuSub}>إرسال إشعارات للمستخدمين</Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* أزرار سريعة */}
      <Animated.View style={[styles.quickActions, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>⚡ إجراءات سريعة</Text>
        
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: '#EFF6FF' }]}
            onPress={() => navigation.navigate('ManageDoctorSubjects')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionEmoji}>➕</Text>
            <Text style={styles.quickActionText}>إضافة مادة لدكتور</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: '#F0FDF4' }]}
            onPress={() => navigation.navigate('SendNotification')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionEmoji}>📢</Text>
            <Text style={styles.quickActionText}>إرسال تنبيه</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: '#FEF3C7' }]}
            onPress={() => navigation.navigate('AdminLiveAttendance')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionEmoji}>🟢</Text>
            <Text style={styles.quickActionText}>متابعة الحضور</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: '#F3E8FF' }]}
            onPress={() => navigation.navigate('ManageSchedule')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionEmoji}>📅</Text>
            <Text style={styles.quickActionText}>إضافة محاضرة</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* تسجيل الخروج */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.logoutText}>🚪 تسجيل الخروج</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  loadingText: { marginTop: 10, fontSize: 14, color: '#64748B' },
  
  // هيدر
  header: { 
    backgroundColor: '#1E293B', 
    padding: 24, 
    paddingTop: 50, 
    paddingBottom: 32, 
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32, 
    marginBottom: 8 
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginTop: 4 },

  // كارد الملف الشخصي
  profileCard: { 
    backgroundColor: '#1E40AF', 
    marginHorizontal: 16, 
    borderRadius: 22, 
    padding: 18, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20, 
    marginTop: -20, 
    shadowColor: '#1E40AF', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 20, 
    elevation: 8 
  },
  profileAvatar: { 
    width: 56, 
    height: 56, 
    borderRadius: 18, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 14, 
    overflow: 'hidden' 
  },
  profileImg: { width: '100%', height: '100%' },
  profileAvatarText: { fontSize: 28 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  profileEmail: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 2 },
  profileRole: { fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: 2 },
  profileArrow: { fontSize: 22, color: '#FFF' },

  // إحصائيات
  statsSection: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { 
    width: '23%', 
    borderRadius: 16, 
    padding: 14, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#64748B', marginTop: 4 },

  // قائمة
  menuSection: { paddingHorizontal: 16, marginBottom: 20 },
  menuItem: { 
    backgroundColor: '#FFF', 
    borderRadius: 18, 
    padding: 16, 
    marginBottom: 10, 
    flexDirection: 'row', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 8, 
    elevation: 2 
  },
  menuIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 14 
  },
  menuEmoji: { fontSize: 22 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  menuSub: { fontSize: 11, color: '#64748B', textAlign: 'right', marginTop: 2 },
  menuArrow: { fontSize: 18, color: '#CBD5E1' },

  // إجراءات سريعة
  quickActions: { paddingHorizontal: 16, marginBottom: 20 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickActionCard: { 
    width: '47%', 
    borderRadius: 16, 
    padding: 20, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  quickActionEmoji: { fontSize: 32, marginBottom: 8 },
  quickActionText: { fontSize: 13, fontWeight: '600', color: '#1E293B', textAlign: 'center' },

  // تسجيل الخروج
  logoutBtn: { 
    marginHorizontal: 16, 
    marginBottom: 30, 
    backgroundColor: '#FEF2F2', 
    borderRadius: 18, 
    padding: 16, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#FECACA' 
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});