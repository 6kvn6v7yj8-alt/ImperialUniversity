import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, RefreshControl, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query, where, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { sendLocalNotification, sendGradeNotification, sendLectureReminder, sendPaymentReminder, cancelAllNotifications } from '../../services/notifications';

export default function NotificationsScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // جلب إشعارات من Firestore
      const snap = await getDocs(
        query(
          collection(db, 'notifications'),
          orderBy('sentAt', 'desc'),
          limit(50)
        )
      );
      
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(notifs);
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const typeStyles = {
    grade: { bg: '#D1FAE5', text: '#059669', icon: 'stats-chart' },
    lecture: { bg: '#EEF2FF', text: '#1E40AF', icon: 'calendar' },
    payment: { bg: '#FFF7ED', text: '#D97706', icon: 'wallet' },
    attendance: { bg: '#F0FDF4', text: '#10B981', icon: 'checkmark-circle' },
    welcome: { bg: '#EDE9FE', text: '#7C3AED', icon: 'happy' },
    general: { bg: '#F1F5F9', text: '#475569', icon: 'notifications' },
    urgent: { bg: '#FEE2E2', text: '#DC2626', icon: 'warning' },
    activation: { bg: '#D1FAE5', text: '#059669', icon: 'checkmark-circle' },
  };

  const testNotification = () => {
    sendLocalNotification('🧪 إشعار تجريبي', 'هذا إشعار تجريبي من Imperial University');
    Alert.alert('✅ تم', 'تم إرسال إشعار تجريبي');
  };

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} />}
    >
      {/* Header */}
      <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🔔 الإشعارات</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{unreadCount} غير مقروءة</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Test Buttons */}
      <Animated.View style={[styles.testSection, { opacity: fadeAnim }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testRow}>
          <TouchableOpacity style={styles.testBtn} onPress={testNotification}>
            <Ionicons name="notifications" size={16} color="#1E40AF" />
            <Text style={styles.testBtnText}>تجريبي</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.testBtn, { backgroundColor: '#D1FAE5' }]} onPress={() => sendGradeNotification('الرياضيات', 95)}>
            <Ionicons name="stats-chart" size={16} color="#059669" />
            <Text style={[styles.testBtnText, { color: '#059669' }]}>نتيجة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.testBtn, { backgroundColor: '#EEF2FF' }]} onPress={() => sendLectureReminder('برمجة', '10:00', 'معمل 1')}>
            <Ionicons name="calendar" size={16} color="#1E40AF" />
            <Text style={[styles.testBtnText, { color: '#1E40AF' }]}>محاضرة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.testBtn, { backgroundColor: '#FEE2E2' }]} onPress={cancelAllNotifications}>
            <Ionicons name="trash" size={16} color="#DC2626" />
            <Text style={[styles.testBtnText, { color: '#DC2626' }]}>مسح الكل</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
          <Ionicons name="notifications-off" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>لا توجد إشعارات</Text>
          <Text style={styles.emptySub}>ستظهر الإشعارات هنا عند وصولها</Text>
        </Animated.View>
      ) : (
        notifications.map((item, index) => {
          const style = typeStyles[item.type] || typeStyles.general;
          return (
            <Animated.View 
              key={item.id} 
              style={[
                styles.card, 
                !item.read && styles.cardUnread,
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.cardInner} 
                activeOpacity={0.7}
                onPress={() => markAsRead(item.id)}
              >
                <View style={[styles.iconBox, { backgroundColor: style.bg }]}>
                  <Ionicons name={style.icon} size={20} color={style.text} />
                </View>
                <View style={styles.content}>
                  <View style={styles.topRow}>
                    <Text style={[styles.title, !item.read && styles.titleUnread]}>
                      {item.title || 'إشعار'}
                    </Text>
                    {!item.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.message} numberOfLines={2}>
                    {item.body || item.message || ''}
                  </Text>
                  <Text style={styles.time}>
                    {item.sentAt ? new Date(item.sentAt).toLocaleString('ar-SA', { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    }) : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  
  header: { padding: 20, paddingTop: 50, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerContent: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'right' },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  headerBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },

  testSection: { paddingHorizontal: 16, marginBottom: 12, marginTop: 16 },
  testRow: { gap: 8 },
  testBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FFF', gap: 6, borderWidth: 1.5, borderColor: '#E2E8F0' },
  testBtnText: { fontSize: 12, fontWeight: '600', color: '#1E293B' },

  emptyState: { alignItems: 'center', padding: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginTop: 14 },
  emptySub: { fontSize: 13, color: '#94A3B8', marginTop: 6 },

  card: { 
    backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 10, 
    borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 
  },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: '#1E40AF', backgroundColor: '#F8FAFF' },
  cardInner: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 14, fontWeight: '600', color: '#64748B', textAlign: 'right', flex: 1 },
  titleUnread: { color: '#1E293B', fontWeight: '700' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1E40AF', marginLeft: 8 },
  message: { fontSize: 13, color: '#64748B', textAlign: 'right', marginBottom: 8, lineHeight: 20 },
  time: { fontSize: 11, color: '#94A3B8', textAlign: 'right' },
});