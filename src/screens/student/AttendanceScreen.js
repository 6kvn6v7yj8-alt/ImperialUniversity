import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function AttendanceScreen() {
  const attendanceData = [
    { subject: 'رياضيات', attended: 12, total: 14, percentage: 86 },
    { subject: 'فيزياء', attended: 10, total: 14, percentage: 71 },
    { subject: 'برمجة', attended: 13, total: 14, percentage: 93 },
    { subject: 'إلكترونيات', attended: 8, total: 14, percentage: 57 },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>✅ الحضور والغياب</Text>
      {attendanceData.map((item, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.subject}>{item.subject}</Text>
            <Text style={[styles.percentage, { color: item.percentage >= 75 ? '#16A34A' : '#DC2626' }]}>
              {item.percentage}%
            </Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.fill, { width: `${item.percentage}%`, backgroundColor: item.percentage >= 75 ? '#16A34A' : '#DC2626' }]} />
          </View>
          <Text style={styles.detail}>
            حضر: {item.attended} / {item.total}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0F172A', textAlign: 'right', marginBottom: 16, marginTop: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subject: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  percentage: { fontSize: 18, fontWeight: '700' },
  bar: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 4 },
  fill: { height: 8, borderRadius: 4 },
  detail: { fontSize: 12, color: '#64748B', textAlign: 'right' },
});