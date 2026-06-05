import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing, ActivityIndicator, Dimensions, RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { collection, getDocs, query, where, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getCurrentDay, getCurrentDayArabic, getCurrentTimeString } from '../../utils/timeValidator';

const { width } = Dimensions.get('window');

export default function AdminLiveAttendanceScreen({ navigation }) {
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);

  // Filters
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const statsAnims = useRef([]).current;
  const recordAnims = useRef({}).current;

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }).start();

      // Animate stats
      if (statsAnims.length > 0) {
        Animated.stagger(100, 
          statsAnims.map(anim => 
            Animated.spring(anim, {
              toValue: 1,
              friction: 8,
              tension: 40,
              useNativeDriver: true
            })
          )
        ).start();
      }
    }
  }, [loading]);

  const loadAllData = async () => {
    try {
      // جلب الحضور
      const attSnap = await getDocs(
        query(collection(db, 'attendance'), orderBy('timestamp', 'desc'))
      );
      const allAtt = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAttendance(allAtt);

      // جلب الجدول
      const schedulesSnap = await getDocs(collection(db, 'schedules'));
      setSchedules(schedulesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // جلب المواد
      const coursesSnap = await getDocs(collection(db, 'courses'));
      setCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // جلب المستخدمين
      const usersSnap = await getDocs(collection(db, 'users'));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData();
  }, []);

  // تطبيق الفلاتر
  const getFilteredAttendance = () => {
    let filtered = [...attendance];

    // فلتر التاريخ
    if (selectedDate) {
      filtered = filtered.filter(a => a.date === selectedDate);
    }

    // فلتر الدفعة
    if (selectedBatch !== 'all') {
      filtered = filtered.filter(a => a.studentBatch === selectedBatch);
    }

    // فلتر المادة
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(a => 
        a.courseId === selectedCourse || 
        a.courseName === selectedCourse
      );
    }

    // فلتر الحالة
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(a => a.attendanceStatus === selectedStatus);
    }

    return filtered;
  };

  const filteredData = getFilteredAttendance();

  // إحصائيات
  const stats = {
    total: filteredData.length,
    present: filteredData.filter(a => a.attendanceStatus === 'present').length,
    late: filteredData.filter(a => a.attendanceStatus === 'late' || a.attendanceStatus === 'very_late').length,
    uniqueStudents: [...new Set(filteredData.map(a => a.studentId))].length,
    uniqueCourses: [...new Set(filteredData.map(a => a.courseName || a.courseId))].length
  };

  // قوائم الفلاتر
  const batches = ['all', ...new Set(attendance.map(a => a.studentBatch).filter(Boolean))];
  const courseNames = ['all', ...new Set(attendance.map(a => a.courseName || a.courseId).filter(Boolean))];
  const statuses = [
    { value: 'all', label: 'الكل', color: '#64748B' },
    { value: 'present', label: 'حاضر', color: '#10B981' },
    { value: 'late', label: 'متأخر', color: '#F59E0B' },
    { value: 'very_late', label: 'متأخر جداً', color: '#EF4444' }
  ];

  // Loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>جاري تحميل سجل الحضور...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>📋 سجل الحضور</Text>
          <Text style={styles.headerDate}>
            {getCurrentDayArabic()} - {getCurrentTimeString()}
          </Text>
        </View>
      </Animated.View>

      {/* Stats Bar */}
      <Animated.View style={[styles.statsBar, { opacity: fadeAnim }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clipboard-check" size={20} color="#1E40AF" />
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLabel}>تسجيل</Text>
          </View>
          <View style={[styles.statItem, styles.statItemBorder]}>
            <MaterialCommunityIcons name="account-check" size={20} color="#10B981" />
            <Text style={[styles.statNum, { color: '#10B981' }]}>{stats.present}</Text>
            <Text style={styles.statLabel}>حاضر</Text>
          </View>
          <View style={[styles.statItem, styles.statItemBorder]}>
            <MaterialCommunityIcons name="clock-alert" size={20} color="#F59E0B" />
            <Text style={[styles.statNum, { color: '#F59E0B' }]}>{stats.late}</Text>
            <Text style={styles.statLabel}>متأخر</Text>
          </View>
          <View style={[styles.statItem, styles.statItemBorder]}>
            <FontAwesome5 name="users" size={16} color="#8B5CF6" />
            <Text style={[styles.statNum, { color: '#8B5CF6' }]}>{stats.uniqueStudents}</Text>
            <Text style={styles.statLabel}>طالب</Text>
          </View>
          <View style={[styles.statItem, styles.statItemBorder]}>
            <MaterialCommunityIcons name="book-open" size={20} color="#EC4899" />
            <Text style={[styles.statNum, { color: '#EC4899' }]}>{stats.uniqueCourses}</Text>
            <Text style={styles.statLabel}>مادة</Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {/* تاريخ */}
          <TouchableOpacity style={styles.filterActive}>
            <Ionicons name="calendar" size={14} color="#FFF" />
            <Text style={styles.filterActiveText}>{selectedDate}</Text>
          </TouchableOpacity>

          {/* الدفعات */}
          {batches.map(batch => (
            <TouchableOpacity
              key={batch}
              style={[
                styles.filterChip,
                selectedBatch === batch && styles.filterChipActive
              ]}
              onPress={() => setSelectedBatch(batch)}
            >
              <Text style={[
                styles.filterText,
                selectedBatch === batch && styles.filterTextActive
              ]}>
                {batch === 'all' ? '🌐 الكل' : `دفعة ${batch}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {/* الحالة */}
          {statuses.map(status => (
            <TouchableOpacity
              key={status.value}
              style={[
                styles.filterChip,
                selectedStatus === status.value && { 
                  backgroundColor: status.color,
                  borderColor: status.color
                }
              ]}
              onPress={() => setSelectedStatus(status.value)}
            >
              <Text style={[
                styles.filterText,
                selectedStatus === status.value && styles.filterTextActive
              ]}>
                {status.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* المواد */}
          {courseNames.slice(0, 5).map(course => (
            <TouchableOpacity
              key={course}
              style={[
                styles.filterChip,
                selectedCourse === course && styles.filterChipActive
              ]}
              onPress={() => setSelectedCourse(course)}
            >
              <Text 
                style={[
                  styles.filterText,
                  selectedCourse === course && styles.filterTextActive
                ]}
                numberOfLines={1}
              >
                {course === 'all' ? '📚 الكل' : course}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Attendance List */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-off" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>لا توجد سجلات</Text>
            <Text style={styles.emptySubtitle}>لا توجد سجلات حضور تطابق الفلاتر المحددة</Text>
          </View>
        ) : (
          filteredData.map((record, index) => (
            <Animated.View
              key={record.id || index}
              style={[
                styles.recordCard,
                { opacity: fadeAnim }
              ]}
            >
              {/* Status Indicator */}
              <View style={[
                styles.statusIndicator,
                record.attendanceStatus === 'present' && { backgroundColor: '#10B981' },
                record.attendanceStatus === 'late' && { backgroundColor: '#F59E0B' },
                record.attendanceStatus === 'very_late' && { backgroundColor: '#EF4444' }
              ]} />

              {/* Record Content */}
              <View style={styles.recordContent}>
                <View style={styles.recordMain}>
                  <Text style={styles.recordName}>{record.studentName || 'طالب'}</Text>
                  <Text style={styles.recordCourse}>{record.courseName || record.courseId}</Text>
                  
                  <View style={styles.recordDetails}>
                    {record.studentBatch && (
                      <View style={styles.detailChip}>
                        <Text style={styles.detailChipText}>دفعة {record.studentBatch}</Text>
                      </View>
                    )}
                    {record.doctorName && (
                      <View style={styles.detailChip}>
                        <FontAwesome5 name="chalkboard-teacher" size={10} color="#64748B" />
                        <Text style={styles.detailChipText}>{record.doctorName}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.recordRight}>
                  <View style={[
                    styles.statusBadge,
                    record.attendanceStatus === 'present' && { backgroundColor: '#D1FAE5' },
                    record.attendanceStatus === 'late' && { backgroundColor: '#FEF3C7' },
                    record.attendanceStatus === 'very_late' && { backgroundColor: '#FEE2E2' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      record.attendanceStatus === 'present' && { color: '#065F46' },
                      record.attendanceStatus === 'late' && { color: '#92400E' },
                      record.attendanceStatus === 'very_late' && { color: '#991B1B' }
                    ]}>
                      {record.statusText || (record.attendanceStatus === 'present' ? 'حاضر' : 'متأخر')}
                    </Text>
                  </View>
                  <Text style={styles.recordDate}>{record.date}</Text>
                  <Text style={styles.recordTime}>{record.time}</Text>
                </View>
              </View>

              {/* Generated By */}
              {record.generatedBy && (
                <View style={styles.generatedBy}>
                  <Ionicons 
                    name={record.generatedBy === 'leader' ? 'ribbon' : 'person'} 
                    size={12} 
                    color="#94A3B8" 
                  />
                  <Text style={styles.generatedByText}>
                    {record.generatedBy === 'leader' ? 'سجل بواسطة قائد الدفعة' : 'سجل بواسطة الدكتور'}
                  </Text>
                </View>
              )}
            </Animated.View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4FF'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B'
  },

  // Header
  header: {
    backgroundColor: '#1E293B',
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  headerContent: {
    alignItems: 'flex-end'
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800'
  },
  headerDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4
  },

  // Stats Bar
  statsBar: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
    minWidth: 70
  },
  statItemBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9'
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2
  },

  // Filters
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 8
  },
  filterRow: {
    marginBottom: 8
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginRight: 6
  },
  filterChipActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF'
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  filterTextActive: {
    color: '#FFF'
  },
  filterActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#10B981',
    marginRight: 6,
    gap: 4
  },
  filterActiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF'
  },

  // List
  listContainer: {
    flex: 1,
    paddingHorizontal: 16
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginTop: 20
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center'
  },

  // Record Card
  recordCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2
  },
  statusIndicator: {
    width: 4,
    backgroundColor: '#94A3B8'
  },
  recordContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14
  },
  recordMain: {
    flex: 1,
    marginRight: 10
  },
  recordName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right',
    marginBottom: 4
  },
  recordCourse: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'right',
    marginBottom: 6
  },
  recordDetails: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    flexWrap: 'wrap'
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4
  },
  detailChipText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500'
  },
  recordRight: {
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700'
  },
  recordDate: {
    fontSize: 12,
    color: '#64748B'
  },
  recordTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2
  },
  generatedBy: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  generatedByText: {
    fontSize: 10,
    color: '#94A3B8'
  }
});