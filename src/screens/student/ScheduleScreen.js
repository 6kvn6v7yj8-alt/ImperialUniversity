import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Animated, TouchableOpacity } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Colors, Shadows, Radius } from '../../theme';

export default function ScheduleScreen({ navigation }) {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('الكل');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const daysList = ['الكل', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'schedules'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // ترتيب حسب اليوم والساعة (دي بس الترتيب مش تغيير في الهيكل)
      const dayOrder = { 'الأحد': 0, 'الإثنين': 1, 'الثلاثاء': 2, 'الأربعاء': 3, 'الخميس': 4 };
      const sortedData = [...data].sort((a, b) => {
        const dayCompare = (dayOrder[a.day] || 5) - (dayOrder[b.day] || 5);
        if (dayCompare !== 0) return dayCompare;
        const timeA = parseInt(a.time?.split(':')[0]) || 0;
        const timeB = parseInt(b.time?.split(':')[0]) || 0;
        return timeA - timeB;
      });
      
      setSchedule(sortedData);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSchedule = () => {
    if (selectedDay === 'الكل') return schedule;
    return schedule.filter(item => item.day === selectedDay);
  };

  const filteredSchedule = getFilteredSchedule();

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

      {/* Filter أيام */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterContainer}>
          {daysList.map((day) => (
            <TouchableOpacity
              key={day}
              style={[styles.filterChip, selectedDay === day && styles.filterChipActive]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.filterText, selectedDay === day && styles.filterTextActive]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {filteredSchedule.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>▦</Text>
          <Text style={styles.emptyText}>لا يوجد جدول حالياً</Text>
        </View>
      ) : (
        filteredSchedule.map((item, i) => (
          <Animated.View 
            key={item.id} 
            style={[
              styles.card, 
              { 
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              }
            ]}
          >
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
  filterScroll: { marginBottom: 8 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  filterChip: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  filterChipActive: { backgroundColor: '#1E40AF' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#1E40AF' },
  filterTextActive: { color: '#FFF' },
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