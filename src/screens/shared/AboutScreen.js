import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Animated, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function AboutScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const featureAnims = useRef([...Array(7)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 4, tension: 30, useNativeDriver: true })
    ]).start();

    // تحريك المميزات واحدة واحدة
    featureAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 400 + i * 100,
        useNativeDriver: true
      }).start();
    });
  }, []);

  const features = [
    { icon: 'id-card-outline', label: 'بطاقة جامعية إلكترونية', color: '#3B82F6' },
    { icon: 'calendar-outline', label: 'الجدول الدراسي', color: '#10B981' },
    { icon: 'library-outline', label: 'المكتبة الرقمية', color: '#8B5CF6' },
    { icon: 'qr-code-outline', label: 'تسجيل الحضور بـ QR Code', color: '#F59E0B' },
    { icon: 'stats-chart-outline', label: 'النتائج والتقديرات', color: '#EC4899' },
    { icon: 'chatbubbles-outline', label: 'الدعم الفني المباشر', color: '#6366F1' },
    { icon: 'notifications-outline', label: 'الإشعارات الفورية', color: '#EF4444' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#1E40AF', '#3B82F6', '#6366F1']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ℹ️ عن التطبيق</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Logo Section */}
      <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
        <View style={styles.logoContainer}>
          <View style={styles.logoRing}>
            <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
        </View>
        <Text style={styles.appName}>IMPERIAL UNIVERSITY</Text>
        <Text style={styles.appNameAr}>كلية إمبريال الجامعية</Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>الإصدار 1.0.0</Text>
        </View>
      </Animated.View>

      {/* عن التطبيق */}
      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideUp }] }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="information-circle" size={22} color="#1E40AF" />
          <Text style={styles.cardTitle}>عن التطبيق</Text>
        </View>
        <Text style={styles.cardText}>
          التطبيق الرسمي لكلية إمبريال الجامعية للطلاب وأعضاء هيئة التدريس. يوفر خدمات متكاملة تشمل الجدول الدراسي، المكتبة الرقمية، تسجيل الحضور، النتائج، والتواصل مع الدعم الفني.
        </Text>
      </Animated.View>

      {/* المميزات */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="star" size={22} color="#F59E0B" />
          <Text style={styles.cardTitle}>المميزات</Text>
        </View>
        {features.map((item, i) => (
          <Animated.View 
            key={i} 
            style={[
              styles.featureRow,
              {
                opacity: featureAnims[i],
                transform: [{ translateX: featureAnims[i].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }]
              }
            ]}
          >
            <View style={[styles.featureIconBox, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <Text style={styles.featureText}>{item.label}</Text>
          </Animated.View>
        ))}
      </Animated.View>

      {/* فريق التطوير */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="code-slash" size={22} color="#8B5CF6" />
          <Text style={styles.cardTitle}>فريق التطوير</Text>
        </View>
        <View style={styles.teamRow}>
          <View style={styles.teamAvatar}>
            <FontAwesome5 name="laptop-code" size={20} color="#8B5CF6" />
          </View>
          <Text style={styles.cardText}>
            تم تطوير هذا التطبيق بواسطة فريق Imperial University College التقني. نسعى دائماً لتقديم أفضل تجربة رقمية لطلابنا وأعضاء هيئة التدريس.
          </Text>
        </View>
      </Animated.View>

      {/* تواصل معنا */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="mail" size={22} color="#10B981" />
          <Text style={styles.cardTitle}>تواصل معنا</Text>
        </View>
        
        <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('mailto:info@imperial.edu')} activeOpacity={0.7}>
          <View style={[styles.contactIconBox, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="mail-outline" size={20} color="#059669" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>البريد الإلكتروني</Text>
            <Text style={styles.contactValue}>info@imperial.edu</Text>
          </View>
          <Ionicons name="open-outline" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('https://imperial.edu')} activeOpacity={0.7}>
          <View style={[styles.contactIconBox, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="globe-outline" size={20} color="#1E40AF" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>الموقع الإلكتروني</Text>
            <Text style={styles.contactValue}>www.imperial.edu</Text>
          </View>
          <Ionicons name="open-outline" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('tel:+966500000000')} activeOpacity={0.7}>
          <View style={[styles.contactIconBox, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="call-outline" size={20} color="#D97706" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>الهاتف</Text>
            <Text style={styles.contactValue}>+966 50 000 0000</Text>
          </View>
          <Ionicons name="open-outline" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Image source={require('../../../assets/logo.png')} style={styles.footerLogo} resizeMode="contain" />
        <Text style={styles.footerTitle}>IMPERIAL UNIVERSITY</Text>
        <Text style={styles.footerSub}>كلية إمبريال الجامعية</Text>
        <Text style={styles.footerText}>© 2026 جميع الحقوق محفوظة</Text>
      </Animated.View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  
  header: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },

  logoSection: { alignItems: 'center', paddingVertical: 20 },
  logoContainer: { marginBottom: 14 },
  logoRing: { width: 90, height: 90, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6, padding: 10 },
  logo: { width: '100%', height: '100%' },
  appName: { fontSize: 20, fontWeight: '900', color: '#1E40AF', letterSpacing: 3, marginTop: 8 },
  appNameAr: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginTop: 4 },
  versionBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, marginTop: 10 },
  versionText: { fontSize: 12, fontWeight: '600', color: '#1E40AF' },

  card: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 14, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  cardText: { fontSize: 13, color: '#64748B', textAlign: 'right', lineHeight: 22, flex: 1 },

  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12, justifyContent: 'flex-end' },
  featureIconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  featureText: { fontSize: 13, fontWeight: '500', color: '#1E293B', textAlign: 'right' },

  teamRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  teamAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center' },

  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12 },
  contactIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 11, color: '#94A3B8', textAlign: 'right' },
  contactValue: { fontSize: 13, fontWeight: '600', color: '#1E293B', textAlign: 'right' },

  footer: { alignItems: 'center', paddingVertical: 20 },
  footerLogo: { width: 50, height: 50, borderRadius: 12, marginBottom: 10, backgroundColor: '#FFF', padding: 6 },
  footerTitle: { fontSize: 14, fontWeight: '800', color: '#94A3B8', letterSpacing: 2 },
  footerSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  footerText: { fontSize: 11, color: '#CBD5E1', marginTop: 8 },
});