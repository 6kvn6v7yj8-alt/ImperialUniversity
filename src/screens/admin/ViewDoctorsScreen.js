import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function ViewDoctorsScreen({ navigation }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const doctorsList = allUsers.filter(u => u.role === 'doctor');
      setDoctors(doctorsList);
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
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>👨‍🏫 الدكاترة</Text>
        <Text style={styles.subtitle}>{doctors.length} دكتور</Text>
      </View>

      {doctors.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👨‍🏫</Text>
          <Text style={styles.emptyText}>لا يوجد دكاترة</Text>
        </View>
      ) : (
        doctors.map((doctor, i) => (
          <Animated.View key={doctor.id} style={[styles.card, { opacity: fadeAnim }]}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{doctor.name?.charAt(0) || 'د'}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.doctorName}>{doctor.name || 'غير معروف'}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>التخصص:</Text>
                <Text style={styles.infoValue}>{doctor.specialization || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>رقم الهاتف:</Text>
                <Text style={styles.infoValue}>{doctor.phone || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>تاريخ التسجيل:</Text>
                <Text style={styles.infoValue}>{doctor.createdAt || '-'}</Text>
              </View>
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
  header: { backgroundColor: '#1E40AF', padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  backBtn: { marginBottom: 8 },
  backText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  title: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'right', marginTop: 8 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'right' },
  empty: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#94A3B8' },
  card: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  avatarBox: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(30,64,175,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#1E40AF' },
  cardContent: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 12, color: '#64748B' },
  infoValue: { fontSize: 12, fontWeight: '600', color: '#1E293B' },
});