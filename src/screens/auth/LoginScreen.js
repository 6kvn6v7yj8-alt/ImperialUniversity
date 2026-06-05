import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Animated, Alert, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications } from '../../services/notifications';
const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(80)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadSavedCredentials();
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1, duration: 2000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('savedEmail');
      const savedPassword = await AsyncStorage.getItem('savedPassword');
      const savedRemember = await AsyncStorage.getItem('rememberMe');
      
      if (savedRemember === 'true' && savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    } catch (error) {
      console.log('Error loading credentials:', error);
    }
  };

  const saveCredentials = async () => {
    try {
      if (rememberMe) {
        await AsyncStorage.setItem('savedEmail', email);
        await AsyncStorage.setItem('savedPassword', password);
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        await AsyncStorage.removeItem('savedEmail');
        await AsyncStorage.removeItem('savedPassword');
        await AsyncStorage.setItem('rememberMe', 'false');
      }
    } catch (error) {
      console.log('Error saving credentials:', error);
    }
  };

  const showPendingAlert = () => {
    Alert.alert(
      '⏳ حساب قيد المراجعة',
      'حسابك قيد المراجعة من قبل الإدارة أو قائد الدفعة.\n\nسيتم تفعيل حسابك قريباً وستتمكن من الدخول.\n\nيرجى التحقق لاحقاً أو التواصل مع قائد دفعتك.',
      [{ text: 'حسناً' }]
    );
  };

  const showRejectedAlert = () => {
    Alert.alert(
      '❌ تم رفض الحساب',
      'نأسف، تم رفض طلب تسجيلك.\n\nيرجى التواصل مع الإدارة أو قائد الدفعة لمعرفة السبب.',
      [{ text: 'حسناً' }]
    );
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('تنبيه', 'يرجى إدخال البريد وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // حفظ بيانات الدخول لو تذكرني مفعل
      await saveCredentials();

      // فحص حالة المستخدم
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // ✅ فحص الحالة المعلقة
        if (userData.status === 'pending') {
          setLoading(false);
          await auth.signOut(); // تسجيل الخروج لأن الحساب مش مفعل
          showPendingAlert();
          return;
        }

        // ✅ فحص الحالة المرفوضة
        if (userData.status === 'rejected') {
          setLoading(false);
          await auth.signOut();
          showRejectedAlert();
          return;
        }

        // ✅ الحساب مفعل - توجيه حسب الدور
        let targetScreen = 'StudentDashboard';
        const role = userData.role;
        if (role === 'doctor') targetScreen = 'DoctorDashboard';
        else if (role === 'leader') targetScreen = 'LeaderDashboard';
        else if (role === 'admin') targetScreen = 'AdminDashboard';
        else if (role === 'superadmin') targetScreen = 'SuperAdminDashboard';

        setLoading(false);
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: targetScreen }] });
        }, 100);
      } else {
        setLoading(false);
        await auth.signOut();
        Alert.alert('خطأ', 'بيانات المستخدم غير موجودة');
      }

