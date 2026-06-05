import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function ViewLeadersScreen({ navigation }) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { fetchLeaders(); }, []);

  const fetchLeaders = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeaders(allUsers.filter(u => u.role === 'leader'));
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (error) { console.log('Error:', error); }
    finally { setLoading(false); }
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#1E40AF" /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>← رجوع</Text></TouchableOpacity>
        <Text style={styles.title}>◆ قادة الدفعات</Text>
        <Text style={styles.sub}>{leaders.length} قائد</Text>
      </View>
      {leaders.length === 0 ? (
        <View style={styles.empty}><Text>لا يوجد</Text></View>
      ) : (
        leaders.map((l, i) => (
          <Animated.View key={l.id} style={[styles.card, { opacity: fadeAnim }]}>
            <View style={styles.av}><Text style={styles.avT}>{l.name?.charAt(0) || 'ق'}</Text></View>
            <View style={styles.cc}>
              <Text style={styles.name}>{l.name}</Text>
              <Text style={styles.info}>دفعة: {l.batch || '-'}</Text>
              <Text style={styles.info}>تخصص: {l.specialization || '-'}</Text>
              <Text style={styles.info}>هاتف: {l.phone || '-'}</Text>
            </View>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1E40AF', padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  backBtn: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  title: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'right', marginTop: 8 },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'right' },
  empty: { alignItems: 'center', padding: 40 },
  card: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  av: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(245,158,11,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avT: { fontSize: 18, fontWeight: '700', color: '#F59E0B' },
  cc: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 4 },
  info: { fontSize: 11, color: '#64748B', textAlign: 'right' },
});