import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Animated, TouchableOpacity } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Colors, Shadows, Radius } from '../../theme';

export default function ScheduleScreen({ navigation }) {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'schedules'));
      setSchedule(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>▦ الجدول الدراسي</Text>
        <Text style={styles.headerSub}>الفصل الدراسي الحالي</Text>
      </View>

      {schedule.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>▦</Text>
          <Text style={styles.emptyText}>لا يوجد جدول حالياً</Text>
        </View>
      ) : (
        schedule.map((item, i) => (
          <Animated.View key={item.id} style={[styles.card, { opacity: fadeAnim }]}>
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <Text style={styles.cardIcon}>▦</Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardRow}>
                <Text style={styles.day}>{item.day}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={styles.subject}>{item.subject}</Text>
              <Text style={styles.room}>📍 {item.room}</Text>
            </View>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  header: { backgroundColor: '#1E40AF', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 22, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 2 },
  empty: { backgroundColor: 'rgba(255,255,255,0.7)', margin: 16, borderRadius: Radius.lg, padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 40, color: '#1E40AF', marginBottom: 10 },
  emptyText: { fontSize: 15, color: '#64748B', fontWeight: '600' },
  card: { backgroundColor: 'rgba(255,255,255,0.7)', marginHorizontal: 16, marginBottom: 10, borderRadius: Radius.md, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', ...Shadows.glass },
  cardLeft: { marginRight: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(30,64,175,0.08)', justifyContent: 'center', alignItems: 'center' },
  cardIcon: { fontSize: 16, color: '#1E40AF' },
  cardContent: { flex: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  day: { fontSize: 14, fontWeight: '700', color: '#1E40AF' },
  time: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  subject: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 2 },
  room: { fontSize: 12, color: '#94A3B8', textAlign: 'right' },
});