import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function BackButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.text}>← رجوع</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { alignSelf: 'flex-end', marginBottom: 12, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: '#F1F5F9' },
  text: { fontSize: 13, color: '#4F46E5', fontWeight: '700' },
});