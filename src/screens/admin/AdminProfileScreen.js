import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Animated, TextInput, Alert
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

export default function AdminProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const { logout } = useAuth();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setName(data.name || '');
          setPhone(data.phone || '');
          setPosition(data.position || 'مدير النظام');
        }
      }
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleSaveProfile = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), { name, phone, position });
        Alert.alert('✅ تم', 'تم تحديث البيانات بنجاح');
        setEditing(false);
        fetchUserData();
      }
    } catch (error) {
      Alert.alert('خطأ', error.message);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('تنبيه', 'جميع الحقول مطلوبة');
      return;
    }
    if (newPassword.length < 6) { Alert.alert('تنبيه', 'كلمة المرور 6 أحرف على الأقل'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('خطأ', 'كلمة المرور غير متطابقة'); return; }

    try {
      const user = auth.currentUser;
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        await updateDoc(doc(db, 'users', user.uid), { password: newPassword });
        Alert.alert('✅ تم', 'تم تغيير كلمة المرور بنجاح');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        setChangingPassword(false);
      }
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        Alert.alert('خطأ', 'كلمة المرور الحالية غير صحيحة');
      } else {
        Alert.alert('خطأ', error.message);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* هيدر فاخر */}
      <View style={styles.header}>
        <View style={styles.headerBg} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الملف الشخصي</Text>
        <Text style={styles.headerSub}>مدير النظام</Text>
      </View>

      {/* صورة وبيانات */}
      <Animated.View style={[styles.profileCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarOuterRing}>
            <View style={styles.avatarBox}>
              {userData?.photo ? (
                <Image source={{ uri: `data:image/jpeg;base64,${userData.photo}` }} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarEmoji}>👑</Text>
              )}
            </View>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>🔐 مدير النظام</Text>
          </View>
        </View>

        {!editing ? (
          <>
            <Text style={styles.userName}>{userData?.name || 'مدير النظام'}</Text>
            <Text style={styles.userEmail}>{userData?.email || ''}</Text>
            <Text style={styles.userPosition}>{userData?.position || 'مدير النظام'}</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)} activeOpacity={0.8}>
              <Text style={styles.editBtnText}>✏️ تعديل البيانات</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.editForm}>
            <Text style={styles.label}>الاسم الكامل</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="أدخل اسمك" placeholderTextColor="#94A3B8" textAlign="right" />
            <Text style={styles.label}>رقم الهاتف</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="05xxxxxxxx" placeholderTextColor="#94A3B8" textAlign="right" />
            <Text style={styles.label}>المسمى الوظيفي</Text>
            <TextInput style={styles.input} value={position} onChangeText={setPosition} placeholder="مدير النظام" placeholderTextColor="#94A3B8" textAlign="right" />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>💾 حفظ التعديلات</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

      {/* معلومات الحساب */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <Text style={styles.cardTitle}>📋 معلومات الحساب</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>البريد الإلكتروني</Text>
          <Text style={styles.infoValue}>{userData?.email || '-'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>رقم الهوية</Text>
          <Text style={styles.infoValue}>{userData?.nationalId || '-'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>تاريخ التسجيل</Text>
          <Text style={styles.infoValue}>{userData?.createdAt || '-'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>نوع الحساب</Text>
          <Text style={styles.infoValue}>👑 مدير - صلاحيات كاملة</Text>
        </View>
      </Animated.View>

      {/* تغيير كلمة المرور */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setChangingPassword(!changingPassword)} activeOpacity={0.8}>
          <Text style={styles.cardTitle}>🔐 تغيير كلمة المرور</Text>
          <Text style={styles.toggleIcon}>{changingPassword ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {changingPassword && (
          <View style={styles.passwordForm}>
            <Text style={styles.label}>كلمة المرور الحالية</Text>
            <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="••••••••" placeholderTextColor="#94A3B8" textAlign="right" />
            <Text style={styles.label}>كلمة المرور الجديدة</Text>
            <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="6 أحرف على الأقل" placeholderTextColor="#94A3B8" textAlign="right" />
            <Text style={styles.label}>تأكيد كلمة المرور</Text>
            <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="••••••••" placeholderTextColor="#94A3B8" textAlign="right" />
            <TouchableOpacity style={styles.passwordBtn} onPress={handleChangePassword} activeOpacity={0.8}>
              <Text style={styles.passwordBtnText}>🔒 تغيير كلمة المرور</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* إجراءات سريعة */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <Text style={styles.cardTitle}>⚡ إجراءات سريعة</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('ManageCourses')} activeOpacity={0.8}>
            <Text style={styles.quickIcon}>📚</Text>
            <Text style={styles.quickLabel}>المواد</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('SendNotification')} activeOpacity={0.8}>
            <Text style={styles.quickIcon}>🔔</Text>
            <Text style={styles.quickLabel}>إشعارات</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('AdminViewAttendance')} activeOpacity={0.8}>
            <Text style={styles.quickIcon}>📋</Text>
            <Text style={styles.quickLabel}>الحضور</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('ManageLibrary')} activeOpacity={0.8}>
            <Text style={styles.quickIcon}>📖</Text>
            <Text style={styles.quickLabel}>المكتبة</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* تسجيل الخروج */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); navigation.navigate('Login'); }} activeOpacity={0.8}>
        <Text style={styles.logoutText}>🚪 تسجيل الخروج</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },

  // هيدر فاخر
  header: { backgroundColor: '#1E293B', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: -16, alignItems: 'center' },
  headerBg: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(30,64,175,0.2)', top: -60, right: -40 },
  backBtn: { position: 'absolute', top: 50, left: 16, width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 10 },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },

  // بطاقة الملف الشخصي
  profileCard: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 24, padding: 28, marginBottom: 16, alignItems: 'center', shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 },
  avatarSection: { alignItems: 'center', marginBottom: 16 },
  avatarOuterRing: { width: 104, height: 104, borderRadius: 30, borderWidth: 3, borderColor: '#1E40AF', padding: 3, marginBottom: 12 },
  avatarBox: { width: '100%', height: '100%', borderRadius: 26, backgroundColor: '#1E40AF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 42 },
  roleBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#C7D2FE' },
  roleText: { color: '#1E40AF', fontSize: 12, fontWeight: '700' },
  userName: { fontSize: 22, fontWeight: '800', color: '#1E293B', marginTop: 8 },
  userEmail: { fontSize: 14, color: '#64748B', marginTop: 4 },
  userPosition: { fontSize: 13, color: '#1E40AF', fontWeight: '600', marginTop: 4 },
  editBtn: { marginTop: 20, backgroundColor: '#EEF2FF', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 },
  editBtnText: { color: '#1E40AF', fontSize: 14, fontWeight: '700' },

  // نموذج التعديل
  editForm: { width: '100%', marginTop: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', textAlign: 'right', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, fontSize: 15, color: '#1E293B' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  saveBtn: { flex: 1, backgroundColor: '#1E40AF', padding: 14, borderRadius: 14, alignItems: 'center', shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  cancelBtn: { flex: 1, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 14, alignItems: 'center' },
  cancelBtnText: { color: '#64748B', fontSize: 15, fontWeight: '600' },

  // بطاقات
  card: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  infoLabel: { fontSize: 13, color: '#64748B' },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  divider: { height: 1, backgroundColor: '#F1F5F9' },

  // كلمة المرور
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleIcon: { fontSize: 14, color: '#64748B' },
  passwordForm: { marginTop: 8 },
  passwordBtn: { backgroundColor: '#EF4444', padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 16, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  passwordBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // إجراءات سريعة
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickBtn: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  quickIcon: { fontSize: 26, marginBottom: 8 },
  quickLabel: { fontSize: 11, color: '#1E293B', fontWeight: '600' },

  // خروج
  logoutBtn: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#FEF2F2', borderRadius: 18, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
});