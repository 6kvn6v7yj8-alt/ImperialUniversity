import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, TextInput, Alert, Image, Dimensions, ActivityIndicator, Modal
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase/config';

const { width, height } = Dimensions.get('window');

const BATCHES = ['A', 'B', 'C', 'D'];
const SPECIALIZATIONS = ['طب', 'صيدلة', 'تمريض', 'اسنان', 'مختبرات'];

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', nationalId: '', batch: '', specialization: '', address: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0.33)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const confettiAnim1 = useRef(new Animated.Value(0)).current;
  const confettiAnim2 = useRef(new Animated.Value(0)).current;
  const confettiAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();
    generateSerialNumber();
  }, []);

  const generateSerialNumber = () => {
    const year = new Date().getFullYear().toString().slice(2);
    const random = Math.floor(100000 + Math.random() * 900000);
    setSerialNumber(`IMP${year}${random}`);
  };

  const showSuccessAnimation = () => {
    setShowSuccess(true);
    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, friction: 4, tension: 30, useNativeDriver: true }),
      Animated.timing(successOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(confettiAnim1, { toValue: 1, duration: 2000, useNativeDriver: true }),
      Animated.timing(confettiAnim2, { toValue: 1, duration: 2500, useNativeDriver: true }),
      Animated.timing(confettiAnim3, { toValue: 1, duration: 1800, useNativeDriver: true })
    ]).start();
  };

  const animateProgress = (s) => {
    Animated.timing(progressAnim, { toValue: s * 0.33, duration: 400, useNativeDriver: false }).start();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('صلاحية', 'نحتاج صلاحية الوصول للصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true
    });
    if (!result.canceled) setProfileImage(result.assets[0]);
  };

  const validateStep = (s) => {
    const newErrors = {};
    if (s === 1) {
      if (!formData.name.trim()) newErrors.name = 'الاسم مطلوب';
      if (!formData.email.trim()) newErrors.email = 'البريد مطلوب';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'بريد غير صالح';
      if (!formData.password) newErrors.password = 'كلمة المرور مطلوبة';
      else if (formData.password.length < 6) newErrors.password = 'كلمة المرور 6 أحرف على الأقل';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'كلمة المرور غير متطابقة';
    }
    if (s === 2) {
      if (!formData.phone.trim()) newErrors.phone = 'رقم الهاتف مطلوب';
      else if (!/^05\d{8}$/.test(formData.phone)) newErrors.phone = 'رقم هاتف سعودي غير صالح';
      if (!formData.nationalId.trim()) newErrors.nationalId = 'رقم الهوية مطلوب';
else if (!formData.nationalId.trim()) newErrors.nationalId = 'رقم الهوية مطلوب';  
    if (!formData.batch) newErrors.batch = 'الدفعة مطلوبة';
      if (!formData.specialization) newErrors.specialization = 'التخصص مطلوب';
    }
    if (s === 3) { if (!profileImage) newErrors.image = 'الصورة الشخصية مطلوبة'; }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => { if (validateStep(step)) { setStep(step + 1); animateProgress(step + 1); } };
  const prevStep = () => { setStep(step - 1); animateProgress(step - 1); };

  const handleRegister = async () => {
    if (!validateStep(3)) return;
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      let photoBase64 = '';
      if (profileImage?.base64) photoBase64 = profileImage.base64;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid, serialNumber: serialNumber, name: formData.name, email: formData.email,
        phone: formData.phone, nationalId: formData.nationalId, batch: formData.batch,
        specialization: formData.specialization, address: formData.address || '',
        role: 'student', photo: photoBase64, profileImage: photoBase64,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        status: 'pending'
      });

      setLoading(false);
      showSuccessAnimation();
    } catch (error) {
      setLoading(false);
      let message = 'فشل التسجيل';
      if (error.code === 'auth/email-already-in-use') message = 'البريد الإلكتروني مسجل مسبقاً';
      Alert.alert('خطأ', message);
    }
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  // نجاح التسجيل
  if (showSuccess) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient colors={['#0F172A', '#1E3A5F', '#1E40AF']} style={styles.successBg}>
        <Animated.View style={[styles.successContent, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
            <Animated.View style={[styles.successIconContainer, { transform: [{ scale: successScale }] }]}>
              <View style={styles.successIconRing}>
                <View style={styles.successIconInner}>
                  <Ionicons name="checkmark" size={60} color="#FFF" />
                </View>
              </View>
            </Animated.View>
            
            <Text style={styles.successTitle}>🎉 تم التسجيل بنجاح!</Text>
            <Text style={styles.successSubtitle}>مرحباً بك في Imperial University</Text>
            
            <View style={styles.successInfoCard}>
              <View style={styles.successInfoRow}>
                <Text style={styles.successInfoLabel}>الرقم التسلسلي</Text>
                <Text style={styles.successInfoValue}>{serialNumber}</Text>
              </View>
              <View style={styles.successInfoDivider} />
              <View style={styles.successInfoRow}>
                <Text style={styles.successInfoLabel}>الاسم</Text>
                <Text style={styles.successInfoValue}>{formData.name}</Text>
              </View>
              <View style={styles.successInfoDivider} />
              <View style={styles.successInfoRow}>
                <Text style={styles.successInfoLabel}>الدفعة</Text>
                <Text style={styles.successInfoValue}>دفعة {formData.batch}</Text>
              </View>
              <View style={styles.successInfoDivider} />
              <View style={styles.successInfoRow}>
                <Text style={styles.successInfoLabel}>التخصص</Text>
                <Text style={styles.successInfoValue}>{formData.specialization}</Text>
              </View>
            </View>

            <View style={styles.pendingBadge}>
              <MaterialCommunityIcons name="clock-outline" size={22} color="#f59e0b" />
              <Text style={styles.pendingText}>حسابك قيد المراجعة</Text>
            </View>
            <Text style={styles.pendingSubtext}>سيتم تفعيل حسابك من قبل الإدارة أو قائد الدفعة</Text>

            <TouchableOpacity style={styles.loginRedirectBtn} onPress={() => navigation.navigate('Login')}>
              <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.loginRedirectGradient}>
                <Text style={styles.loginRedirectText}>الذهاب إلى تسجيل الدخول</Text>
                <Ionicons name="arrow-back" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={['#0F172A', '#1E3A5F', '#1E40AF']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إنشاء حساب جديد</Text>
        <Text style={styles.headerSub}>انضم إلى Imperial University</Text>
      </LinearGradient>

      <View style={styles.progressCard}>
        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        <View style={styles.stepsRow}>
          {[1, 2, 3].map(s => (
            <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]}>
              {step > s ? <Ionicons name="checkmark" size={12} color="#FFF" /> : <Text style={[styles.stepDotText, step >= s && { color: '#FFF' }]}>{s}</Text>}
            </View>
          ))}
        </View>
        <View style={styles.stepsLabels}>
          <Text style={[styles.stepLabel, step >= 1 && styles.stepLabelActive]}>الحساب</Text>
          <Text style={[styles.stepLabel, step >= 2 && styles.stepLabelActive]}>البيانات</Text>
          <Text style={[styles.stepLabel, step >= 3 && styles.stepLabelActive]}>الصورة</Text>
        </View>
      </View>

      <Animated.View style={[styles.form, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>📝 معلومات الحساب</Text>
            <Text style={styles.label}>الاسم الكامل *</Text>
            <TextInput style={[styles.input, errors.name && styles.inputError]} value={formData.name} onChangeText={(t) => setFormData({...formData, name: t})} placeholder="الاسم الرباعي كامل" placeholderTextColor="#94A3B8" />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            <Text style={styles.label}>البريد الإلكتروني *</Text>
            <TextInput style={[styles.input, errors.email && styles.inputError]} value={formData.email} onChangeText={(t) => setFormData({...formData, email: t})} placeholder="example@email.com" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            <Text style={styles.label}>كلمة المرور *</Text>
            <View style={styles.passRow}>
              <TextInput style={[styles.input, styles.passInput, errors.password && styles.inputError]} value={formData.password} onChangeText={(t) => setFormData({...formData, password: t})} placeholder="••••••••" placeholderTextColor="#94A3B8" secureTextEntry={!showPassword} />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}><Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#64748B" /></TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            <Text style={styles.label}>تأكيد كلمة المرور *</Text>
            <TextInput style={[styles.input, errors.confirmPassword && styles.inputError]} value={formData.confirmPassword} onChangeText={(t) => setFormData({...formData, confirmPassword: t})} placeholder="••••••••" placeholderTextColor="#94A3B8" secureTextEntry />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
              <Text style={styles.nextText}>التالي</Text><Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>🎓 البيانات الدراسية</Text>
            <Text style={styles.label}>رقم الهاتف * (سعودي)</Text>
            <TextInput style={[styles.input, errors.phone && styles.inputError]} value={formData.phone} onChangeText={(t) => setFormData({...formData, phone: t})} placeholder="05xxxxxxxx" placeholderTextColor="#94A3B8" keyboardType="phone-pad" maxLength={10} />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            <Text style={styles.hintText}>يبدأ بـ 05 ويتكون من 10 أرقام</Text>
            <Text style={styles.label}>رقم الهوية للمقيم او رقم الجواز للزائر* </Text>
            <TextInput style={[styles.input, errors.nationalId && styles.inputError]} value={formData.nationalId} onChangeText={(t) => setFormData({...formData, nationalId: t})} placeholder="xxxxxxxxx" placeholderTextColor="#94A3B8" keyboardType="numeric" maxLength={20} />
            {errors.nationalId && <Text style={styles.errorText}>{errors.nationalId}</Text>}
            <Text style={styles.hintText}>رقم الهوية مطلوب</Text>
            <Text style={styles.label}>الدفعة *</Text>
            <View style={styles.chipRow}>
              {BATCHES.map(batch => (
                <TouchableOpacity key={batch} style={[styles.chip, formData.batch === batch && styles.chipActive]} onPress={() => setFormData({...formData, batch})}>
                  <Text style={[styles.chipText, formData.batch === batch && styles.chipTextActive]}>دفعة {batch}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.batch && <Text style={styles.errorText}>{errors.batch}</Text>}
            <Text style={styles.label}>التخصص *</Text>
            <View style={styles.chipRow}>
              {SPECIALIZATIONS.map(spec => (
                <TouchableOpacity key={spec} style={[styles.chip, formData.specialization === spec && styles.chipActive]} onPress={() => setFormData({...formData, specialization: spec})}>
                  <Text style={[styles.chipText, formData.specialization === spec && styles.chipTextActive]}>{spec}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.specialization && <Text style={styles.errorText}>{errors.specialization}</Text>}
            <Text style={styles.label}>العنوان (اختياري)</Text>
            <TextInput style={styles.input} value={formData.address} onChangeText={(t) => setFormData({...formData, address: t})} placeholder="المدينة، الحي، الشارع" placeholderTextColor="#94A3B8" />
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backStepBtn} onPress={prevStep}><Ionicons name="arrow-back" size={20} color="#64748B" /><Text style={styles.backStepText}>السابق</Text></TouchableOpacity>
              <TouchableOpacity style={styles.nextBtn} onPress={nextStep}><Text style={styles.nextText}>التالي</Text><Ionicons name="arrow-forward" size={20} color="#FFF" /></TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>📸 الصورة والتأكيد</Text>
            <View style={styles.serialCard}>
              <FontAwesome5 name="fingerprint" size={28} color="#1E40AF" />
              <View><Text style={styles.serialLabel}>الرقم التسلسلي</Text><Text style={styles.serialValue}>{serialNumber}</Text></View>
            </View>
            <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
              {profileImage ? <Image source={{ uri: profileImage.uri }} style={styles.profileImg} /> : <View style={styles.imagePlaceholder}><Ionicons name="camera-outline" size={48} color="#CBD5E1" /><Text style={styles.imagePlaceholderText}>اضغط لاختيار صورة</Text></View>}
            </TouchableOpacity>
            {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
            <View style={styles.guidelines}>
              <Text style={styles.guidelinesTitle}>📋 إرشادات الصورة:</Text>
              <View style={styles.guideItem}><Ionicons name="checkmark-circle" size={18} color="#10B981" /><Text style={styles.guideText}>أن تكون الصورة حديثة وواضحة وعالية الجودة</Text></View>
              <View style={styles.guideItem}><Ionicons name="checkmark-circle" size={18} color="#10B981" /><Text style={styles.guideText}>أن يظهر الوجه بشكل كامل وواضح</Text></View>
 <View style={styles.guideItem}><Ionicons name="checkmark-circle" size={18} color="#10B981" /><Text style={styles.guideText}>أن تكون خلفية الصورة باللون الابيض الرسمي</Text></View>
 <View style={styles.guideItem}><Ionicons name="checkmark-circle" size={18} color="#10B981" /><Text style={styles.guideText}>ارتداء ملابس لائقة تتناسب مع الطابع الأكاديمي أو الرسمي.</Text></View>
              <View style={styles.guideItem}><Ionicons name="close-circle" size={18} color="#EF4444" /><Text style={styles.guideTextRed}>عدم استخدام صور جماعية أو صور تحتوي على أشخاص آخرين</Text></View>
              <View style={styles.guideItem}><Ionicons name="close-circle" size={18} color="#EF4444" /><Text style={styles.guideTextRed}>عدم استخدام الشعارات أو الرموز أو الصور غير الشخصية</Text></View>
   <View style={styles.guideItem}><Ionicons name="close-circle" size={18} color="#EF4444" /><Text style={styles.guideTextRed}>يجب أن تكون ملامح الوجه ظاهرة بالكامل، لذلك لا تُقبل الصور التي يتم فيها تغطية الوجه أو جزء منه بما يمنع التحقق من الهوية، بما في ذلك النقاب أو أي غطاء يحجب ملامح الوجه</Text></View>
<View style={styles.guideItem}><Ionicons name="close-circle" size={18} color="#EF4444" /><Text style={styles.guideTextRed}>لا تُقبل الصور التي يتم فيها ارتداء القبعات أو الكابات أو أغطية الرأس التي تحجب أجزاء من الوجه، إلا إذا كانت لأسباب معتمدة من الجهة المختصة</Text></View>
            <Text style={styles.guidelinesTitle}>* ملاحظة  :  قد يتم تعليق اعتماد الحساب مؤقتًا لحين استبدال الصورة في حال عدم استيفائها للشروط المذكورة</Text>
</View>
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>📋 ملخص</Text>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>الاسم:</Text><Text style={styles.summaryValue}>{formData.name}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>البريد:</Text><Text style={styles.summaryValue}>{formData.email}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>الهاتف:</Text><Text style={styles.summaryValue}>{formData.phone}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>الدفعة:</Text><Text style={styles.summaryValue}>دفعة {formData.batch}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>التخصص:</Text><Text style={styles.summaryValue}>{formData.specialization}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>الرقم التسلسلي:</Text><Text style={[styles.summaryValue, { color: '#1E40AF', fontWeight: '800' }]}>{serialNumber}</Text></View>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backStepBtn} onPress={prevStep}><Ionicons name="arrow-back" size={20} color="#64748B" /><Text style={styles.backStepText}>السابق</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.registerBtn, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.registerText}>✅ إنشاء الحساب</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  header: { padding: 20, paddingTop: 50, paddingBottom: 30, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '800', textAlign: 'right' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'right', marginTop: 4 },
  progressCard: { marginHorizontal: 20, marginTop: -16, backgroundColor: '#FFF', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 },
  progressBar: { height: 4, backgroundColor: '#10B981', borderRadius: 2, marginBottom: 14 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: '#1E40AF' },
  stepDotText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  stepsLabels: { flexDirection: 'row', justifyContent: 'space-around' },
  stepLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  stepLabelActive: { color: '#1E40AF', fontWeight: '700' },
  form: { padding: 20 },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', textAlign: 'right', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, fontSize: 15, color: '#1E293B', textAlign: 'right' },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 11, textAlign: 'right', marginTop: 4 },
  hintText: { color: '#94A3B8', fontSize: 10, textAlign: 'right', marginTop: 4 },
  passRow: { position: 'relative' }, passInput: { paddingRight: 50 },
  eyeIcon: { position: 'absolute', right: 12, top: 14, padding: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFF' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 28 },
  nextBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#1E40AF', padding: 16, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  backStepBtn: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 16, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8 },
  backStepText: { color: '#64748B', fontSize: 15, fontWeight: '600' },
  registerBtn: { flex: 1, backgroundColor: '#10B981', padding: 16, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  registerText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  serialCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 16, padding: 16, gap: 14, marginBottom: 20, borderWidth: 2, borderColor: '#DBEAFE' },
  serialLabel: { fontSize: 11, color: '#64748B' }, serialValue: { fontSize: 22, fontWeight: '800', color: '#1E40AF', letterSpacing: 2 },
  imageBox: { width: 160, height: 160, borderRadius: 24, alignSelf: 'center', overflow: 'hidden', marginBottom: 20, borderWidth: 3, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  profileImg: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  imagePlaceholderText: { color: '#94A3B8', fontSize: 12, marginTop: 8 },
  guidelines: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  guidelinesTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 12 },
  guideItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 8 },
  guideText: { fontSize: 12, color: '#64748B' }, guideTextRed: { fontSize: 12, color: '#EF4444' },
  summary: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  summaryLabel: { fontSize: 12, color: '#64748B' }, summaryValue: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  
  // Success Screen
  successContainer: { flex: 1 }, successBg: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  confetti: { position: 'absolute', borderRadius: 4 },
  successContent: { alignItems: 'center', paddingHorizontal: 30 },
  successIconContainer: { marginBottom: 24 },
  successIconRing: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(16,185,129,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(16,185,129,0.4)' },
  successIconInner: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  successTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 8, textAlign: 'center' },
  successSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginTop: 8, marginBottom: 24, textAlign: 'center' },
  successInfoCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 20, width: '100%', marginBottom: 20 },
  successInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  successInfoLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  successInfoValue: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  successInfoDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, gap: 8, marginBottom: 8 },
  pendingText: { color: '#f59e0b', fontSize: 14, fontWeight: '700' },
  pendingSubtext: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginBottom: 24 },
  loginRedirectBtn: { borderRadius: 14, overflow: 'hidden', width: '100%' },
  loginRedirectGradient: { flexDirection: 'row', padding: 16, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loginRedirectText: { color: '#FFF', fontSize: 15, fontWeight: '700' }
});