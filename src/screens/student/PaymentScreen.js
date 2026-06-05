import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function PaymentScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 30, useNativeDriver: true })
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💰 نظام الدفع الالكتروني</Text>
        <Text style={styles.headerSub}>نظام المدفوعات</Text>
      </LinearGradient>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.iconRing}>
            <View style={styles.iconInner}>
              <MaterialCommunityIcons name="bank" size={64} color="#FFF" />
            </View>
          </View>
        </Animated.View>

        <Text style={styles.title}>🚧 تحت التطوير</Text>
        <Text style={styles.subtitle}>
          نظام الدفع اللكتروني قيد التطوير حالياً.{'\n'}
          سيتم إطلاق هذه الميزة قريباً.
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={18} color="#1E40AF" />
            <Text style={styles.infoText}>
              يمكنك متابعة المصروفات من خلال شؤون الطلاب أو التواصل مع الإدارة المالية.
            </Text>
          </View>
        </View>

        <View style={styles.featuresPreview}>
          <Text style={styles.featuresTitle}>المميزات القادمة:</Text>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.featureText}>عرض المدفوعات السابقة</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.featureText}>الدفع الإلكتروني</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.featureText}>إشعارات مواعيد الدفع</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.featureText}>كشف حساب تفصيلي</Text>
          </View>
        </View>
      </Animated.View>

      {/* Footer */}
      <Animated.Text style={[styles.footer, { opacity: fadeAnim }]}>
        شكراً لصبركم - فريق Imperial University
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },

  header: { padding: 20, paddingTop: 50, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'right' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'right', marginTop: 4 },

  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },

  iconContainer: { marginBottom: 28 },
  iconRing: { width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(30,64,175,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(30,64,175,0.15)' },
  iconInner: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1E40AF', justifyContent: 'center', alignItems: 'center' },

  title: { fontSize: 26, fontWeight: '900', color: '#1E293B', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 24, marginBottom: 24 },

  infoCard: { backgroundColor: '#EEF2FF', borderRadius: 16, padding: 16, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: '#DBEAFE' },
  infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoText: { fontSize: 13, color: '#1E40AF', flex: 1, textAlign: 'right', lineHeight: 22, fontWeight: '500' },

  featuresPreview: { width: '100%', backgroundColor: '#FFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#E2E8F0' },
  featuresTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 14 },
  featureItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingVertical: 6 },
  featureText: { fontSize: 13, color: '#64748B' },

  footer: { textAlign: 'center', paddingBottom: 30, color: '#94A3B8', fontSize: 12 },
});