import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing, ActivityIndicator, Dimensions, RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { getStudentAttendance, calculateAttendanceStats } from '../../services/attendanceService';
import { getBatchTodayLectures } from '../../services/lectureService';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function StudentWarningsScreen({ navigation }) {
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [coursesData, setCoursesData] = useState([]);
  const [selectedTab, setSelectedTab] = useState('all'); // all, danger, safe

  // Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const progressAnims = useRef({}).current;
  const cardAnims = useRef({}).current;

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        }),
        Animated.spring(headerAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true
        })
      ]).start();

      // Animate cards one by one
      warnings.forEach((warning, index) => {
        if (!cardAnims[warning.courseName]) {
          cardAnims[warning.courseName] = new Animated.Value(0);
        }
        Animated.timing(cardAnims[warning.courseName], {
          toValue: 1,
          duration: 400,
          delay: index * 150,
          useNativeDriver: true
        }).start();

        // Animate progress bars
        if (!progressAnims[warning.courseName]) {
          progressAnims[warning.courseName] = new Animated.Value(0);
        }
        Animated.timing(progressAnims[warning.courseName], {
          toValue: warning.absencePercentage / 100,
          duration: 1000,
          delay: index * 150 + 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false
        }).start();
      });
    }
  }, [loading, warnings]);

  const loadAllData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // جلب بيانات الطالب
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      setStudentData(userData);

      // جلب سجل الحضور
      const attendanceResult = await getStudentAttendance(user.uid);
      const stats = attendanceResult.stats || {};

      // جلب المواد من الجدول
      const schedulesSnap = await getDocs(collection(db, 'schedules'));
      const allSchedules = schedulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // تصفية مواد الطالب حسب الدفعة
      const studentBatch = userData.batch;
      const studentSchedules = allSchedules.filter(
        s => s.batch === studentBatch || s.batch === 'all'
      );

      // تجميع المواد مع عدد المحاضرات
      const courseMap = {};
      studentSchedules.forEach(schedule => {
        const courseName = schedule.courseName || schedule.subject;
        if (!courseName) return;
        
        if (!courseMap[courseName]) {
          courseMap[courseName] = {
            name: courseName,
            totalLectures: 0,
            attendedLectures: 0,
            absentLectures: 0
          };
        }
        courseMap[courseName].totalLectures++;
      });

      // حساب الحضور لكل مادة
      if (attendanceResult.records) {
        attendanceResult.records.forEach(record => {
          const courseName = record.courseName || record.courseId;
          if (courseMap[courseName]) {
            if (record.attendanceStatus === 'present') {
              courseMap[courseName].attendedLectures++;
            } else {
              courseMap[courseName].absentLectures++;
            }
          }
        });
      }

      // حساب الغياب وإنشاء التحذيرات
      const warningsList = [];
      Object.values(courseMap).forEach(course => {
        // إذا لم توجد محاضرات مسجلة، نفترض أن الطالب غاب عن الكل
        const totalScheduled = course.totalLectures || 16; // افتراضي 16 محاضرة
        const attended = course.attendedLectures;
        const absent = totalScheduled - attended;
        const absencePercentage = Math.round((absent / totalScheduled) * 100);

        let level = 'safe';
        let icon = '✅';
        let color = '#10B981';
        let bgColor = '#D1FAE5';
        let message = '';
        let action = '';

        if (absencePercentage >= 25) {
          level = 'banned';
          icon = '🚫';
          color = '#EF4444';
          bgColor = '#FEE2E2';
          message = 'حرمان من الامتحان النهائي';
          action = 'يجب مراجعة شؤون الطلاب فوراً';
        } else if (absencePercentage >= 20) {
          level = 'danger';
          icon = '⚠️';
          color = '#F59E0B';
          bgColor = '#FEF3C7';
          message = 'إنذار أخير قبل الحرمان';
          action = 'لا يمكنك التغيب أكثر من ذلك';
        } else if (absencePercentage >= 15) {
          level = 'warning';
          icon = '⚡';
          color = '#3B82F6';
          bgColor = '#DBEAFE';
          message = 'تنبيه - نسبة الغياب مرتفعة';
          action = 'يجب تحسين نسبة الحضور';
        } else if (absencePercentage >= 10) {
          level = 'notice';
          icon = '📢';
          color = '#8B5CF6';
          bgColor = '#EDE9FE';
          message = 'ملاحظة - بداية ارتفاع الغياب';
          action = 'انتبه لنسبة حضورك';
        }

        warningsList.push({
          courseName: course.name,
          attended,
          absent,
          total: totalScheduled,
          absencePercentage,
          attendancePercentage: 100 - absencePercentage,
          level,
          icon,
          color,
          bgColor,
          message,
          action
        });
      });

      // ترتيب: الأخطر أولاً
      warningsList.sort((a, b) => b.absencePercentage - a.absencePercentage);

      setWarnings(warningsList);
      setAttendanceStats(stats);
      setCoursesData(Object.values(courseMap));

    } catch (error) {
      console.error('Error loading warnings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData();
  }, []);

  // تصفية التحذيرات
  const filteredWarnings = selectedTab === 'all' 
    ? warnings 
    : selectedTab === 'danger'
      ? warnings.filter(w => w.level === 'banned' || w.level === 'danger')
      : warnings.filter(w => w.level === 'safe' || w.level === 'notice');

  // إحصائيات
  const dangerCount = warnings.filter(w => w.level === 'banned' || w.level === 'danger').length;
  const totalAbsences = warnings.reduce((sum, w) => sum + w.absent, 0);
  const totalAttendances = warnings.reduce((sum, w) => sum + w.attended, 0);

  // Loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>جاري تحليل الحضور والغياب...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { 
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, 0]
        })}]
      }]}>
        <LinearGradient
          colors={dangerCount > 0 ? ['#DC2626', '#991B1B'] : ['#1E40AF', '#1E3A5F']}
          style={styles.headerGradient}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              {dangerCount > 0 ? '⚠️ نظام الإنذارات' : '📊 متابعة الحضور'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {studentData?.name || 'طالب'} - {studentData?.batch || ''}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Stats Cards */}
      <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
        <View style={[styles.statCard, { backgroundColor: '#FFF' }]}>
          <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
          <Text style={styles.statNum}>{totalAttendances}</Text>
          <Text style={styles.statLabel}>حضور</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#FFF' }]}>
          <MaterialCommunityIcons name="close-circle" size={24} color="#EF4444" />
          <Text style={[styles.statNum, { color: '#EF4444' }]}>{totalAbsences}</Text>
          <Text style={styles.statLabel}>غياب</Text>
        </View>
        
        <View style={[styles.statCard, { 
          backgroundColor: dangerCount > 0 ? '#FEF2F2' : '#FFF' 
        }]}>
          <FontAwesome5 name="exclamation-triangle" size={20} color={dangerCount > 0 ? '#EF4444' : '#10B981'} />
          <Text style={[styles.statNum, { 
            color: dangerCount > 0 ? '#EF4444' : '#10B981' 
          }]}>
            {dangerCount}
          </Text>
          <Text style={styles.statLabel}>إنذارات</Text>
        </View>
      </Animated.View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
            onPress={() => setSelectedTab('all')}
          >
            <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
              🌐 الكل
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'danger' && styles.tabActiveDanger]}
            onPress={() => setSelectedTab('danger')}
          >
            <Text style={[styles.tabText, selectedTab === 'danger' && styles.tabTextActive]}>
              ⚠️ إنذارات ({dangerCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'safe' && styles.tabActiveSafe]}
            onPress={() => setSelectedTab('safe')}
          >
            <Text style={[styles.tabText, selectedTab === 'safe' && styles.tabTextActive]}>
              ✅ آمنة
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Warnings List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Info Card */}
        <Animated.View style={[styles.infoCard, { opacity: fadeAnim }]}>
          <View style={styles.infoHeader}>
            <MaterialCommunityIcons name="information" size={20} color="#1E40AF" />
            <Text style={styles.infoTitle}>نظام الإنذارات</Text>
          </View>
          <View style={styles.infoRules}>
            <View style={styles.ruleRow}>
              <View style={[styles.ruleDot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={styles.ruleText}>غياب 10% = 📢 ملاحظة</Text>
            </View>
            <View style={styles.ruleRow}>
              <View style={[styles.ruleDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.ruleText}>غياب 15% = ⚡ تنبيه</Text>
            </View>
            <View style={styles.ruleRow}>
              <View style={[styles.ruleDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.ruleText}>غياب 20% = ⚠️ إنذار أخير</Text>
            </View>
            <View style={styles.ruleRow}>
              <View style={[styles.ruleDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.ruleText}>غياب 25% = 🚫 حرمان من الامتحان</Text>
            </View>
          </View>
        </Animated.View>

        {/* Empty State */}
        {filteredWarnings.length === 0 && (
          <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
            <MaterialCommunityIcons name="emoticon-happy" size={64} color="#10B981" />
            <Text style={styles.emptyTitle}>لا توجد إنذارات</Text>
            <Text style={styles.emptySubtitle}>نسبة حضورك ممتازة! استمر 👍</Text>
          </Animated.View>
        )}

        {/* Warning Cards */}
        {filteredWarnings.map((warning, index) => {
          const cardAnim = cardAnims[warning.courseName] || new Animated.Value(1);
          const progressAnim = progressAnims[warning.courseName] || new Animated.Value(0);

          return (
            <Animated.View
              key={warning.courseName}
              style={[
                styles.warningCard,
                {
                  opacity: cardAnim,
                  transform: [
                    { 
                      translateY: cardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0]
                      })
                    },
                    { scale: cardAnim }
                  ],
                  borderLeftColor: warning.color
                }
              ]}
            >
              {/* Header */}
              <View style={styles.warningHeader}>
                <View style={[styles.levelBadge, { backgroundColor: warning.bgColor }]}>
                  <Text style={styles.levelIcon}>{warning.icon}</Text>
                  <Text style={[styles.levelText, { color: warning.color }]}>
                    {warning.level === 'banned' ? 'حرمان' :
                     warning.level === 'danger' ? 'إنذار أخير' :
                     warning.level === 'warning' ? 'تنبيه' : 'ملاحظة'}
                  </Text>
                </View>
                <Text style={styles.courseName}>{warning.courseName}</Text>
              </View>

              {/* Message */}
              <View style={[styles.messageBox, { backgroundColor: warning.bgColor }]}>
                <Text style={[styles.messageText, { color: warning.color }]}>
                  {warning.message}
                </Text>
                {warning.action && (
                  <Text style={styles.actionText}>{warning.action}</Text>
                )}
              </View>

              {/* Stats */}
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{warning.attended}</Text>
                  <Text style={styles.statItemLabel}>حضر</Text>
                </View>
                <View style={[styles.statItem, styles.statItemCenter]}>
                  <Text style={[styles.statValue, { color: '#EF4444' }]}>{warning.absent}</Text>
                  <Text style={styles.statItemLabel}>غاب</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{warning.total}</Text>
                  <Text style={styles.statItemLabel}>إجمالي</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>نسبة الغياب</Text>
                  <Text style={[styles.progressPercent, { color: warning.color }]}>
                    {warning.absencePercentage}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  {/* Background with gradient */}
                  <View style={styles.progressBg}>
                    <View style={[styles.progressSafe, { width: '75%' }]} />
                    <View style={[styles.progressWarning, { width: '15%' }]} />
                    <View style={[styles.progressDanger, { width: '10%' }]} />
                  </View>
                  {/* Actual Progress */}
                  <Animated.View style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      }),
                      backgroundColor: warning.color
                    }
                  ]} />
                  {/* Warning Markers */}
                  <View style={[styles.marker, { left: '75%' }]} />
                  <View style={[styles.marker, { left: '85%' }]} />
                  <View style={[styles.marker, { left: '90%' }]} />
                </View>
              </View>

              {/* Attendance Percentage */}
              <View style={styles.attendanceSummary}>
                <Text style={styles.attendanceLabel}>نسبة الحضور:</Text>
                <Text style={[styles.attendanceValue, { 
                  color: warning.attendancePercentage >= 75 ? '#10B981' : 
                         warning.attendancePercentage >= 60 ? '#F59E0B' : '#EF4444' 
                }]}>
                  {warning.attendancePercentage}%
                </Text>
              </View>
            </Animated.View>
          );
        })}

        <View style={{ height: 30 }} />
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
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden'
  },
  headerGradient: {
    padding: 20,
    paddingTop: 50
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
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
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 4
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -20,
    gap: 10,
    marginBottom: 16
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },

  // Tabs
  tabsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFF',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0'
  },
  tabActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF'
  },
  tabActiveDanger: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444'
  },
  tabActiveSafe: {
    backgroundColor: '#10B981',
    borderColor: '#10B981'
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  tabTextActive: {
    color: '#FFF'
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 12
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B'
  },
  infoRules: {
    gap: 6
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8
  },
  ruleDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  ruleText: {
    fontSize: 12,
    color: '#64748B'
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4
  },

  // Warning Card
  warningCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4
  },
  levelIcon: {
    fontSize: 14
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700'
  },
  courseName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10
  },

  // Message
  messageBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 14
  },
  messageText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 4
  },
  actionText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right'
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12
  },
  statItem: {
    alignItems: 'center',
    flex: 1
  },
  statItemCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0'
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B'
  },
  statItemLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2
  },

  // Progress
  progressSection: {
    marginBottom: 10
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  progressLabel: {
    fontSize: 11,
    color: '#64748B'
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700'
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    position: 'relative',
    overflow: 'hidden'
  },
  progressBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row'
  },
  progressSafe: {
    backgroundColor: '#D1FAE5'
  },
  progressWarning: {
    backgroundColor: '#FEF3C7'
  },
  progressDanger: {
    backgroundColor: '#FEE2E2'
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    position: 'absolute',
    top: 0,
    left: 0
  },
  marker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(0,0,0,0.2)'
  },

  // Attendance Summary
  attendanceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  attendanceLabel: {
    fontSize: 12,
    color: '#64748B'
  },
  attendanceValue: {
    fontSize: 18,
    fontWeight: '800'
  }
});