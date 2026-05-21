import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Animated } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { sendLocalNotification } from '../../services/notifications';

const nationalities = ['سعودي', 'مصري', 'إماراتي', 'كويتي', 'قطري', 'بحريني', 'عماني', 'أردني', 'فلسطيني', 'لبناني', 'سوري', 'عراقي', 'يمني', 'ليبي', 'تونسي', 'جزائري', 'مغربي', 'سوداني', 'أمريكي', 'بريطاني', 'فرنسي', 'ألماني', 'كندي', 'أسترالي', 'هندي', 'باكستاني', 'أخرى'];
const specializations = ['طب', 'صيدلة', 'أسنان', 'مختبرات', 'تمريض'];
const batches = ['A', 'B', 'C', 'D'];

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [batch, setBatch] = useState('A');
  const [email, setEmail] = useState('');
  const [nationality, setNationality] = useState('سعودي');
  const [specialization, setSpecialization] = useState('طب');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [step]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('تنبيه', 'نحتاج صلاحية الوصول للصور'); return; }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      setImage('data:image/jpeg;base64,' + base64);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword || !nationalId || !phone) {
      Alert.alert('تنبيه', 'جميع الحقول إجبارية');
      return;
    }
    if (password !== confirmPassword) { Alert.alert('خطأ', 'كلمة المرور غير متطابقة'); return; }
    if (password.length < 6) { Alert.alert('خطأ', '6 أحرف على الأقل'); return; }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name, nationalId, phone, batch, email, nationality, specialization, password,
        role: 'student', photo: image || '', uid: userCredential.user.uid,
        createdAt: new Date().toISOString().split('T')[0],
      });

      await sendLocalNotification('🎓 تم إنشاء الحساب', 'مرحباً ' + name + '! تم تسجيلك في جامعة إمبريال بنجاح.');

      Alert.alert('✅ تم بنجاح', 'تم إنشاء الحساب', [{ text: 'حسناً', onPress: () => navigation.navigate('Login') }]);
    } catch (error) {
      const msgs = { 'auth/email-already-in-use': 'البريد مستخدم بالفعل', 'auth/invalid-email': 'بريد غير صالح' };
      Alert.alert('خطأ', msgs[error.code] || error.message);
    } finally { setLoading(false); }
  };

  const nextStep = () => {
    if (step === 1 && (!name || !nationalId || !phone)) { Alert.alert('تنبيه', 'املأ البيانات أولاً'); return; }
    setStep(step + 1);
  };

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => step === 1 ? navigation.goBack() : setStep(step - 1)}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>

        <Text style={styles.title}>إنشاء حساب جديد</Text>
        <Text style={styles.subtitle}>انضم إلى جامعة إمبريال</Text>

        <View style={styles.stepsRow}>
          {[1, 2, 3].map(s => (
            <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]}>
              <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
            </View>
          ))}
        </View>

        {step === 1 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {image ? <Image source={{ uri: image }} style={styles.image} /> : <View style={styles.imagePlaceholder}><Text style={styles.cameraIcon}>📷</Text><Text style={styles.imageText}>اختر صورة</Text></View>}
            </TouchableOpacity>
            <TextInput style={styles.input} placeholder="الاسم الكامل *" value={name} onChangeText={setName} placeholderTextColor="#94A3B8" textAlign="right" />
            <TextInput style={styles.input} placeholder="رقم الهوية *" value={nationalId} onChangeText={setNationalId} keyboardType="number-pad" placeholderTextColor="#94A3B8" textAlign="right" />
            <TextInput style={styles.input} placeholder="رقم الهاتف *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#94A3B8" textAlign="right" />
            <Text style={styles.label}>الدفعة</Text>
            <View style={styles.row}>
              {batches.map(b => (
                <TouchableOpacity key={b} style={[styles.opt, batch === b && styles.optActive]} onPress={() => setBatch(b)}>
                  <Text style={[styles.optText, batch === b && styles.optTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.btn} onPress={nextStep}><Text style={styles.btnText}>التالي ←</Text></TouchableOpacity>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <TextInput style={styles.input} placeholder="البريد الإلكتروني *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#94A3B8" textAlign="right" />
            <Text style={styles.label}>الجنسية</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
              {nationalities.map(n => (
                <TouchableOpacity key={n} style={[styles.chip, nationality === n && styles.chipActive]} onPress={() => setNationality(n)}>
                  <Text style={[styles.chipText, nationality === n && styles.chipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.label}>التخصص</Text>
            <View style={styles.row}>
              {specializations.map(s => (
                <TouchableOpacity key={s} style={[styles.opt, specialization === s && styles.optActive]} onPress={() => setSpecialization(s)}>
                  <Text style={[styles.optText, specialization === s && styles.optTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.btn} onPress={nextStep}><Text style={styles.btnText}>التالي ←</Text></TouchableOpacity>
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <TextInput style={styles.input} placeholder="كلمة المرور *" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#94A3B8" textAlign="right" />
            <TextInput style={styles.input} placeholder="تأكيد كلمة المرور *" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholderTextColor="#94A3B8" textAlign="right" />
            <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>✅ إنشاء الحساب</Text>}
            </TouchableOpacity>
          </Animated.View>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>لديك حساب؟ سجل دخول</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 24, paddingTop: 50, paddingBottom: 60 },
  backBtn: { alignSelf: 'flex-end', marginBottom: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F1F5F9' },
  backText: { fontSize: 14, color: '#4F46E5', fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '800', color: '#1E293B', textAlign: 'right', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'right', marginBottom: 24 },
  stepsRow: { flexDirection: 'row', justifyContent: 'center', gap: 32, marginBottom: 28 },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: '#4F46E5' },
  stepNum: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  stepNumActive: { color: '#FFF' },
  label: { fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: 'right', marginBottom: 8, marginTop: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 14, color: '#1E293B' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  opt: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0' },
  optActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  optText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  optTextActive: { color: '#4F46E5' },
  scrollRow: { marginBottom: 14, maxHeight: 50 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', marginRight: 8 },
  chipActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  chipText: { fontSize: 12, color: '#64748B' },
  chipTextActive: { color: '#4F46E5', fontWeight: '700' },
  imagePicker: { width: 110, height: 110, borderRadius: 28, alignSelf: 'center', marginBottom: 24, overflow: 'hidden', borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center', height: '100%' },
  cameraIcon: { fontSize: 28, marginBottom: 2 },
  imageText: { fontSize: 10, color: '#94A3B8' },
  btn: { backgroundColor: '#4F46E5', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 12, marginBottom: 16, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  btnDisabled: { backgroundColor: '#A5B4FC' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  link: { color: '#4F46E5', textAlign: 'center', fontSize: 14, fontWeight: '600' },
});