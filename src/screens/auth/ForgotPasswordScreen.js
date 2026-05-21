import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>استعادة كلمة المرور</Text>
      <Text style={styles.subtitle}>أدخل بريدك الإلكتروني لإرسال رابط الاستعادة</Text>
      
      <TextInput style={styles.input} placeholder="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#94A3B8" textAlign="right" />
      
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>إرسال رابط الاستعادة</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>العودة لتسجيل الدخول</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: '#FFFFFF', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'right' },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 32, textAlign: 'right' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, color: '#0F172A' },
  button: { backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  link: { color: '#2563EB', textAlign: 'center', fontSize: 14 },
});