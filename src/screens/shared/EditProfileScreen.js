import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Animated } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

export default function EditProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // الحقول القابلة للتعديل فقط
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // تغيير كلمة المرور
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { user } = useAuth();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setName(data.name || '');
          setPhone(data.phone || '');
        }
      }
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'الاسم مطلوب');
      return;
    }

    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          name: name.trim(),
          phone: phone.trim(),
        });
        Alert.alert('✅ تم', 'تم تحديث البيانات بنجاح', [
          { text: 'حسناً', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('تنبيه', 'جميع حقول كلمة المرور مطلوبة');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('تنبيه', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('خطأ', 'كلمة المرور الجديدة غير متطابقة');
      return;
    }

    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email) {
        // إعادة المصادقة
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        
        // تحديث كلمة المرور
        await updatePassword(currentUser, newPassword);
        
        // تحديث كلمة المرور في Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
          password: newPassword,
        });

        Alert.alert('✅ تم', 'تم تغيير كلمة المرور بنجاح');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
      }
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        Alert.alert('خطأ', 'كلمة المرور الحالية غير صحيحة');
      } else {
        Alert.alert('خطأ', error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  // تنسيق التاريخ
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return dateStr;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>✏️ تعديل الملف الشخصي</Text>
        <Text style={styles.subtitle}>عدل اسمك ورقم هاتفك وكلمة المرور</Text>
      </View>

      {/* قسم البيانات القابلة للتعديل */}
      <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>📝 المعلومات القابلة للتعديل</Text>
        
        <Text style={styles.label}>الاسم الكامل</Text>
        <TextInput 
          style={styles.input} 
          value={name} 
          onChangeText={setName} 
          placeholder="أدخل اسمك الكامل" 
          placeholderTextColor="#94A3B8" 
          textAlign="right" 
        />

        <Text style={styles.label}>رقم الهاتف</Text>
        <TextInput 
          style={styles.input} 
          value={phone} 
          onChangeText={setPhone} 
          keyboardType="phone-pad" 
          placeholder="أدخل رقم هاتفك" 
          placeholderTextColor="#94A3B8" 
          textAlign="right" 
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>💾 حفظ التغييرات</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* قسم البيانات غير القابلة للتعديل */}
      <Animated.View style={[styles.formCard, styles.lockedCard, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>🔒 معلومات لا يمكن تعديلها</Text>
        <Text style={styles.lockedHint}>هذه البيانات تحتاج إلى التواصل مع الإدارة لتعديلها</Text>
        
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
          <Text style={styles.infoLabel}>الدفعة</Text>
          <Text style={styles.infoValue}>{userData?.batch || '-'}</Text>
        </View>
        <View style={styles.divider} />
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>الجنسية</Text>
          <Text style={styles.infoValue}>{userData?.nationality || '-'}</Text>
        </View>
        <View style={styles.divider} />
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>التخصص</Text>
          <Text style={styles.infoValue}>{userData?.specialization || '-'}</Text>
        </View>
        <View style={styles.divider} />
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>تاريخ التسجيل</Text>
          <Text style={styles.infoValue}>{userData?.createdAt || '-'}</Text>
        </View>
      </Animated.View>

      {/* قسم تغيير كلمة المرور */}
      <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.passwordHeader} onPress={() => setShowPasswordSection(!showPasswordSection)}>
          <Text style={styles.sectionTitle}>🔐 تغيير كلمة المرور</Text>
          <Text style={styles.toggleIcon}>{showPasswordSection ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showPasswordSection && (
          <>
            <Text style={styles.label}>كلمة المرور الحالية</Text>
            <TextInput 
              style={styles.input} 
              value={currentPassword} 
              onChangeText={setCurrentPassword} 
              secureTextEntry 
              placeholder="أدخل كلمة المرور الحالية" 
              placeholderTextColor="#94A3B8" 
              textAlign="right" 
            />

            <Text style={styles.label}>كلمة المرور الجديدة</Text>
            <TextInput 
              style={styles.input} 
              value={newPassword} 
              onChangeText={setNewPassword} 
              secureTextEntry 
              placeholder="6 أحرف على الأقل" 
              placeholderTextColor="#94A3B8" 
              textAlign="right" 
            />

            <Text style={styles.label}>تأكيد كلمة المرور الجديدة</Text>
            <TextInput 
              style={styles.input} 
              value={confirmPassword} 
              onChangeText={setConfirmPassword} 
              secureTextEntry 
              placeholder="أعد كتابة كلمة المرور" 
              placeholderTextColor="#94A3B8" 
              textAlign="right" 
            />

            <TouchableOpacity 
              style={[styles.passwordBtn, saving && styles.passwordBtnDisabled]} 
              onPress={handleChangePassword} 
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.passwordBtnText}>🔒 تغيير كلمة المرور</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  header: { backgroundColor: '#1E40AF', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { alignSelf: 'flex-end', marginBottom: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  backText: { fontSize: 14, color: '#FFF', fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 2 },
  
  formCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 20 },
  lockedCard: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 6 },
  lockedHint: { fontSize: 11, color: '#94A3B8', textAlign: 'right', marginBottom: 16 },
  
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', textAlign: 'right', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1E293B' },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  infoLabel: { fontSize: 13, color: '#94A3B8' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  divider: { height: 1, backgroundColor: '#E2E8F0' },
  
  saveBtn: { backgroundColor: '#1E40AF', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  
  passwordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  toggleIcon: { fontSize: 14, color: '#64748B' },
  
  passwordBtn: { backgroundColor: '#EF4444', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  passwordBtnDisabled: { backgroundColor: '#FCA5A5' },
  passwordBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});