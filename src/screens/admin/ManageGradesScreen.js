import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Alert, ActivityIndicator, TextInput, Modal, RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import * as DocumentPicker from 'expo-document-picker';
import { readExcelFile, parseGradesExcel, saveGradesToFirestore } from '../../services/excelService';
import { LinearGradient } from 'expo-linear-gradient';

const BATCHES = ['A', 'B', 'C', 'D'];
const SPECIALIZATIONS = ['علوم حاسب', 'تقنية معلومات', 'شبكات', 'أمن سيبراني', 'عام'];

export default function ManageGradesScreen({ navigation }) {
  // ========== State ==========
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [grades, setGrades] = useState([]);
  const [filteredGrades, setFilteredGrades] = useState([]);
  const [courses, setCourses] = useState([]);
  
  // Filters
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [searchText, setSearchText] = useState('');
  
  // Excel Upload
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState(1);
  const [uploadBatch, setUploadBatch] = useState('');
  const [uploadSpecialization, setUploadSpecialization] = useState('');
  const [excelFileName, setExcelFileName] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  
  // Add/Edit
  const [showAddModal, setShowAddModal] = useState(false);
  const [editGrade, setEditGrade] = useState(null);
  const [formData, setFormData] = useState({
    studentName: '', courseName: '', score: '', letterGrade: '', batch: 'A'
  });
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAllData();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // ========== Load Data ==========
  const loadAllData = async () => {
    try {
      setLoading(true);
      
      const gradesSnap = await getDocs(query(collection(db, 'grades'), orderBy('createdAt', 'desc')));
      const allGrades = gradesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGrades(allGrades);
      setFilteredGrades(allGrades);
      
      const coursesSnap = await getDocs(collection(db, 'courses'));
      setCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ========== Filters ==========
  useEffect(() => {
    applyFilters();
  }, [selectedBatch, selectedCourse, searchText]);

  const applyFilters = () => {
    let filtered = [...grades];
    
    if (selectedBatch !== 'all') {
      filtered = filtered.filter(g => g.batch === selectedBatch);
    }
    
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(g => g.courseName === selectedCourse);
    }
    
    if (searchText) {
      filtered = filtered.filter(g => 
        (g.studentName || '').toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    setFilteredGrades(filtered);
  };

  // ========== Excel Upload ==========
  const handlePickExcel = async () => {
    if (!uploadBatch || !uploadSpecialization) {
      Alert.alert('تنبيه', 'يرجى اختيار الدفعة والتخصص أولاً');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'],
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      setUploadLoading(true);
      const file = result.assets[0];
      setExcelFileName(file.name);

      const readResult = await readExcelFile(file.uri);
      
      if (!readResult.success) {
        Alert.alert('خطأ', readResult.error);
        setUploadLoading(false);
        return;
      }

      const parseResult = parseGradesExcel(readResult.data, uploadBatch, uploadSpecialization);
      
      if (!parseResult.success) {
        Alert.alert('خطأ', parseResult.error);
        setUploadLoading(false);
        return;
      }

      setParsedData(parseResult);
      setUploadStep(2);
      setUploadLoading(false);

    } catch (error) {
      console.error('Error:', error);
      Alert.alert('خطأ', 'فشل في قراءة الملف');
      setUploadLoading(false);
    }
  };

  const handleSaveExcelGrades = async () => {
    if (!parsedData || parsedData.grades.length === 0) {
      Alert.alert('تنبيه', 'لا توجد نتائج للحفظ');
      return;
    }

    Alert.alert(
      'تأكيد الحفظ',
      `سيتم حفظ ${parsedData.grades.length} نتيجة لـ ${parsedData.studentsCount} طالب`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حفظ',
          onPress: async () => {
            setUploadLoading(true);
            const result = await saveGradesToFirestore(parsedData.grades, uploadBatch, uploadSpecialization);
            
            if (result.success) {
              Alert.alert('✅ تم', `تم حفظ ${result.savedCount} نتيجة جديدة وتحديث ${result.updatedCount} نتيجة`);
              handleCloseUpload();
              loadAllData();
            } else {
              Alert.alert('خطأ', result.error);
            }
            setUploadLoading(false);
          }
        }
      ]
    );
  };

  const handleCloseUpload = () => {
    setShowUploadModal(false);
    setUploadStep(1);
    setUploadBatch('');
    setUploadSpecialization('');
    setExcelFileName('');
    setParsedData(null);
    setUploadLoading(false);
  };

  // ========== Add/Edit ==========
  const handleAddOrEdit = async () => {
    if (!formData.studentName || !formData.courseName || !formData.score) {
      Alert.alert('تنبيه', 'يرجى ملء جميع الحقول');
      return;
    }

    try {
      if (editGrade) {
        // تحديث
        await updateDoc(doc(db, 'grades', editGrade.id), {
          studentName: formData.studentName,
          courseName: formData.courseName,
          score: Number(formData.score),
          letterGrade: formData.letterGrade || calculateGradeLetter(Number(formData.score)),
          batch: formData.batch,
          updatedAt: new Date().toISOString()
        });
        Alert.alert('✅ تم', 'تم تحديث النتيجة');
      } else {
        // إضافة
        await addDoc(collection(db, 'grades'), {
          studentName: formData.studentName,
          courseName: formData.courseName,
          score: Number(formData.score),
          letterGrade: formData.letterGrade || calculateGradeLetter(Number(formData.score)),
          batch: formData.batch,
          createdAt: new Date().toISOString()
        });
        Alert.alert('✅ تم', 'تم إضافة النتيجة');
      }
      
      setShowAddModal(false);
      setEditGrade(null);
      setFormData({ studentName: '', courseName: '', score: '', letterGrade: '', batch: 'A' });
      loadAllData();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('خطأ', 'فشل في الحفظ');
    }
  };

  const openEditModal = (grade) => {
    setEditGrade(grade);
    setFormData({
      studentName: grade.studentName || '',
      courseName: grade.courseName || '',
      score: String(grade.score || ''),
      letterGrade: grade.letterGrade || '',
      batch: grade.batch || 'A'
    });
    setShowAddModal(true);
  };

  const handleDelete = (grade) => {
    Alert.alert('تأكيد', `حذف نتيجة ${grade.studentName}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, 'grades', grade.id));
          Alert.alert('✅ تم', 'تم حذف النتيجة');
          loadAllData();
        }
      }
    ]);
  };

  const calculateGradeLetter = (score) => {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 65) return 'D+';
    if (score >= 60) return 'D';
    return 'F';
  };

  // ========== Stats ==========
  const uniqueStudents = [...new Set(filteredGrades.map(g => g.studentName))].length;
  const uniqueCourses = [...new Set(filteredGrades.map(g => g.courseName))].length;
  const highGrades = filteredGrades.filter(g => g.score >= 85).length;

  // ========== Render ==========
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
      {/* Header */}
      <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 إدارة النتائج</Text>
        <Text style={styles.headerSub}>{grades.length} نتيجة | {uniqueStudents} طالب</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAllData(); }} />}
      >
        {/* Stats */}
        <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.statNum, { color: '#1E40AF' }]}>{filteredGrades.length}</Text>
            <Text style={styles.statLabel}>نتيجة</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <Text style={[styles.statNum, { color: '#10B981' }]}>{uniqueStudents}</Text>
            <Text style={styles.statLabel}>طالب</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statNum, { color: '#F59E0B' }]}>{highGrades}</Text>
            <Text style={styles.statLabel}>ممتاز</Text>
          </View>
        </Animated.View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => setShowUploadModal(true)}>
            <FontAwesome5 name="file-excel" size={20} color="#FFF" />
            <Text style={styles.uploadBtnText}>رفع Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => {
            setEditGrade(null);
            setFormData({ studentName: '', courseName: '', score: '', letterGrade: '', batch: 'A' });
            setShowAddModal(true);
          }}>
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>إضافة يدوي</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, selectedBatch === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedBatch('all')}
          >
            <Text style={[styles.filterText, selectedBatch === 'all' && styles.filterTextActive]}>كل الدفعات</Text>
          </TouchableOpacity>
          {BATCHES.map(batch => (
            <TouchableOpacity
              key={batch}
              style={[styles.filterChip, selectedBatch === batch && styles.filterChipActive]}
              onPress={() => setSelectedBatch(batch)}
            >
              <Text style={[styles.filterText, selectedBatch === batch && styles.filterTextActive]}>دفعة {batch}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="🔍 بحث باسم الطالب..."
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Grades List */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {filteredGrades.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-text-off" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>لا توجد نتائج</Text>
            </View>
          ) : (
            filteredGrades.map((grade, index) => (
              <View key={grade.id || index} style={styles.gradeCard}>
                <View style={styles.gradeHeader}>
                  <Text style={styles.studentName}>{grade.studentName}</Text>
                  <View style={[
                    styles.gradeBadge,
                    { backgroundColor: grade.score >= 85 ? '#D1FAE5' : grade.score >= 60 ? '#FEF3C7' : '#FEE2E2' }
                  ]}>
                    <Text style={[
                      styles.gradeBadgeText,
                      { color: grade.score >= 85 ? '#065F46' : grade.score >= 60 ? '#92400E' : '#991B1B' }
                    ]}>
                      {grade.letterGrade || calculateGradeLetter(grade.score)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.gradeInfo}>
                  <Text style={styles.courseName}>📚 {grade.courseName}</Text>
                  <Text style={styles.score}>{grade.score}</Text>
                </View>
                
                <View style={styles.gradeFooter}>
                  <View style={styles.batchChip}>
                    <Text style={styles.batchChipText}>دفعة {grade.batch}</Text>
                  </View>
                  <View style={styles.gradeActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(grade)}>
                      <Ionicons name="pencil" size={16} color="#1E40AF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(grade)}>
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </Animated.View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ========== Upload Modal ========== */}
      <Modal visible={showUploadModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {uploadStep === 1 ? '📤 رفع نتائج Excel' : '📋 معاينة النتائج'}
              </Text>
              <TouchableOpacity onPress={handleCloseUpload}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {uploadStep === 1 ? (
              <>
                <Text style={styles.modalLabel}>👥 الدفعة</Text>
                <View style={styles.modalChipRow}>
                  {BATCHES.map(batch => (
                    <TouchableOpacity
                      key={batch}
                      style={[styles.modalChip, uploadBatch === batch && styles.modalChipActive]}
                      onPress={() => setUploadBatch(batch)}
                    >
                      <Text style={[styles.modalChipText, uploadBatch === batch && styles.modalChipTextActive]}>
                        دفعة {batch}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>💻 التخصص</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalChipRow}>
                  {SPECIALIZATIONS.map(spec => (
                    <TouchableOpacity
                      key={spec}
                      style={[styles.modalChip, uploadSpecialization === spec && styles.modalChipActive]}
                      onPress={() => setUploadSpecialization(spec)}
                    >
                      <Text style={[styles.modalChipText, uploadSpecialization === spec && styles.modalChipTextActive]}>
                        {spec}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.pickFileBtn, (!uploadBatch || !uploadSpecialization) && { backgroundColor: '#CBD5E1' }]}
                  onPress={handlePickExcel}
                  disabled={!uploadBatch || !uploadSpecialization}
                >
                  <FontAwesome5 name="file-excel" size={24} color="#FFF" />
                  <Text style={styles.pickFileBtnText}>اختيار ملف Excel</Text>
                </TouchableOpacity>

                <View style={styles.excelTemplate}>
                  <Text style={styles.excelTemplateTitle}>📋 شكل الملف:</Text>
                  <View style={styles.excelTemplateBox}>
                    <Text style={styles.excelTemplateText}>| الطالب | برمجة | رياضيات |</Text>
                    <Text style={styles.excelTemplateText}>| أحمد | 95 | 88 |</Text>
                    <Text style={styles.excelTemplateText}>| سارة | 78 | 82 |</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.fileInfo}>
                  <FontAwesome5 name="file-excel" size={20} color="#10B981" />
                  <Text style={styles.fileInfoText}>{excelFileName}</Text>
                </View>

                <View style={styles.previewStats}>
                  <View style={styles.previewStat}>
                    <Text style={styles.previewStatNum}>{parsedData?.studentsCount || 0}</Text>
                    <Text style={styles.previewStatLabel}>طالب</Text>
                  </View>
                  <View style={styles.previewStat}>
                    <Text style={styles.previewStatNum}>{parsedData?.subjectColumns?.length || 0}</Text>
                    <Text style={styles.previewStatLabel}>مادة</Text>
                  </View>
                  <View style={styles.previewStat}>
                    <Text style={styles.previewStatNum}>{parsedData?.grades?.length || 0}</Text>
                    <Text style={styles.previewStatLabel}>نتيجة</Text>
                  </View>
                </View>

                {/* Preview Table */}
                <ScrollView horizontal style={styles.previewTable}>
                  <View>
                    <View style={styles.ptHeader}>
                      <Text style={[styles.ptCell, styles.ptHeaderCell, { width: 120 }]}>الطالب</Text>
                      {parsedData?.subjectColumns?.slice(0, 5).map((s, i) => (
                        <Text key={i} style={[styles.ptCell, styles.ptHeaderCell, { width: 90 }]}>{s}</Text>
                      ))}
                    </View>
                    {parsedData?.grades?.slice(0, 20).map((g, i) => (
                      <View key={i} style={styles.ptRow}>
                        <Text style={[styles.ptCell, { width: 120 }]} numberOfLines={1}>{g.studentName}</Text>
                        <Text style={[styles.ptCell, { width: 90 }]}>{g.score}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>

                <TouchableOpacity style={styles.saveExcelBtn} onPress={handleSaveExcelGrades}>
                  <Text style={styles.saveExcelBtnText}>💾 حفظ النتائج</Text>
                </TouchableOpacity>
              </>
            )}

            {uploadLoading && (
              <ActivityIndicator size="large" color="#1E40AF" style={{ marginTop: 20 }} />
            )}
          </View>
        </View>
      </Modal>

      {/* ========== Add/Edit Modal ========== */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editGrade ? '✏️ تعديل نتيجة' : '➕ إضافة نتيجة'}</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setEditGrade(null); }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>اسم الطالب</Text>
            <TextInput style={styles.modalInput} value={formData.studentName} onChangeText={(t) => setFormData({...formData, studentName: t})} placeholder="اسم الطالب" />

            <Text style={styles.modalLabel}>المادة</Text>
            <TextInput style={styles.modalInput} value={formData.courseName} onChangeText={(t) => setFormData({...formData, courseName: t})} placeholder="اسم المادة" />

            <Text style={styles.modalLabel}>الدرجة</Text>
            <TextInput style={styles.modalInput} value={formData.score} onChangeText={(t) => {
              setFormData({...formData, score: t, letterGrade: calculateGradeLetter(Number(t))});
            }} placeholder="الدرجة" keyboardType="numeric" />

            <Text style={styles.modalLabel}>التقدير</Text>
            <TextInput style={styles.modalInput} value={formData.letterGrade} onChangeText={(t) => setFormData({...formData, letterGrade: t})} placeholder="A+, A, B+..." />

            <Text style={styles.modalLabel}>الدفعة</Text>
            <View style={styles.modalChipRow}>
              {BATCHES.map(batch => (
                <TouchableOpacity
                  key={batch}
                  style={[styles.modalChip, formData.batch === batch && styles.modalChipActive]}
                  onPress={() => setFormData({...formData, batch})}
                >
                  <Text style={[styles.modalChipText, formData.batch === batch && styles.modalChipTextActive]}>دفعة {batch}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveExcelBtn} onPress={handleAddOrEdit}>
              <Text style={styles.saveExcelBtnText}>{editGrade ? '💾 حفظ التعديل' : '✅ إضافة'}</Text>
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

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 4 },

  // Actions
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  uploadBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#10B981', padding: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8 },
  uploadBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  addBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#1E40AF', padding: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8 },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterTextActive: { color: '#FFF' },

  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 12, marginBottom: 16, borderWidth: 1.5, borderColor: '#E2E8F0', gap: 8 },
  searchInput: { flex: 1, padding: 12, fontSize: 13, color: '#1E293B', textAlign: 'right' },

  // Grade Card
  gradeCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  gradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  studentName: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', flex: 1 },
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  gradeBadgeText: { fontSize: 13, fontWeight: '700' },
  gradeInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  courseName: { fontSize: 13, color: '#64748B' },
  score: { fontSize: 18, fontWeight: '800', color: '#1E40AF' },
  gradeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  batchChip: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  batchChipText: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  gradeActions: { flexDirection: 'row', gap: 8 },
  editBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(30,64,175,0.08)', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', justifyContent: 'center', alignItems: 'center' },

  emptyState: { alignItems: 'center', padding: 40, backgroundColor: '#FFF', borderRadius: 16 },
  emptyText: { fontSize: 15, color: '#94A3B8', marginTop: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#64748B', textAlign: 'right', marginBottom: 8, marginTop: 14 },
  modalInput: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 14, color: '#1E293B', textAlign: 'right' },
  modalChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  modalChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#E2E8F0' },
  modalChipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  modalChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  modalChipTextActive: { color: '#FFF' },

  // Upload
  pickFileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', padding: 16, borderRadius: 14, marginTop: 20, gap: 10 },
  pickFileBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  excelTemplate: { marginTop: 20, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14 },
  excelTemplateTitle: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  excelTemplateBox: { backgroundColor: '#1E293B', borderRadius: 10, padding: 12 },
  excelTemplateText: { color: '#E2E8F0', fontSize: 11, fontFamily: 'monospace', marginBottom: 4 },

  // File Info
  fileInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, backgroundColor: '#F0FDF4', padding: 12, borderRadius: 12 },
  fileInfoText: { fontSize: 13, fontWeight: '600', color: '#10B981' },

  // Preview
  previewStats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  previewStat: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, alignItems: 'center' },
  previewStatNum: { fontSize: 20, fontWeight: '800', color: '#1E40AF' },
  previewStatLabel: { fontSize: 11, color: '#64748B', marginTop: 4 },

  previewTable: { maxHeight: 200, marginBottom: 16 },
  ptHeader: { flexDirection: 'row', backgroundColor: '#1E40AF', borderRadius: 8 },
  ptHeaderCell: { color: '#FFF', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  ptRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  ptCell: { padding: 8, fontSize: 11, color: '#1E293B', textAlign: 'center' },

  saveExcelBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  saveExcelBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});