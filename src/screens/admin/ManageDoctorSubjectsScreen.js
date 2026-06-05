import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Alert, ActivityIndicator, TextInput, Modal, RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { LinearGradient } from 'expo-linear-gradient';

const BATCHES = ['A', 'B', 'C', 'D'];
const DAYS = [
  { key: 'sunday', label: 'الأحد' },
  { key: 'monday', label: 'الإثنين' },
  { key: 'tuesday', label: 'الثلاثاء' },
  { key: 'wednesday', label: 'الأربعاء' },
  { key: 'thursday', label: 'الخميس' },
  { key: 'friday', label: 'الجمعة' },
  { key: 'saturday', label: 'السبت' }
];
const ROOMS = ['قاعة 101', 'قاعة 102', 'قاعة 201', 'قاعة 202', 'قاعة 301', 'معمل 1', 'معمل 2', 'معمل 3', 'مدرج 1', 'مدرج 2'];

export default function ManageDoctorSubjectsScreen({ navigation }) {
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorSubjects, setDoctorSubjects] = useState([]);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    subjectName: '',
    subjectCode: '',
    batch: 'A',
    day: '',
    startTime: '09:00',
    endTime: '10:30',
    room: 'قاعة 101',
    type: 'lecture'
  });

  // Bulk add state
  const [bulkBatch, setBulkBatch] = useState('A');
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
      ]).start();
    }
  }, [loading]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDoctors(allUsers.filter(u => u.role === 'doctor'));

      const coursesSnap = await getDocs(collection(db, 'courses'));
      setCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const schedulesSnap = await getDocs(collection(db, 'schedules'));
      setSchedules(schedulesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (error) {
      console.error('Error:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSelectDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    let subjects = [];
    if (doctor.subjects && Array.isArray(doctor.subjects) && doctor.subjects.length > 0) {
      subjects = doctor.subjects;
    } else if (doctor.subject) {
      subjects = [{
        id: 'sub_legacy_1',
        name: doctor.subject,
        code: doctor.subject,
        batch: doctor.batch || 'all',
        schedule: {}
      }];
    }
    setDoctorSubjects(subjects);
  };

  const openAddModal = () => {
    if (!selectedDoctor) {
      Alert.alert('تنبيه', 'يرجى اختيار دكتور أولاً');
      return;
    }
    setFormData({
      subjectName: '',
      subjectCode: '',
      batch: selectedDoctor.batch || 'A',
      day: '',
      startTime: '09:00',
      endTime: '10:30',
      room: 'قاعة 101',
      type: 'lecture'
    });
    setShowAddModal(true);
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);
    setFormData({
      subjectName: subject.name || '',
      subjectCode: subject.code || '',
      batch: subject.batch || 'A',
      day: subject.schedule?.day || '',
      startTime: subject.schedule?.startTime || '09:00',
      endTime: subject.schedule?.endTime || '10:30',
      room: subject.schedule?.room || 'قاعة 101',
      type: subject.schedule?.type || 'lecture'
    });
    setShowEditModal(true);
  };

  const openBulkModal = () => {
    if (!selectedDoctor) {
      Alert.alert('تنبيه', 'يرجى اختيار دكتور أولاً');
      return;
    }
    const avail = courses.filter(course => 
      !doctorSubjects.some(s => s.name === (course.name || course.subject))
    );
    setAvailableCourses(avail);
    setSelectedCourses([]);
    setBulkBatch(selectedDoctor.batch || 'A');
    setShowBulkModal(true);
  };

  const toggleCourseSelection = (course) => {
    setSelectedCourses(prev => {
      const exists = prev.find(c => c.id === course.id);
      if (exists) return prev.filter(c => c.id !== course.id);
      return [...prev, course];
    });
  };

  // إضافة مادة واحدة
  const handleAddSubject = async () => {
    if (!formData.subjectName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المادة');
      return;
    }
    if (!formData.day) {
      Alert.alert('خطأ', 'يرجى اختيار اليوم');
      return;
    }
    if (!selectedDoctor) {
      Alert.alert('خطأ', 'بيانات الدكتور غير متوفرة');
      return;
    }

    try {
      const newSubject = {
        id: `sub_${Date.now()}`,
        name: formData.subjectName.trim(),
        code: formData.subjectCode.trim() || formData.subjectName.trim(),
        batch: formData.batch,
        schedule: {
          day: formData.day,
          startTime: formData.startTime,
          endTime: formData.endTime,
          room: formData.room,
          type: formData.type
        }
      };

      const doctorRef = doc(db, 'users', selectedDoctor.id);
      const updatedSubjects = [...doctorSubjects, newSubject];
      await updateDoc(doctorRef, {
        subjects: updatedSubjects,
        updatedAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'schedules'), {
        courseName: newSubject.name,
        subject: newSubject.name,
        code: newSubject.code,
        batch: newSubject.batch,
        day: newSubject.schedule.day,
        dayOfWeek: newSubject.schedule.day,
        startTime: newSubject.schedule.startTime,
        endTime: newSubject.schedule.endTime,
        room: newSubject.schedule.room,
        type: newSubject.schedule.type,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        lectureStatus: 'scheduled',
        createdAt: new Date().toISOString()
      });

      setDoctorSubjects(updatedSubjects);
      setShowAddModal(false);
      Alert.alert('✅ تم', 'تم إضافة المادة بنجاح');
      loadAllData();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('خطأ', 'فشل في إضافة المادة');
    }
  };

  // إضافة جماعية
  const handleBulkAdd = async () => {
    if (selectedCourses.length === 0) {
      Alert.alert('تنبيه', 'يرجى اختيار مادة واحدة على الأقل');
      return;
    }

    try {
      const newSubjects = selectedCourses.map((course, index) => ({
        id: `sub_${Date.now()}_${index}`,
        name: course.name || course.subject,
        code: course.code || course.name || course.subject,
        batch: bulkBatch,
        schedule: {
          day: '',
          startTime: '09:00',
          endTime: '10:30',
          room: 'قاعة 101',
          type: 'lecture'
        }
      }));

      const allSubjects = [...doctorSubjects, ...newSubjects];
      const doctorRef = doc(db, 'users', selectedDoctor.id);
      await updateDoc(doctorRef, {
        subjects: allSubjects,
        updatedAt: new Date().toISOString()
      });

      for (const subject of newSubjects) {
        await addDoc(collection(db, 'schedules'), {
          courseName: subject.name,
          subject: subject.name,
          code: subject.code,
          batch: bulkBatch,
          day: '',
          dayOfWeek: '',
          startTime: '09:00',
          endTime: '10:30',
          room: 'قاعة 101',
          type: 'lecture',
          doctorId: selectedDoctor.id,
          doctorName: selectedDoctor.name,
          lectureStatus: 'scheduled',
          needsSchedule: true,
          createdAt: new Date().toISOString()
        });
      }

      setDoctorSubjects(allSubjects);
      setShowBulkModal(false);
      Alert.alert('✅ تم', `تم إضافة ${newSubjects.length} مادة بنجاح`);
      loadAllData();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('خطأ', 'فشل في الإضافة');
    }
  };

  // تعديل مادة
  const handleEditSubject = async () => {
    if (!editingSubject || !selectedDoctor) return;

    try {
      const updatedSubjects = doctorSubjects.map(s => {
        if (s.id === editingSubject.id) {
          return {
            ...s,
            name: formData.subjectName.trim(),
            code: formData.subjectCode.trim() || formData.subjectName.trim(),
            batch: formData.batch,
            schedule: {
              day: formData.day,
              startTime: formData.startTime,
              endTime: formData.endTime,
              room: formData.room,
              type: formData.type
            }
          };
        }
        return s;
      });

      const doctorRef = doc(db, 'users', selectedDoctor.id);
      await updateDoc(doctorRef, {
        subjects: updatedSubjects,
        updatedAt: new Date().toISOString()
      });

      // تحديث الجدول
      const relatedSchedules = schedules.filter(s => 
        s.doctorId === selectedDoctor.id && 
        (s.subject === editingSubject.name || s.courseName === editingSubject.name)
      );

      for (const schedule of relatedSchedules) {
        await updateDoc(doc(db, 'schedules', schedule.id), {
          courseName: formData.subjectName.trim(),
          subject: formData.subjectName.trim(),
          code: formData.subjectCode.trim(),
          batch: formData.batch,
          day: formData.day,
          dayOfWeek: formData.day,
          startTime: formData.startTime,
          endTime: formData.endTime,
          room: formData.room,
          type: formData.type,
          updatedAt: new Date().toISOString()
        });
      }

      setDoctorSubjects(updatedSubjects);
      setShowEditModal(false);
      setEditingSubject(null);
      Alert.alert('✅ تم', 'تم تعديل المادة بنجاح');
      loadAllData();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('خطأ', 'فشل في تعديل المادة');
    }
  };

  // حذف مادة
  const handleDeleteSubject = (subject) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل تريد حذف "${subject.name}" من مواد الدكتور؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedSubjects = doctorSubjects.filter(s => s.id !== subject.id);
              const doctorRef = doc(db, 'users', selectedDoctor.id);
              await updateDoc(doctorRef, {
                subjects: updatedSubjects,
                updatedAt: new Date().toISOString()
              });

              const schedulesToDelete = schedules.filter(s => 
                s.doctorId === selectedDoctor.id && 
                (s.subject === subject.name || s.courseName === subject.name)
              );

              for (const schedule of schedulesToDelete) {
                await deleteDoc(doc(db, 'schedules', schedule.id));
              }

              setDoctorSubjects(updatedSubjects);
              Alert.alert('✅ تم', 'تم حذف المادة بنجاح');
              loadAllData();
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('خطأ', 'فشل في حذف المادة');
            }
          }
        }
      ]
    );
  };

  // نموذج الإضافة/التعديل
  const renderForm = (onSubmit, submitLabel) => (
    <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.formLabel}>📚 اسم المادة *</Text>
      <TextInput
        style={styles.formInput}
        value={formData.subjectName}
        onChangeText={(t) => setFormData({...formData, subjectName: t})}
        placeholder="مثال: برمجة متقدمة"
        placeholderTextColor="#94A3B8"
      />

      <Text style={styles.formLabel}>🔢 كود المادة</Text>
      <TextInput
        style={styles.formInput}
        value={formData.subjectCode}
        onChangeText={(t) => setFormData({...formData, subjectCode: t})}
        placeholder="مثال: CS301"
        placeholderTextColor="#94A3B8"
      />

      <Text style={styles.formLabel}>👥 الدفعة</Text>
      <View style={styles.chipRow}>
        {BATCHES.map(batch => (
          <TouchableOpacity
            key={batch}
            style={[styles.chip, formData.batch === batch && styles.chipActive]}
            onPress={() => setFormData({...formData, batch})}
          >
            <Text style={[styles.chipText, formData.batch === batch && styles.chipTextActive]}>
              دفعة {batch}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.formLabel}>📅 اليوم *</Text>
      <View style={styles.chipRow}>
        {DAYS.map(day => (
          <TouchableOpacity
            key={day.key}
            style={[styles.chip, formData.day === day.key && styles.chipActive]}
            onPress={() => setFormData({...formData, day: day.key})}
          >
            <Text style={[styles.chipText, formData.day === day.key && styles.chipTextActive]}>
              {day.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeHalf}>
          <Text style={styles.formLabel}>🕐 البداية</Text>
          <TextInput
            style={styles.formInput}
            value={formData.startTime}
            onChangeText={(t) => setFormData({...formData, startTime: t})}
            placeholder="09:00"
            placeholderTextColor="#94A3B8"
          />
        </View>
        <View style={styles.timeHalf}>
          <Text style={styles.formLabel}>🕑 النهاية</Text>
          <TextInput
            style={styles.formInput}
            value={formData.endTime}
            onChangeText={(t) => setFormData({...formData, endTime: t})}
            placeholder="10:30"
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      <Text style={styles.formLabel}>🏛️ القاعة</Text>
      <View style={styles.chipRow}>
        {ROOMS.slice(0, 5).map(room => (
          <TouchableOpacity
            key={room}
            style={[styles.chip, formData.room === room && styles.chipActive]}
            onPress={() => setFormData({...formData, room})}
          >
            <Text style={[styles.chipText, formData.room === room && styles.chipTextActive]}>
              {room}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
        <Text style={styles.submitBtnText}>{submitLabel}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>👨‍🏫 إدارة مواد الدكاترة</Text>
        <Text style={styles.headerSub}>ربط الدكاترة بالمواد والجدول</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAllData(); }} />}
      >
        {!selectedDoctor ? (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={styles.sectionTitle}>👨‍🏫 اختر الدكتور</Text>
            {doctors.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome5 name="user-md" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>لا يوجد دكاترة</Text>
              </View>
            ) : (
              doctors.map(doctor => (
                <TouchableOpacity
                  key={doctor.id}
                  style={styles.doctorCard}
                  onPress={() => handleSelectDoctor(doctor)}
                  activeOpacity={0.8}
                >
                  <View style={styles.doctorAvatar}>
                    <Text style={styles.doctorAvatarText}>{doctor.name?.charAt(0) || 'د'}</Text>
                  </View>
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{doctor.name}</Text>
                    <Text style={styles.doctorEmail}>{doctor.email}</Text>
                    <Text style={styles.doctorSubCount}>
                      📚 {doctor.subjects?.length || (doctor.subject ? 1 : 0)} مواد
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#1E40AF" />
                </TouchableOpacity>
              ))
            )}
          </Animated.View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            <TouchableOpacity style={styles.backLink} onPress={() => setSelectedDoctor(null)}>
              <Ionicons name="arrow-back" size={20} color="#1E40AF" />
              <Text style={styles.backLinkText}>العودة لقائمة الدكاترة</Text>
            </TouchableOpacity>

            <View style={styles.selectedDocCard}>
              <View style={styles.docAvatarLg}>
                <Text style={styles.docAvatarLgText}>{selectedDoctor.name?.charAt(0) || 'د'}</Text>
              </View>
              <Text style={styles.docNameLg}>{selectedDoctor.name}</Text>
              <Text style={styles.docEmailLg}>{selectedDoctor.email}</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={styles.addBtnText}>إضافة مادة</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bulkBtn} onPress={openBulkModal}>
                <MaterialCommunityIcons name="playlist-plus" size={20} color="#FFF" />
                <Text style={styles.bulkBtnText}>إضافة سريعة</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>📚 مواد الدكتور ({doctorSubjects.length})</Text>

            {doctorSubjects.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="book-open-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>لا توجد مواد</Text>
                <Text style={styles.emptySub}>اضغط على "إضافة مادة" للبدء</Text>
              </View>
            ) : (
              doctorSubjects.map((subject, index) => (
                <View key={subject.id || index} style={styles.subjectCard}>
                  <View style={styles.subjectHeader}>
                    <View style={styles.subjectNameRow}>
                      <MaterialCommunityIcons name="book-open-variant" size={22} color="#1E40AF" />
                      <Text style={styles.subjectName}>{subject.name}</Text>
                    </View>
                    <View style={styles.subjectActions}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(subject)}>
                        <Ionicons name="pencil" size={18} color="#1E40AF" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteSubject(subject)}>
                        <Ionicons name="trash" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.subjectMeta}>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaText}>🏷️ {subject.batch === 'all' ? 'كل الدفعات' : `دفعة ${subject.batch}`}</Text>
                    </View>
                    {subject.schedule?.day && (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaText}>📅 {DAYS.find(d => d.key === subject.schedule.day)?.label}</Text>
                      </View>
                    )}
                    {subject.schedule?.startTime && (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaText}>🕐 {subject.schedule.startTime} - {subject.schedule.endTime}</Text>
                      </View>
                    )}
                    {subject.schedule?.room && (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaText}>🏛️ {subject.schedule.room}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </Animated.View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>➕ إضافة مادة جديدة</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            {renderForm(handleAddSubject, '✅ إضافة المادة')}
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ تعديل المادة</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); setEditingSubject(null); }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            {renderForm(handleEditSubject, '💾 حفظ التعديلات')}
          </View>
        </View>
      </Modal>

      {/* Bulk Modal */}
      <Modal visible={showBulkModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📦 إضافة سريعة</Text>
              <TouchableOpacity onPress={() => setShowBulkModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.formLabel}>👥 الدفعة</Text>
            <View style={styles.chipRow}>
              {BATCHES.map(batch => (
                <TouchableOpacity
                  key={batch}
                  style={[styles.chip, bulkBatch === batch && styles.chipActive]}
                  onPress={() => setBulkBatch(batch)}
                >
                  <Text style={[styles.chipText, bulkBatch === batch && styles.chipTextActive]}>دفعة {batch}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>📚 اختر المواد ({selectedCourses.length})</Text>
            <ScrollView style={styles.bulkList}>
              {availableCourses.length === 0 ? (
                <Text style={styles.emptyText}>لا توجد مواد متاحة</Text>
              ) : (
                availableCourses.map(course => {
                  const isSelected = selectedCourses.some(c => c.id === course.id);
                  return (
                    <TouchableOpacity
                      key={course.id}
                      style={[styles.bulkItem, isSelected && styles.bulkItemSelected]}
                      onPress={() => toggleCourseSelection(course)}
                    >
                      <Text style={styles.bulkItemText}>{course.name || course.subject}</Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={22} color="#10B981" />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity style={styles.submitBtn} onPress={handleBulkAdd}>
              <Text style={styles.submitBtnText}>✅ إضافة {selectedCourses.length} مادة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },

  header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'right' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'right', marginTop: 4 },

  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 12, marginTop: 16 },

  // Doctor Card
  doctorCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  doctorAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(30,64,175,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  doctorAvatarText: { fontSize: 18, fontWeight: '700', color: '#1E40AF' },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  doctorEmail: { fontSize: 12, color: '#94A3B8', textAlign: 'right', marginTop: 2 },
  doctorSubCount: { fontSize: 11, color: '#1E40AF', textAlign: 'right', marginTop: 4, fontWeight: '600' },

  // Selected Doctor
  backLink: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  backLinkText: { color: '#1E40AF', fontSize: 14, fontWeight: '600' },
  selectedDocCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#1E40AF', marginBottom: 16 },
  docAvatarLg: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(30,64,175,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  docAvatarLgText: { fontSize: 24, fontWeight: '800', color: '#1E40AF' },
  docNameLg: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  docEmailLg: { fontSize: 13, color: '#94A3B8', marginTop: 4 },

  // Actions
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  addBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#10B981', padding: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8 },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  bulkBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#1E40AF', padding: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8 },
  bulkBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Subject Card
  subjectCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  subjectNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  subjectName: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', flex: 1 },
  subjectActions: { flexDirection: 'row', gap: 8 },
  editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(30,64,175,0.08)', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.08)', justifyContent: 'center', alignItems: 'center' },
  subjectMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  metaChip: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontSize: 11, color: '#64748B', fontWeight: '500' },

  // Empty
  emptyState: { alignItems: 'center', padding: 30, backgroundColor: '#FFF', borderRadius: 16 },
  emptyText: { fontSize: 15, color: '#94A3B8', marginTop: 8 },
  emptySub: { fontSize: 12, color: '#CBD5E1', marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  modalSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'right', marginBottom: 16 },

  // Form
  formScroll: { maxHeight: 450 },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: 'right', marginBottom: 8, marginTop: 14 },
  formInput: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 14, color: '#1E293B', textAlign: 'right' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFF' },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeHalf: { flex: 1 },
  submitBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 24, marginBottom: 20 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Bulk
  bulkList: { maxHeight: 250, marginBottom: 16 },
  bulkItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 12, backgroundColor: '#F8FAFC', marginBottom: 8, borderWidth: 1.5, borderColor: '#E2E8F0'
  },
  bulkItemSelected: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  bulkItemText: { fontSize: 14, fontWeight: '600', color: '#1E293B' }
});