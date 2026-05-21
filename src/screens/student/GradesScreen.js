import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Animated, TouchableOpacity } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Colors, Shadows, Radius } from '../../theme';

export default function GradesScreen({ navigation }) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'grades'));
      setGrades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerGlass}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>النتائج</Text>
        </View>
      </View>

      {grades.length === 0 ? (
        <View style={styles.emptyGlass}>
          <Text style={styles.emptyIcon}>◧</Text>
          <Text style={styles.emptyText}>لا توجد نتائج حالياً</Text>
        </View>
      ) : (
        grades.map((grade, i) => (
          <Animated.View key={grade.id} style={[styles.cardGlass, { opacity: fadeAnim }]}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNum}>{grade.score}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.subject}>{grade.subject}</Text>
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeText}>{grade.grade}</Text>
              </View>
            </View>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F3FF' },
  header: { backgroundColor: '#6366F1', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 16 },
  headerGlass: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.md, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  backBtn: { alignSelf: 'flex-end', marginBottom: 4 },
  backText: { fontSize: 18, color: '#FFF', fontWeight: '700' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  emptyGlass: { backgroundColor: 'rgba(255,255,255,0.5)', margin: 16, borderRadius: Radius.lg, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  emptyIcon: { fontSize: 40, color: '#6366F1', marginBottom: 10 },
  emptyText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  cardGlass: { backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 16, marginBottom: 10, borderRadius: Radius.md, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', ...Shadows.glass },
  scoreCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(99,102,241,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  scoreNum: { fontSize: 18, fontWeight: '800', color: '#6366F1' },
  cardContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subject: { fontSize: 16, fontWeight: '700', color: '#1E1B4B', textAlign: 'right' },
  gradeBadge: { backgroundColor: 'rgba(99,102,241,0.08)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  gradeText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
});