// في handleLogin - بعد setTimeout navigation.reset
registerForPushNotifications().then(token => {
  if (token) {
    updateDoc(doc(db, 'users', user.uid), {
      expoPushToken: token,
      lastSeen: new Date().toISOString()
    }).catch(() => {});
  }
});

    } catch (error) {
      setLoading(false);
      let message = 'فشل تسجيل الدخول';
      if (error.code === 'auth/invalid-credential') message = 'بيانات الدخول غير صحيحة';
      else if (error.code === 'auth/user-not-found') message = 'المستخدم غير موجود';
      else if (error.code === 'auth/wrong-password') message = 'كلمة المرور غير صحيحة';
      else if (error.code === 'auth/invalid-email') message = 'بريد إلكتروني غير صالح';
      else if (error.code === 'auth/too-many-requests') message = 'محاولات كثيرة. حاول لاحقاً';
      console.log('Login error:', error.code);
      Alert.alert('خطأ', message);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F172A', '#1E3A5F', '#1E40AF']} style={styles.bg}>
        <Animated.View style={[styles.bgCircle1, { transform: [{ scale: logoPulse }] }]} />
        <View style={styles.bgCircle2} />
        <View style={styles.bgCircle3} />
        {[...Array(15)].map((_, i) => (
          <View key={i} style={[styles.dot, { top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, opacity: Math.random() * 0.3, width: Math.random() * 3 + 1, height: Math.random() * 3 + 1 }]} />
        ))}
      </LinearGradient>

      <View style={styles.content}>
        {/* Logo */}
        <Animated.View style={[styles.logoSection, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoPulse }] }]}>
            <View style={styles.logoRing}>
              <Image source={require('../../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
            </View>
          </Animated.View>
          <Text style={styles.uniName}>IMPERIAL</Text>
          <Text style={styles.uniNameSub}>UNIVERSITY</Text>
          <View style={styles.mottoRow}>
            <View style={styles.mottoLine} />
            <Text style={styles.mottoText}>العلم نور والحكمة ضياء</Text>
            <View style={styles.mottoLine} />
          </View>
        </Animated.View>

        {/* Form */}
        <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideUp }] }]}>
          <Text style={styles.formTitle}>تسجيل الدخول</Text>
          <Text style={styles.formSub}>أدخل بياناتك للوصول إلى حسابك</Text>

          <View style={styles.inputWrapper}>
            <View style={styles.inputIconBox}>
              <Ionicons name="mail-outline" size={20} color="#1E40AF" />
            </View>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="البريد الإلكتروني" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.inputWrapper}>
            <View style={styles.inputIconBox}>
              <Ionicons name="lock-closed-outline" size={20} color="#1E40AF" />
            </View>
            <TextInput style={[styles.input, { paddingRight: 50 }]} value={password} onChangeText={setPassword} placeholder="كلمة المرور" placeholderTextColor="#94A3B8" secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* تذكرني + نسيت كلمة المرور */}
          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.7}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text style={styles.rememberText}>تذكرني</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.9}>
            <LinearGradient colors={['#1E40AF', '#3B82F6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.loginGradient}>
              {loading ? <ActivityIndicator color="#FFF" size="small" /> : (
                <View style={styles.loginContent}>
                  <Text style={styles.loginText}>دخــول</Text>
                  <Ionicons name="arrow-back" size={20} color="#FFF" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>أو</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.registerBtn} onPress={() => navigation.navigate('Register')} activeOpacity={0.8}>
            <Text style={styles.registerText}>ليس لديك حساب؟</Text>
            <Text style={styles.registerHighlight}>إنشاء حساب جديد</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.footer}>© 2026 Imperial University. جميع الحقوق محفوظة</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bgCircle1: { position: 'absolute', top: -120, right: -60, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(59,130,246,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  bgCircle2: { position: 'absolute', bottom: -80, left: -40, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(99,102,241,0.04)' },
  bgCircle3: { position: 'absolute', top: '35%', right: -15, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(16,185,129,0.03)' },
  dot: { position: 'absolute', borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  logoSection: { alignItems: 'center', marginBottom: 24 },
  logoContainer: { marginBottom: 14 },
  logoRing: { width: 100, height: 100, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', padding: 8 },
  logoImage: { width: '100%', height: '100%', borderRadius: 20 },
  uniName: { color: '#FFF', fontSize: 30, fontWeight: '900', letterSpacing: 10, textAlign: 'center' },
  uniNameSub: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '700', letterSpacing: 8, textAlign: 'center', marginTop: 4 },
  mottoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
  mottoLine: { width: 25, height: 1.5, backgroundColor: 'rgba(252,211,77,0.4)' },
  mottoText: { color: 'rgba(252,211,77,0.7)', fontSize: 11, fontWeight: '500', letterSpacing: 2 },

  formCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 28, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 40, elevation: 15 },
  formTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', textAlign: 'right', marginBottom: 4 },
  formSub: { fontSize: 13, color: '#64748B', textAlign: 'right', marginBottom: 24 },

  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 14, borderWidth: 2, borderColor: '#E2E8F0', overflow: 'hidden' },
  inputIconBox: { paddingHorizontal: 14, paddingVertical: 16, borderRightWidth: 1, borderRightColor: '#E2E8F0' },
  input: { flex: 1, padding: 14, fontSize: 15, color: '#0F172A', textAlign: 'right' },
  eyeBtn: { padding: 14 },

  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  rememberText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  forgotText: { color: '#1E40AF', fontSize: 13, fontWeight: '600' },

  loginBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 24, shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10 },
  loginGradient: { padding: 17, alignItems: 'center' },
  loginContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loginText: { color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: 1 },

  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { color: '#94A3B8', fontSize: 12, fontWeight: '500' },

  registerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', padding: 16, borderRadius: 16, gap: 8, borderWidth: 1.5, borderColor: '#DBEAFE' },
  registerText: { color: '#64748B', fontSize: 14 },
  registerHighlight: { color: '#1E40AF', fontSize: 14, fontWeight: '700' },

  footer: { textAlign: 'center', marginTop: 20, color: 'rgba(255,255,255,0.35)', fontSize: 11 }
});