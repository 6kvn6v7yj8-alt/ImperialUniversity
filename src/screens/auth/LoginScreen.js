import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { 
      Alert.alert('تنبيه', 'ادخل البريد الإلكتروني وكلمة المرور'); 
      return; 
    }
    
    setLoading(true);
    try {
      // تسجيل الدخول في Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // جلب بيانات المستخدم من Firestore لمعرفة الدور تلقائياً
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      let userRole = 'student'; // الدور الافتراضي
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userRole = userData.role || 'student';
        
        // حفظ بيانات المستخدم في Context
        login({ uid: user.uid, email: user.email, ...userData }, userRole);
      } else {
        // لو المستخدم مش موجود في Firestore (حالة نادرة)
        login({ uid: user.uid, email: user.email }, userRole);
      }

      // توجيه المستخدم للواجهة المناسبة تلقائياً
      switch (userRole) {
        case 'admin':
          navigation.navigate('AdminDashboard');
          break;
        case 'doctor':
          navigation.navigate('DoctorDashboard');
          break;
        case 'student':
        default:
          navigation.navigate('StudentDashboard');
          break;
      }

    } catch (error) {
      let errorMessage = 'حدث خطأ غير متوقع';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'المستخدم غير موجود. تأكد من البريد الإلكتروني';
          break;
        case 'auth/wrong-password':
          errorMessage = 'كلمة المرور غير صحيحة';
          break;
        case 'auth/invalid-email':
          errorMessage = 'بريد إلكتروني غير صالح';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'بيانات الدخول غير صحيحة';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'محاولات كثيرة. حاول لاحقاً';
          break;
        default:
          errorMessage = error.message;
      }
      
      Alert.alert('خطأ في تسجيل الدخول', errorMessage);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.bgCircle} />
      <View style={styles.bgCircle2} />
      
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* لوجو الجامعة */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../../assets/logo.png')} 
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        {/* عنوان */}
        <View style={styles.titleBox}>
          <Text style={styles.title}>تسجيل الدخول</Text>
          <Text style={styles.subtitle}>مرحباً بعودتك إلى جامعة إمبريال</Text>
        </View>

        {/* حقل البريد الإلكتروني */}
        <View style={styles.inputBox}>
          <Text style={styles.inputIcon}>✉</Text>
          <TextInput 
            style={styles.input} 
            placeholder="البريد الإلكتروني" 
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address" 
            autoCapitalize="none" 
            placeholderTextColor="#94A3B8" 
            textAlign="right" 
          />
        </View>

        {/* حقل كلمة المرور */}
        <View style={styles.inputBox}>
          <Text style={styles.inputIcon}>⊡</Text>
          <TextInput 
            style={styles.input} 
            placeholder="كلمة المرور" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
            placeholderTextColor="#94A3B8" 
            textAlign="right" 
          />
        </View>

        {/* زر الدخول */}
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleLogin} 
          disabled={loading} 
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>دخول</Text>
          )}
        </TouchableOpacity>

        {/* روابط مساعدة */}
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.linkBtn}>
          <Text style={styles.link}>نسيت كلمة المرور؟</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkBtn}>
          <Text style={styles.link}>ليس لديك حساب؟ سجل الآن</Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F0F4FF', 
    justifyContent: 'center' 
  },
  bgCircle: { 
    position: 'absolute', 
    width: 200, 
    height: 200, 
    borderRadius: 200, 
    backgroundColor: 'rgba(30,64,175,0.05)', 
    top: -60, 
    left: -60 
  },
  bgCircle2: { 
    position: 'absolute', 
    width: 160, 
    height: 160, 
    borderRadius: 160, 
    backgroundColor: 'rgba(30,64,175,0.04)', 
    bottom: -40, 
    right: -40 
  },
  content: { 
    paddingHorizontal: 28 
  },
  logoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignSelf: 'center',
    marginBottom: 24,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  logoImg: { 
    width: 64, 
    height: 64, 
    borderRadius: 12 
  },
  titleBox: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  title: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#1E293B', 
    textAlign: 'center',
    marginBottom: 4
  },
  subtitle: { 
    fontSize: 13, 
    color: '#64748B', 
    textAlign: 'center' 
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 14,
    marginBottom: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(30,64,175,0.1)',
    height: 54,
  },
  inputIcon: {
    fontSize: 16,
    color: '#1E40AF',
    marginRight: 10,
  },
  input: { 
    flex: 1,
    fontSize: 15, 
    color: '#1E293B',
  },
  button: { 
    backgroundColor: '#1E40AF', 
    paddingVertical: 16, 
    borderRadius: 14, 
    alignItems: 'center', 
    marginTop: 8, 
    marginBottom: 18,
    shadowColor: '#1E40AF', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 16, 
    elevation: 8 
  },
  buttonDisabled: { 
    backgroundColor: '#93C5FD' 
  },
  buttonText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  linkBtn: {
    marginTop: 4,
  },
  link: { 
    color: '#1E40AF', 
    textAlign: 'center', 
    fontSize: 13, 
    fontWeight: '600' 
  },
});
