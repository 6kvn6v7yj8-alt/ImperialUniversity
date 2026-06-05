import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, TextInput, Modal, Share, Linking, Alert,
  Dimensions, Platform
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function LibraryScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('الكل');
  const [userBatch, setUserBatch] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState(['الكل']);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState('');
  const [viewerVisible, setViewerVisible] = useState(false);
  
  // Animations refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerAnim = useRef(new Animated.Value(-100)).current;
  const cardAnims = useRef([]);

  useEffect(() => {
    getUserDataAndBooks();
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 45, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.timing(headerAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  };

  const getUserDataAndBooks = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userQuery = query(collection(db, 'users'), where('uid', '==', user.uid));
        const userSnapshot = await getDocs(userQuery);
        let batch = '';
        userSnapshot.forEach(doc => {
          batch = doc.data().batch;
        });
        setUserBatch(batch);
        
        const booksQuery = query(collection(db, 'library'), where('batch', '==', batch));
        const booksSnapshot = await getDocs(booksQuery);
        const booksData = booksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBooks(booksData);
        setFilteredBooks(booksData);
        
        const uniqueSubjects = ['الكل', ...new Set(booksData.map(book => book.subject).filter(s => s && s !== 'undefined'))];
        setAvailableSubjects(uniqueSubjects);
        
        // Initialize card animations
        cardAnims.current = booksData.map((_, i) => new Animated.Value(0));
        animateCards();
      }
    } catch (error) {
      console.log('Error:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل المكتبة');
    } finally {
      setLoading(false);
    }
  };

  const animateCards = () => {
    cardAnims.current.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: 1,
        delay: i * 100,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }).start();
    });
  };

  const applyFilters = () => {
    let filtered = [...books];
    
    if (searchText) {
      filtered = filtered.filter(book => 
        book.title?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    if (selectedSubject !== 'الكل') {
      filtered = filtered.filter(book => book.subject === selectedSubject);
    }
    
    setFilteredBooks(filtered);
    
    // Re-animate filtered cards
    cardAnims.current = filtered.map((_, i) => new Animated.Value(0));
    animateCards();
  };

  useEffect(() => {
    applyFilters();
  }, [searchText, selectedSubject, books]);

  const openDocument = (book) => {
    if (!book.fileUrl) {
      Alert.alert('تنبيه', 'لا يوجد رابط للملف');
      return;
    }
    setSelectedBook(book);
    setModalVisible(true);
  };

  const handleOpenFile = async () => {
    if (!selectedBook?.fileUrl) return;
    setModalVisible(false);
    
    try {
      await WebBrowser.openBrowserAsync(selectedBook.fileUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: '#1E40AF',
        toolbarColor: '#1E40AF',
      });
    } catch (error) {
      Alert.alert('خطأ', 'لا يمكن فتح الملف');
    }
  };

  const handleDownload = async () => {
    if (!selectedBook?.fileUrl) return;
    setModalVisible(false);
    
    try {
      const fileName = selectedBook.fileName || 'document.pdf';
      const fileUri = FileSystem.documentDirectory + fileName;
      const downloadResumable = FileSystem.createDownloadResumable(
        selectedBook.fileUrl,
        fileUri
      );
      const { uri } = await downloadResumable.downloadAsync();
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('تنبيه', 'المشاركة غير متاحة على هذا الجهاز');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء تحميل الملف');
    }
  };

  const handleShare = async () => {
    if (!selectedBook?.fileUrl) return;
    setModalVisible(false);
    
    try {
      await Share.share({
        message: `📚 ${selectedBook.title}\n📖 ${selectedBook.subject}\n🔗 ${selectedBook.fileUrl}`,
        title: selectedBook.title,
      });
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء المشاركة');
    }
  };

  const getFileIcon = (type, fileName) => {
    if (type === 'PDF' || fileName?.includes('.pdf')) return '📕';
    if (type === 'Word' || fileName?.includes('.doc')) return '📝';
    if (type === 'PowerPoint' || fileName?.includes('.ppt')) return '📊';
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

  if (loading) {
    return (
      <LinearGradient colors={['#1E3A5F', '#0F2B4A']} style={styles.loadingContainer}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>جاري تحميل المكتبة...</Text>
          </View>
        </Animated.View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animated Header */}
      <Animated.View style={{ transform: [{ translateY: headerAnim }] }}>
        <LinearGradient
          colors={['#1E3A5F', '#0F2B4A', '#0A1C2E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>📚 المكتبة الرقمية</Text>
              <Text style={styles.headerSub}>دفعة {userBatch} · {filteredBooks.length} كتاب</Text>
            </View>
            <View style={styles.headerIcon}>
              <Text style={styles.headerIconText}>📖</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View style={[styles.searchSection, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.searchBox}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن كتاب..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
            textAlign="right"
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Subject Filter */}
      {availableSubjects.length > 1 && (
        <Animated.ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={[styles.filterSection, { opacity: fadeAnim }]}
          contentContainerStyle={styles.filterContent}
        >
          {availableSubjects.map((sub, idx) => (
            <TouchableOpacity
              key={sub}
              onPress={() => setSelectedSubject(sub)}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.filterChip,
                  selectedSubject === sub && styles.filterChipActive,
                  {
                    transform: [{
                      scale: selectedSubject === sub ? 1.05 : 1,
                    }],
                  },
                ]}
              >
                <LinearGradient
                  colors={selectedSubject === sub ? ['#6366F1', '#8B5CF6'] : ['#FFF', '#FFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.filterChipGradient}
                >
                  <Text style={[styles.filterChipText, selectedSubject === sub && styles.filterChipTextActive]}>
                    {sub}
                  </Text>
                  {selectedSubject === sub && (
                    <View style={styles.filterChipDot} />
                  )}
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          ))}
        </Animated.ScrollView>
      )}

      {/* Books List */}
      <Animated.ScrollView 
        style={[styles.listContainer, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {filteredBooks.length === 0 ? (
          <Animated.View style={[styles.emptyContainer, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>لا توجد كتب</Text>
              <Text style={styles.emptyText}>لم يتم إضافة أي كتب لدفعتك بعد</Text>
            </View>
          </Animated.View>
        ) : (
          filteredBooks.map((book, index) => {
            const subjectColor = getSubjectColor(book.subject);
            const cardAnim = cardAnims.current[index] || new Animated.Value(1);
            
            return (
              <TouchableOpacity 
                key={book.id || index} 
                activeOpacity={0.85}
                onPress={() => openDocument(book)}
              >
                <Animated.View 
                  style={[
                    styles.bookCard,
                    {
                      opacity: cardAnim,
                      transform: [
                        { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
                        { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#F8FAFC']}
                    style={[styles.bookCardGradient, { borderRightColor: subjectColor, borderRightWidth: 4 }]}
                  >
                    <View style={[styles.cardIconBox, { backgroundColor: subjectColor + '15' }]}>
                      <Animated.Text 
                        style={[
                          styles.cardIcon,
                          { transform: [{ rotate: cardAnim.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) }] }
                        ]}
                      >
                        {getFileIcon(book.type, book.fileName)}
                      </Animated.Text>
                    </View>
                    
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{book.title}</Text>
                      <View style={styles.cardBadges}>
                        <View style={[styles.subjectBadge, { backgroundColor: subjectColor + '15' }]}>
                          <Text style={[styles.subjectBadgeText, { color: subjectColor }]}>{book.subject}</Text>
                        </View>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>{book.type}</Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.cardArrow}>
                      <Animated.Text 
                        style={[
                          styles.arrowIcon,
                          { color: subjectColor, transform: [{ translateX: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }
                        ]}
                      >
                        📖
                      </Animated.Text>
                    </View>
                    
                    <Animated.View 
                      style={[
                        styles.cardShine,
                        {
                          opacity: cardAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.3, 0] }),
                          transform: [{ translateX: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, 100] }) }]
                        }
                      ]} 
                    />
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* Document Options Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.modalGradient}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedBook?.title}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalInfo}>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>📖 المادة:</Text>
                  <Text style={styles.modalInfoValue}>{selectedBook?.subject}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>📄 النوع:</Text>
                  <Text style={styles.modalInfoValue}>{selectedBook?.type}</Text>
                </View>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleOpenFile}>
                  <Text style={styles.modalBtnIcon}>📖</Text>
                  <Text style={styles.modalBtnText}>فتح الملف</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={handleDownload}>
                  <Text style={styles.modalBtnIcon}>📥</Text>
                  <Text style={styles.modalBtnText}>تحميل</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnOutline]} onPress={handleShare}>
                  <Text style={styles.modalBtnIcon}>📤</Text>
                  <Text style={styles.modalBtnText}>مشاركة</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    gap: 15,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  headerGradient: {
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    paddingTop: Platform.OS === 'ios' ? 55 : 45,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: 'bold',
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 20,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: -15,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    paddingVertical: 8,
  },
  clearIcon: {
    fontSize: 16,
    color: '#94A3B8',
    padding: 4,
  },
  filterSection: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  filterContent: {
    gap: 10,
    paddingVertical: 4,
  },
  filterChip: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterChipActive: {
    elevation: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  filterChipGradient: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  filterChipDot: {
    position: 'absolute',
    bottom: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 30,
    padding: 50,
    alignItems: 'center',
    width: width - 40,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  emptyIcon: {
    fontSize: 70,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  bookCard: {
    marginBottom: 14,
    borderRadius: 24,
    overflow: 'hidden',
  },
  bookCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFF',
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  cardIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardIcon: {
    fontSize: 30,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'right',
    marginBottom: 8,
  },
  cardBadges: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  subjectBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subjectBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  cardArrow: {
    width: 40,
    alignItems: 'center',
  },
  arrowIcon: {
    fontSize: 24,
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    transform: [{ skewX: '-20deg' }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    borderRadius: 32,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
    textAlign: 'right',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: 'bold',
  },
  modalInfo: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalInfoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  modalInfoValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
  },
  modalButtons: {
    gap: 12,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    gap: 10,
  },
  modalBtnPrimary: {
    backgroundColor: '#1E40AF',
  },
  modalBtnSecondary: {
    backgroundColor: '#10B981',
  },
  modalBtnOutline: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalBtnIcon: {
    fontSize: 18,
    color: '#FFF',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});