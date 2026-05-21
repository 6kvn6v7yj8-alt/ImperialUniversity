import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

export default function OTPScreen() {
  const [otp, setOtp] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>تأكيد الرمز</Text>
      <Text style={styles.subtitle}>أدخل الرمز المرسل إلى بريدك الإلكتروني</Text>
      
      <TextInput
        style={styles.input}
        placeholder="000000"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        placeholderTextColor="#94A3B8"
      />
      
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>تأكيد</Text>
      </TouchableOpacity>
      
      <TouchableOpacity>
        <Text style={styles.link}>إعادة إرسال الرمز</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: '#FFFFFF', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'right' },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 32, textAlign: 'right' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 24, marginBottom: 16, color: '#0F172A', letterSpacing: 8, textAlign: 'center' },
  button: { backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  link: { color: '#2563EB', textAlign: 'center', fontSize: 14 },
});