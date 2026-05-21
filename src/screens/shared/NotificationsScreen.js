import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, RefreshControl } from 'react-native';
import { sendLocalNotification, sendGradeNotification, sendLectureReminder, sendPaymentReminder, cancelAllNotifications } from '../../services/notifications';

export default function NotificationsScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);

  const notifications = [
    { id: 1, title: '📊 نتيجة جديدة', message: 'تم رفع نتيجة مادة الرياضيات: 85 درجة', time: 'منذ 10 دقائق', type: 'grade', read: false },
    { id: 2, title: '📅 تذكير بمحاضرة', message: 'برمجة - 10:00 صباحاً - معمل 1', time: 'منذ 30 دقيقة', type: 'lecture', read: false },
    { id: 3, title: '💰 تذكير بدفع', message: 'عليك دفعة بقيمة 5,000 ج.م قبل 2027-01-15', time: 'منذ ساعتين', type: 'payment', read: true },
    { id: 4, title: '✅ تسجيل الحضور', message: 'تم تسجيل حضورك في محاضرة الفيزياء', time: 'منذ 3 ساعات', type: 'attendance', read: true },
    { id: 5, title: '🎓 مرحباً بك', message: 'أهلاً بك في جامعة إمبريال! نتمنى لك فصلاً موفقاً', time: 'منذ يومين', type: 'welcome', read: true },
  ];

  const typeStyles = {
    grade: { bg: '#D1FAE5', text: '#059669', icon: '📊' },
    lecture: { bg: '#EEF2FF', text: '#1E40AF', icon: '📅' },
    payment: { bg: '#FFF7ED', text: '#D97706', icon: '💰' },
    attendance: { bg: '#F0FDF4', text: '#10B981', icon: '✅' },
    welcome: { bg: '#EDE9FE', text: '#7C3AED', icon: '🎓' },
  };

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const testNotification = () => {
    sendLocalNotification('🧪 إشعار تجريبي', 'هذا إشعار تجريبي من جامعة إمبريال');
  };

  const testGradeNotification = () => {
    sendGradeNotification('الفيزياء', 92);
  };

  const testLectureReminder = () => {
    sendLectureReminder('برمجة متقدمة', '2:00 مساءً', 'معمل 3');
  };

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E40AF']} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>◎ الإشعارات</Text>
        <Text style={styles.headerSub}>{notifications.filter(n => !n.read).length} غير مقروءة</Text>
      </View>

      {/* أزرار اختبار الإشعارات */}
      <View style={styles.testSection}>
        <Text style={styles.testTitle}>🔔 إشعارات تجريبية</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.testRow}>
          <TouchableOpacity style={styles.testBtn} onPress={testNotification}>
            <Text style={styles.testBtnText}>🧪 إشعار عام</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.testBtn, { backgroundColor: '#D1FAE5' }]} onPress={testGradeNotification}>
            <Text style={[styles.testBtnText, { color: '#059669' }]}>📊 نتيجة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.testBtn, { backgroundColor: '#EEF2FF' }]} onPress={testLectureReminder}>
            <Text style={[styles.testBtnText, { color: '#1E40AF' }]}>📅 محاضرة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.testBtn, { backgroundColor: '#FFF7ED' }]} onPress={() => sendPaymentReminder('5,000', '2027-01-15')}>
            <Text style={[styles.testBtnText, { color: '#D97706' }]}>💰 دفعة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.testBtn, { backgroundColor: '#FEE2E2' }]} onPress={cancelAllNotifications}>
            <Text style={[styles.testBtnText, { color: '#DC2626' }]}>🗑️ حذف الكل</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {notifications.map((item, i) => (
        <Animated.View key={item.id} style={[styles.card, !item.read && styles.cardUnread, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.cardInner} activeOpacity={0.8}>
            <View style={[styles.iconBox, { backgroundColor: typeStyles[item.type]?.bg || '#F1F5F9' }]}>
              <Text style={styles.icon}>{typeStyles[item.type]?.icon || '🔔'}</Text>
            </View>
            <View style={styles.content}>
              <View style={styles.topRow}>
                <Text style={[styles.title, !item.read && styles.titleUnread]}>{item.title}</Text>
                {!item.read && <View style={styles.dot} />}
              </View>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  header: { backgroundColor: '#1E40AF', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 22, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 2 },
  testSection: { marginHorizontal: 16, marginBottom: 16 },
  testTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 8 },
  testRow: { flexDirection: 'row' },
  testBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FFF', marginRight: 8, borderWidth: 1.5, borderColor: '#E2E8F0' },
  testBtnText: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  card: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardUnread: { borderRightWidth: 4, borderRightColor: '#1E40AF' },
  cardInner: { flexDirection: 'row', padding: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  icon: { fontSize: 18 },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '600', color: '#64748B', textAlign: 'right' },
  titleUnread: { color: '#1E293B', fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E40AF' },
  message: { fontSize: 13, color: '#64748B', textAlign: 'right', marginBottom: 6, lineHeight: 20 },
  time: { fontSize: 11, color: '#94A3B8', textAlign: 'right' },
});