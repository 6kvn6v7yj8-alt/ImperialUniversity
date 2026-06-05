import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// التحقق من دعم البيومترك
export async function checkBiometricSupport() {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    let type = 'بصمة الإصبع';
    if (Platform.OS === 'ios') {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        type = 'Face ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.TOUCH_ID)) {
        type = 'Touch ID';
      }
    }
    
    return {
      available: compatible && enrolled,
      type: type,
      hasFacial: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
      hasFingerprint: types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
    };
  } catch (error) {
    return { available: false, type: 'غير متوفر', hasFacial: false, hasFingerprint: false };
  }
}

// المصادقة البيومترية
export async function authenticateWithBiometrics() {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'تأكيد هويتك للدخول للتطبيق',
      cancelLabel: 'إلغاء',
      disableDeviceFallback: true, // منع الرجوع للرقم السري
      fallbackLabel: '',
    });
    return { success: result.success, error: result.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// حفظ بيانات الدخول بعد أول تسجيل ناجح
export async function saveLoginCredentials(email, password) {
  try {
    await AsyncStorage.setItem('biometric_email', email);
    await AsyncStorage.setItem('biometric_password', password);
    await AsyncStorage.setItem('biometric_enabled', 'true');
    return true;
  } catch (error) {
    return false;
  }
}

// استرجاع بيانات الدخول المحفوظة
export async function getSavedCredentials() {
  try {
    const email = await AsyncStorage.getItem('biometric_email');
    const password = await AsyncStorage.getItem('biometric_password');
    const enabled = await AsyncStorage.getItem('biometric_enabled');
    if (email && password && enabled === 'true') {
      return { email, password };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// حذف بيانات الدخول المحفوظة
export async function clearSavedCredentials() {
  await AsyncStorage.removeItem('biometric_email');
  await AsyncStorage.removeItem('biometric_password');
  await AsyncStorage.setItem('biometric_enabled', 'false');
}

// التحقق من تفعيل البيومترك
export async function isBiometricEnabled() {
  const enabled = await AsyncStorage.getItem('biometric_enabled');
  return enabled === 'true';
}