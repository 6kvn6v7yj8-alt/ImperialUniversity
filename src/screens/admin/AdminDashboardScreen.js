import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function AdminDashboardScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>لوحة التحكم</Text>
        <Text style={styles.subtitle}>مدير النظام</Text>
      </View>

      <Text style={styles.sectionTitle}>إدارة البيانات</Text>
      
      <View style={styles.menuList}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ManageCourses')}>
          <Text style={styles.menuIcon}>📚</Text>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>إدارة المواد</Text>
            <Text style={styles.menuSub}>إضافة وتعديل المواد الدراسية</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ManageSchedule')}>
          <Text style={styles.menuIcon}>📅</Text>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>إدارة الجدول</Text>
            <Text style={styles.menuSub}>إضافة وتعديل المحاضرات</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ManageGrades')}>
          <Text style={styles.menuIcon}>📊</Text>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>إدارة النتائج</Text>
            <Text style={styles.menuSub}>رفع وتعديل الدرجات</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ManageLibrary')}>
          <Text style={styles.menuIcon}>📖</Text>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>إدارة المكتبة</Text>
            <Text style={styles.menuSub}>إضافة الكتب والمراجع</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('SendNotification')}>
          <Text style={styles.menuIcon}>🔔</Text>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>إرسال إشعارات</Text>
            <Text style={styles.menuSub}>إرسال إشعارات للمستخدمين</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.menuItemHighlight]} onPress={() => navigation.navigate('AdminViewAttendance')}>
          <Text style={styles.menuIcon}>📋</Text>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>سجل الحضور الشامل</Text>
            <Text style={styles.menuSub}>عرض وتصدير جميع سجلات الحضور</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  header: { backgroundColor: '#1E293B', padding: 24, paddingTop: 50, paddingBottom: 32, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  greeting: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'right' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', padding: 16, paddingBottom: 8, textAlign: 'right' },
  menuList: { padding: 16, paddingTop: 0 },
  menuItem: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center' },
  menuItemHighlight: { borderLeftWidth: 4, borderLeftColor: '#10B981' },
  menuIcon: { fontSize: 28, marginLeft: 16 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', textAlign: 'right' },
  menuSub: { fontSize: 12, color: '#64748B', textAlign: 'right', marginTop: 4 },
  logoutButton: { margin: 16, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
});