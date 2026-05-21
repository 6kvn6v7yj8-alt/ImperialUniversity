import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

export default function QRCodeScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const qrData = JSON.parse(data);
      
      const now = Date.now();
      if (now - qrData.timestamp > 45000) {
        Alert.alert('⏰ منتهي', 'انتهت صلاحية QR Code', [
          { text: 'حسناً', onPress: () => setScanned(false) }
        ]);
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        Alert.alert('خطأ', 'الرجاء تسجيل الدخول');
        setScanned(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      await addDoc(collection(db, 'attendance'), {
        studentId: user.uid,
        studentName: userData.name || 'طالب',
        studentEmail: user.email,
        studentBatch: userData.batch || '',
        courseId: qrData.courseId,
        courseName: qrData.courseName,
        courseCode: qrData.courseCode || '',
        qrCode: qrData.code,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString(),
      });

      Alert.alert('✅ تم', `تم تسجيل حضورك في ${qrData.courseName}`, [
        { text: 'حسناً', onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      console.log('QR Error:', error);
      Alert.alert('خطأ', 'QR غير صالح', [
        { text: 'حاول مرة أخرى', onPress: () => setScanned(false) }
      ]);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permission}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionText}>نحتاج صلاحية الكاميرا لمسح QR Code</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>منح الصلاحية</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📱 تسجيل الحضور</Text>
        <Text style={styles.subtitle}>وجه الكاميرا نحو QR Code</Text>
      </View>

      <View style={styles.scannerBox}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.scanText}>ضع QR Code داخل الإطار</Text>
          </View>
        </CameraView>
      </View>

      {scanned && (
        <View style={styles.scannedBox}>
          <Text style={styles.scannedIcon}>✅</Text>
          <Text style={styles.scannedText}>تم المسح بنجاح</Text>
          <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
            <Text style={styles.rescanText}>🔄 مسح مرة أخرى</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.backBtnBottom} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnBottomText}>← رجوع</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingTop: 50, paddingBottom: 16, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  scannerBox: { flex: 1, margin: 20, borderRadius: 24, overflow: 'hidden' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  scanFrame: { width: 240, height: 240 },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#1E40AF' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  scanText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginTop: 280 },
  scannedBox: { alignItems: 'center', padding: 20 },
  scannedIcon: { fontSize: 50, marginBottom: 10 },
  scannedText: { fontSize: 16, color: '#10B981', fontWeight: '700' },
  rescanBtn: { backgroundColor: '#1E40AF', marginHorizontal: 40, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  rescanText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  backBtnBottom: { alignSelf: 'center', marginBottom: 30, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  backBtnBottomText: { fontSize: 14, color: '#FFF' },
  permission: { flex: 1, backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center', padding: 20 },
  permissionIcon: { fontSize: 64, marginBottom: 16 },
  permissionText: { fontSize: 16, color: '#1E293B', marginBottom: 20, textAlign: 'center' },
  permissionBtn: { backgroundColor: '#1E40AF', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginBottom: 16 },
  permissionBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  backBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  backBtnText: { fontSize: 14, color: '#64748B' },
});