import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Linking, Platform
} from 'react-native';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function ManageLibraryScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [type, setType] = useState('كتاب');
  const [driveLink, setDriveLink] = useState('');
  const [batch, setBatch] = useState('all');
  const [loading, setLoading] = useState(false);
  // حالة جديدة لمحاكاة حالة السحب
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    const snapshot = await getDocs(collection(db, 'library'));
    setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // هذه الدالة تحول رابط المشاركة العادي إلى رابط تحميل مباشر
  const convertDriveLink = (url) => {
    if (!url) return '';
    
    // التعامل مع الروابط القصيرة أو روابط المشاركة من Google Drive
    const fileMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileMatch) {
      return 'https://drive.google.com/uc?export=download&id=' + fileMatch[1];
    }
    
    // التعامل مع الروابط التي تحتوي على id
    const idMatch = url.match(/[?&]id=([^&]+)/);
    if (idMatch) {
      return 'https://drive.google.com/uc?export=download&id=' + idMatch[1];
    }
    
    // إذا لم يكن رابط Google Drive، نرجعه كما هو (يدعم روابط Dropbox وغيرها)
    return url;
  };

  // دالة لمحاكاة فتح درايف وشرح الخطوات
  const simulateDrivePick = () => {
    Alert.alert(
      '📁 رفع ملف إلى Google Drive',
      'اتبع هذه الخطوات البسيطة:\n\n' +
      '1. افتح تطبيق Google Drive على هاتفك.\n' +
      '2. اضغط على "+" واختر "رفع" لاختيار الملف.\n' +
      '3. بعد الرفع، اضغط على "⋯" بجانب الملف واختر "مشاركة".\n' +
      '4. تأكد من تعيين الصلاحية إلى "أي شخص لديه الرابط".\n' +
      '5. انسخ الرابط والصقه هنا.',
      [
        { text: 'حسناً', style: 'cancel' },
        { 
          text: 'نسخ رابط مثال',
          onPress: () => {
            // هذا رابط مثال للتوضيح
            setDriveLink('https://drive.google.com/file/d/XXXXX/view?usp=sharing');
          }
        }
      ]
    );
  };

  const handleAdd = async () => {
    if (!title || !author) {
      Alert.alert('تنبيه', 'الرجاء ملء العنوان والمؤلف');
      return;
    }
    setLoading(true);
    try {
      const finalUrl = driveLink ? convertDriveLink(driveLink.trim()) : '';

      await addDoc(collection(db, 'library'), {
        title,
        author,
        type,
        pdfUrl: finalUrl, // سيتم تخزين رابط التحميل المباشر
        originalLink: driveLink.trim(),
        batch,
        createdAt: new Date().toISOString()
      });

      Alert.alert('✅ تم', 'تمت إضافة الكتاب وحفظ رابط التحميل المباشر بنجاح');
      setTitle(''); setAuthor(''); setType('كتاب'); setDriveLink(''); setBatch('all');
      fetchBooks();
    } catch (error) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert('تأكيد الحذف', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
          try { await deleteDoc(doc(db, 'library', id)); fetchBooks(); } 
          catch (error) { Alert.alert('خطأ', error.message); }
      }}
    ]);
  };

  const batches = ['all', 'A', 'B', 'C', 'D'];
  const types = ['كتاب', 'PDF', 'بحث', 'مرجع', 'عرض تقديمي', 'Word', 'فيديو'];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← رجوع</Text>
      </TouchableOpacity>

      <View style={styles.headerCard}>
        <Text style={styles.title}>📖 إضافة كتاب جديد</Text>
        <Text style={styles.subtitle}>ارفع ملفاتك على السحابة وأضف رابطها هنا</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>عنوان الكتاب *</Text>
        <TextInput style={styles.input} placeholder="أدخل عنوان الكتاب" value={title} onChangeText={setTitle} placeholderTextColor="#94A3B8" textAlign="right" />

        <Text style={styles.label}>المؤلف *</Text>
        <TextInput style={styles.input} placeholder="اسم المؤلف" value={author} onChangeText={setAuthor} placeholderTextColor="#94A3B8" textAlign="right" />

        <Text style={styles.label}>النوع</Text>
        <View style={styles.chipRow}>
          {types.map(t => (
            <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* منطقة السحب والإفلات الوهمية */}
        <TouchableOpacity 
          style={[styles.uploadBox, isDragging && styles.uploadBoxActive]} 
          onPress={simulateDrivePick}
          activeOpacity={0.8}
        >
          <View style={styles.uploadPlaceholder}>
            <Text style={styles.uploadIcon}>☁️</Text>
            <Text style={styles.uploadText}>اضغط هنا لمعرفة كيفية رفع الملفات</Text>
            <Text style={styles.uploadHint}>يدعم روابط Google Drive و Dropbox وغيرها</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.driveSection}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>🔗 رابط الملف</Text>
          </View>
          <TextInput 
            style={[styles.input, styles.linkInput]} 
            placeholder="الصق رابط المشاركة هنا" 
            value={driveLink} 
            onChangeText={setDriveLink} 
            placeholderTextColor="#94A3B8" 
            textAlign="right"
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text style={styles.hint}>
            📌 سيتم تحويل الرابط تلقائياً للتحميل المباشر
          </Text>
          {driveLink ? (
            <View style={styles.previewBox}>
              <Text style={styles.previewIcon}>✅</Text>
              <Text style={styles.previewText}>تم تحويل الرابط تلقائياً للتحميل المباشر</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.label}>الدفعة المستهدفة</Text>
        <View style={styles.chipRow}>
          {batches.map(b => (
            <TouchableOpacity key={b} style={[styles.chip, batch === b && styles.chipActive]} onPress={() => setBatch(b)}>
              <Text style={[styles.chipText, batch === b && styles.chipTextActive]}>
                {b === 'all' ? '🌐 الكل' : '📚 دفعة ' + b}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.addBtn, loading && styles.addBtnDisabled]} onPress={handleAdd} disabled={loading} activeOpacity={0.9}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.addBtnText}> جاري الحفظ...</Text>
            </View>
          ) : (
            <Text style={styles.addBtnText}>✅ إضافة الكتاب</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>📚 الكتب الحالية ({books.length})</Text>
      
      {books.map(book => (
        <View key={book.id} style={styles.bookCard}>
          <View style={styles.bookIconBox}>
            <Text style={styles.bookIcon}>
              {book.type === 'PDF' ? '📕' : book.type === 'فيديو' ? '🎬' : book.type === 'عرض تقديمي' ? '📊' : book.type === 'Word' ? '📝' : '📘'}
            </Text>
          </View>
          <View style={styles.bookContent}>
            <View style={styles.bookHeader}>
              <Text style={styles.bookTitle}>{book.title}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.batchBadge}>
                  <Text style={styles.batchBadgeText}>{book.batch === 'all' ? 'عام' : 'دفعة ' + book.batch}</Text>
                </View>
                {book.pdfUrl ? <View style={styles.linkBadge}><Text style={styles.linkBadgeText}>🔗</Text></View> : null}
              </View>
            </View>
            <Text style={styles.bookAuthor}>✍️ {book.author}</Text>
            <Text style={styles.bookMeta}>{book.type}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(book.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      ))}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  backBtn: { alignSelf: 'flex-end', marginTop: 16, marginRight: 16, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: '#FFF' },
  backText: { fontSize: 14, color: '#1E40AF', fontWeight: '700' },
  headerCard: { backgroundColor: '#1E40AF', marginHorizontal: 16, marginTop: 12, borderRadius: 20, padding: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 4 },
  formCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: -10, borderRadius: 20, padding: 20, shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: 'right', marginBottom: 8, marginTop: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 12 },
  helpText: { fontSize: 12, color: '#1E40AF', fontWeight: '600' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 4, color: '#1E293B' },
  linkInput: { fontSize: 13, color: '#1E40AF' },
  hint: { fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 6, marginBottom: 4 },
  previewBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, marginTop: 8 },
  previewIcon: { fontSize: 16 },
  previewText: { fontSize: 12, color: '#10B981', fontWeight: '600', flex: 1, textAlign: 'right' },
  driveSection: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFF' },
  uploadBox: { 
    backgroundColor: '#F8FAFC', 
    borderWidth: 2, 
    borderColor: '#E2E8F0', 
    borderStyle: 'dashed', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 8, 
    minHeight: 100, 
    justifyContent: 'center' 
  },
  uploadBoxActive: { borderColor: '#1E40AF', backgroundColor: '#EEF2FF' },
  uploadPlaceholder: { alignItems: 'center' },
  uploadIcon: { fontSize: 40, marginBottom: 8 },
  uploadText: { fontSize: 14, fontWeight: '600', color: '#1E40AF' },
  uploadHint: { fontSize: 11, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
  addBtn: { backgroundColor: '#1E40AF', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 16, shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  addBtnDisabled: { backgroundColor: '#93C5FD' },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  bookCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  bookIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(30,64,175,0.06)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  bookIcon: { fontSize: 24 },
  bookContent: { flex: 1 },
  bookHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  bookTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  badgeRow: { flexDirection: 'row', gap: 6 },
  batchBadge: { backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  batchBadgeText: { fontSize: 10, color: '#10B981', fontWeight: '700' },
  linkBadge: { backgroundColor: 'rgba(30,64,175,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  linkBadgeText: { fontSize: 10, color: '#1E40AF', fontWeight: '700' },
  bookAuthor: { fontSize: 13, color: '#64748B', textAlign: 'right' },
  bookMeta: { fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteIcon: { fontSize: 18 },
});