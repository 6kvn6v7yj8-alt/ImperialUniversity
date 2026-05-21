import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function CoursesScreen() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'courses'));
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const colors = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📚 المواد الدراسية</Text>
        <Text style={styles.headerSub}>{courses.length} مواد</Text>
      </View>

      {courses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>لا توجد مواد حالياً</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {courses.map((course, i) => (
            <Animated.View key={course.id} style={[styles.card, { borderTopColor: colors[i % colors.length], opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
              <Text style={[styles.code, { color: colors[i % colors.length] }]}>{course.code}</Text>
              <Text style={styles.name}>{course.name}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.info}>👨‍🏫 {course.doctor}</Text>
                <Text style={styles.info}>🕐 {course.hours} ساعة</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  header: { backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingTop: 55, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 4 },
  empty: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#94A3B8', fontWeight: '600' },
  grid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderTopWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3, marginBottom: 4 },
  code: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  name: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 10, marginTop: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  info: { fontSize: 12, color: '#64748B' },
});