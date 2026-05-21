import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';

export default function PaymentScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const payments = [
    { id: 1, name: 'رسوم الفصل الدراسي الأول', amount: '5,000', status: 'paid', date: '2026-09-15' },
    { id: 2, name: 'رسوم المختبرات', amount: '1,200', status: 'paid', date: '2026-09-20' },
    { id: 3, name: 'رسوم الكتب', amount: '800', status: 'pending', date: '2026-10-01' },
    { id: 4, name: 'رسوم الفصل الدراسي الثاني', amount: '5,000', status: 'pending', date: '2027-01-15' },
  ];

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 المصروفات</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#D1FAE5' }]}>
          <Text style={styles.summaryLabel}>✅ تم الدفع</Text>
          <Text style={[styles.summaryAmount, { color: '#059669' }]}>6,200 ج.م</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#FEE2E2' }]}>
          <Text style={styles.summaryLabel}>⏳ متبقي</Text>
          <Text style={[styles.summaryAmount, { color: '#DC2626' }]}>5,800 ج.م</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>سجل المدفوعات</Text>

      {payments.map((item, i) => (
        <Animated.View key={item.id} style={[styles.card, { opacity: fadeAnim }]}>
          <View style={styles.cardLeft}>
            <View style={[styles.statusDot, { backgroundColor: item.status === 'paid' ? '#10B981' : '#F59E0B' }]} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.paymentName}>{item.name}</Text>
            <Text style={styles.paymentDate}>{item.date}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.paymentAmount}>{item.amount} ج.م</Text>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'paid' ? '#D1FAE5' : '#FFF7ED' }]}>
              <Text style={[styles.statusText, { color: item.status === 'paid' ? '#059669' : '#D97706' }]}>
                {item.status === 'paid' ? 'تم الدفع ✓' : 'معلق ⏳'}
              </Text>
            </View>
          </View>
        </Animated.View>
      ))}

      <TouchableOpacity style={styles.payBtn} activeOpacity={0.9}>
        <Text style={styles.payBtnText}>💳 ادفع الآن</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingTop: 55, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  summaryRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 18, padding: 18, alignItems: 'center' },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  summaryAmount: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', textAlign: 'right', paddingHorizontal: 16, marginBottom: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, marginHorizontal: 16, marginBottom: 10, flexDirection: 'row', padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3 },
  cardLeft: { marginRight: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  cardContent: { flex: 1 },
  paymentName: { fontSize: 15, fontWeight: '600', color: '#1E293B', textAlign: 'right' },
  paymentDate: { fontSize: 12, color: '#94A3B8', textAlign: 'right', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  paymentAmount: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  payBtn: { backgroundColor: '#4F46E5', marginHorizontal: 16, marginVertical: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  payBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});