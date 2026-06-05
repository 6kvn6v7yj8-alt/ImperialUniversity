import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Animated, Modal
} from 'react-native';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, where, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import * as DocumentPicker from 'expo-document-picker';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const storage = getStorage();

export default function ManageLibraryScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('PDF');
  const [batch, setBatch] = useState('A');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editType, setEditType] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const batches = ['A', 'B', 'C', 'D'];
  const types = ['PDF', 'PowerPoint', 'Word', 'كتاب', 'بحث', 'مرجع'];

  useEffect(() => {
    fetchBooks();
    startAnimations();
  }, []);

  useEffect(() => {
    if (batch) {
      fetchSubjectsByBatch();
    }
  }, [batch]);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  };

  const fetchSubjectsByBatch = async () => {
    setLoadingSubjects(true);
    try {
      const q = query(collection(db, 'courses'), where('batch', '==', batch));
      const snapshot = await getDocs(q);
      
      const subjectsList = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        let subjectName = data.name;
        if (subjectName && subjectName !== 'undefined' && subjectName !== '') {
          subjectsList.push(subjectName);
        }
      });
      
      const uniqueSubjects = [...new Set(subjectsList)];
      
      if (uniqueSubjects.length > 0) {
        setAvailableSubjects(uniqueSubjects);
      } else {
        setAvailableSubjects(['الرياضيات', 'الفيزياء', 'الكيمياء', 'الأحياء', 'البرمجة', 'قواعد البيانات', 'الشبكات']);
      }
      setSubject('');
    } catch (error) {
      console.log('Error fetching subjects:', error);
      setAvailableSubjects(['الرياضيات', 'الفيزياء', 'الكيمياء', 'الأحياء', 'البرمجة', 'قواعد البيانات', 'الشبكات']);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchBooks = async () => {
    try {
      const q = query(collection(db, 'library'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const booksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBooks(booksData);
    } catch (error) {
      console.log('Error fetching books:', error);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      
      if (result.assets && result.assets[0]) {
        setSelectedFile(result.assets[0]);
        setSelectedFileName(result.assets[0].name);
      }
    } catch (error) {
      console.log('Error picking document:', error);
    }
  };

  const uploadFileToFirebase = async (fileUri, fileName) => {
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const storageRef = ref(storage, `library/${Date.now()}_${fileName}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.log('Upload error:', error);
      throw error;
    }
  };

  const deleteFileFromFirebase = async (fileUrl) => {
    if (!fileUrl) return;
    try {
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);
    } catch (error) {
      console.log('Error deleting file:', error);
    }
  };

  const handleAdd = async () => {
    if (!title || !subject) {
      Alert.alert('تنبيه', 'الرجاء ملء العنوان والمادة الدراسية');
      return;
    }
    if (!selectedFile) {
      Alert.alert('تنبيه', 'الرجاء اختيار ملف للرفع');
      return;
    }

    setLoading(true);
    setUploading(true);
    
    try {
      const fileUrl = await uploadFileToFirebase(selectedFile.uri, selectedFile.name);
      
      await addDoc(collection(db, 'library'), {
        title,
        subject,
        type,
        batch,
        fileUrl,
        fileName: selectedFileName,
        createdAt: new Date().toISOString(),
      });
      
      Alert.alert('✅ تم', 'تمت إضافة الكتاب بنجاح');
      setTitle('');
      setSubject('');
      setType('PDF');
      setSelectedFile(null);
      setSelectedFileName('');
      fetchBooks();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleDelete = (book) => {
    Alert.alert('تأكيد الحذف', `هل أنت متأكد من حذف "${book.title}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { 
        text: 'حذف', 
        style: 'destructive', 
        onPress: async () => {
          try {
            if (book.fileUrl) {
              await deleteFileFromFirebase(book.fileUrl);
            }
            await deleteDoc(doc(db, 'library', book.id));
            fetchBooks();
            Alert.alert('✅ تم', 'تم حذف الكتاب بنجاح');
          } catch (error) { 
            Alert.alert('خطأ', error.message); 
          }
        }
      }
    ]);
  };

  const openEditModal = (book) => {
    setEditingBook(book);
    setEditTitle(book.title);
    setEditSubject(book.subject);
    setEditType(book.type);
    setEditModalVisible(true);
  };

  const handleEdit = async () => {
    if (!editTitle || !editSubject) {
      Alert.alert('تنبيه', 'الرجاء ملء العنوان والمادة الدراسية');
      return;
    }

    setLoading(true);
    try {
      const bookRef = doc(db, 'library', editingBook.id);
      await updateDoc(bookRef, {
        title: editTitle,
        subject: editSubject,
        type: editType,
        updatedAt: new Date().toISOString(),
      });
      
      Alert.alert('✅ تم', 'تم تعديل الكتاب بنجاح');
      setEditModalVisible(false);
      setEditingBook(null);
      fetchBooks();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return '📄';
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📕';
    if (ext === 'ppt' || ext === 'pptx') return '📊';
    if (ext === 'doc' || ext === 'docx') return '📝';
    return '📘';
  };

  const getSubjectColor = (subjectName) => {
    const colors = {
      'الرياضيات': '#3B82F6',
      'الفيزياء': '#10B981',
      'الكيمياء': '#F59E0B',
      'الأحياء': '#8B5CF6',
      'البرمجة': '#EC4899',
      'قواعد البيانات': '#06B6D4',
      'الشبكات': '#14B8A6',
      'اللغة العربية': '#EF4444',
      'اللغة الإنجليزية': '#F97316',
      'التصميم': '#6366F1',
      'التسويق': '#F43F5E',
      'المحاسبة': '#22C55E',
      'عام': '#64748B',
    };
    return colors[subjectName] || '#1E40AF';
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[styles.headerCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.title}>📚 إدارة المكتبة الرقمية</Text>
        <Text style={styles.subtitle}>رفع الكتب والملفات حسب الدفعة والمادة</Text>
      </Animated.View>

      <Animated.ScrollView style={[styles.formCard, { opacity: fadeAnim }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>عنوان الكتاب *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="أدخل عنوان الكتاب" 
          value={title} 
          onChangeText={setTitle} 
          placeholderTextColor="#94A3B8" 
          textAlign="right" 
        />

        <Text style={styles.label}>الدفعة المستهدفة *</Text>
        <View style={styles.batchRow}>
          {batches.map(b => (
            <TouchableOpacity 
              key={b} 
              style={[styles.batchChip, batch === b && styles.batchChipActive]} 
              onPress={() => setBatch(b)}
            >
              <Text style={[styles.batchChipText, batch === b && styles.batchChipTextActive]}>{b}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>المادة الدراسية *</Text>
        {loadingSubjects ? (
          <View style={styles.loadingSubjects}>
            <ActivityIndicator size="small" color="#1E40AF" />
            <Text style={styles.loadingSubjectsText}>جاري تحميل المواد...</Text>
          </View>
        ) : availableSubjects.length === 0 ? (
          <View style={styles.noSubjectsBox}>
            <Text style={styles.noSubjectsIcon}>📭</Text>
            <Text style={styles.noSubjectsText}>لا توجد مواد مسجلة لهذه الدفعة</Text>
            <Text style={styles.noSubjectsHint}>الرجاء إضافة مواد في إدارة المواد أولاً</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
            {availableSubjects.map((s, index) => (
              <TouchableOpacity 
                key={s + index} 
                style={[styles.subjectChip, subject === s && styles.subjectChipActive]} 
                onPress={() => setSubject(s)}
              >
                <Text style={[styles.subjectChipText, subject === s && styles.subjectChipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={styles.label}>نوع الملف *</Text>
        <View style={styles.chipRow}>
          {types.map(t => (
            <TouchableOpacity 
              key={t} 
              style={[styles.chip, type === t && styles.chipActive]} 
              onPress={() => setType(t)}
            >
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>رفع الملف *</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={pickDocument}>
          <Text style={styles.uploadIcon}>📁</Text>
          <Text style={styles.uploadText}>
            {selectedFileName ? `✅ ${selectedFileName}` : 'اضغط لاختيار ملف PDF أو PowerPoint أو Word'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.addBtn, (loading || !subject || !selectedFile) && styles.addBtnDisabled]} 
          onPress={handleAdd} 
          disabled={loading || !subject || !selectedFile}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.addBtnText}> جاري الرفع...</Text>
            </View>
          ) : (
            <Text style={styles.addBtnText}>📤 إضافة الكتاب</Text>
          )}
        </TouchableOpacity>
      </Animated.ScrollView>

      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.sectionTitle}>📖 الكتب الحالية ({books.length})</Text>
      </Animated.View>
      
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {books.map((book, index) => {
          const subjectColor = getSubjectColor(book.subject);
          return (
            <Animated.View 
              key={book.id || index} 
              style={[
                styles.bookCard,
                { 
                  opacity: fadeAnim, 
                  transform: [{ translateX: slideAnim }],
                  borderRightColor: subjectColor,
                  borderRightWidth: 4,
                }
              ]}
            >
              <View style={[styles.bookIconBox, { backgroundColor: subjectColor + '15' }]}>
                <Text style={styles.bookIcon}>{getFileIcon(book.fileName)}</Text>
              </View>
              <View style={styles.bookContent}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <View style={styles.bookBadges}>
                  <View style={[styles.subjectBadge, { backgroundColor: subjectColor + '15' }]}>
                    <Text style={[styles.subjectBadgeText, { color: subjectColor }]}>{book.subject}</Text>
                  </View>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{book.type}</Text>
                  </View>
                  <View style={styles.batchBadge}>
                    <Text style={styles.batchBadgeText}>دفعة {book.batch}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity onPress={() => openEditModal(book)} style={styles.editBtn}>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(book)} style={styles.deleteBtn}>
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          );
        })}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ تعديل الكتاب</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalLabel}>عنوان الكتاب</Text>
            <TextInput 
              style={styles.modalInput} 
              value={editTitle} 
              onChangeText={setEditTitle} 
              placeholder="أدخل عنوان الكتاب" 
              textAlign="right"
            />
            
            <Text style={styles.modalLabel}>المادة الدراسية</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalScrollRow}>
              {availableSubjects.map((s, index) => (
                <TouchableOpacity 
                  key={s + index} 
                  style={[styles.modalChip, editSubject === s && styles.modalChipActive]} 
                  onPress={() => setEditSubject(s)}
                >
                  <Text style={[styles.modalChipText, editSubject === s && styles.modalChipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Text style={styles.modalLabel}>نوع الملف</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalScrollRow}>
              {types.map(t => (
                <TouchableOpacity 
                  key={t} 
                  style={[styles.modalChip, editType === t && styles.modalChipActive]} 
                  onPress={() => setEditType(t)}
                >
                  <Text style={[styles.modalChipText, editType === t && styles.modalChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleEdit} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalSaveText}>💾 حفظ التعديلات</Text>}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  backBtn: { alignSelf: 'flex-end', marginTop: 16, marginRight: 16, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: '#FFF', elevation: 2 },
  backText: { fontSize: 14, color: '#1E40AF', fontWeight: '700' },
  headerCard: { backgroundColor: '#1E40AF', marginHorizontal: 16, marginTop: 12, borderRadius: 24, padding: 20, elevation: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 4 },
  formCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: -10, borderRadius: 24, padding: 20, maxHeight: '55%' },
  label: { fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: 'right', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 4, color: '#1E293B', textAlign: 'right' },
  scrollRow: { flexDirection: 'row', marginBottom: 8, maxHeight: 50 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', marginRight: 8, marginBottom: 6 },
  chipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFF' },
  batchRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  batchChip: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0' },
  batchChipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  batchChipText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  batchChipTextActive: { color: '#FFF' },
  subjectChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', marginRight: 8, marginBottom: 6 },
  subjectChipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  subjectChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  subjectChipTextActive: { color: '#FFF' },
  uploadBox: { backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 8 },
  uploadIcon: { fontSize: 40, marginBottom: 8 },
  uploadText: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  addBtn: { backgroundColor: '#1E40AF', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 16, elevation: 4 },
  addBtnDisabled: { backgroundColor: '#93C5FD', opacity: 0.7 },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingSubjects: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 8 },
  loadingSubjectsText: { fontSize: 13, color: '#64748B' },
  noSubjectsBox: { backgroundColor: '#FEF2F2', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 8 },
  noSubjectsIcon: { fontSize: 40, marginBottom: 8 },
  noSubjectsText: { fontSize: 14, color: '#EF4444', fontWeight: '600', textAlign: 'center' },
  noSubjectsHint: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  bookCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, padding: 16, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  bookIconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  bookIcon: { fontSize: 26 },
  bookContent: { flex: 1 },
  bookTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 6 },
  bookBadges: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' },
  subjectBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  subjectBadgeText: { fontSize: 10, fontWeight: '700' },
  typeBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  typeBadgeText: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  batchBadge: { backgroundColor: '#1E40AF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  batchBadgeText: { fontSize: 10, color: '#FFF', fontWeight: '700' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  editBtn: { padding: 8 },
  editIcon: { fontSize: 18 },
  deleteBtn: { padding: 8 },
  deleteIcon: { fontSize: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderRadius: 28, padding: 24, width: '90%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  modalClose: { fontSize: 22, color: '#64748B', padding: 4 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: 'right', marginBottom: 8, marginTop: 12 },
  modalInput: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 15, color: '#1E293B', textAlign: 'right' },
  modalScrollRow: { flexDirection: 'row', marginBottom: 8, maxHeight: 50 },
  modalChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', marginRight: 8, marginBottom: 6 },
  modalChipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  modalChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  modalChipTextActive: { color: '#FFF' },
  modalSaveBtn: { backgroundColor: '#1E40AF', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  modalSaveText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});