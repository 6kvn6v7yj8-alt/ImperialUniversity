import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Colors, Shadows, Radius } from '../../theme';

const typeIcons = { 'PDF': '▣', 'كتاب': '▣', 'بحث': '▣', 'مرجع': '▣' };

export default function LibraryScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'library'));
      setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>▣ المكتبة الرقمية</Text>
        <Text style={styles.headerSub}>{books.length} كتاب</Text>
      </View>

      {books.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>▣</Text>
          <Text style={styles.emptyText}>لا توجد كتب حالياً</Text>
        </View>
      ) : (
        books.map((book, i) => (
          <Animated.View key={book.id} style={[styles.card, { opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.cardInner} activeOpacity={0.8}>
              <View style={styles.iconBox}>
                <Text style={styles.bookIcon}>▣</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.title}>{book.title}</Text>
                <Text style={styles.author}>✍️ {book.author}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{book.type}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  header: { backgroundColor: '#1E40AF', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 22, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 2 },
  empty: { backgroundColor: 'rgba(255,255,255,0.7)', margin: 16, borderRadius: Radius.lg, padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 40, color: '#1E40AF', marginBottom: 10 },
  emptyText: { fontSize: 15, color: '#64748B', fontWeight: '600' },
  card: { backgroundColor: 'rgba(255,255,255,0.7)', marginHorizontal: 16, marginBottom: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', ...Shadows.glass },
  cardInner: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(30,64,175,0.08)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  bookIcon: { fontSize: 20, color: '#1E40AF' },
  cardContent: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 4 },
  author: { fontSize: 12, color: '#64748B', textAlign: 'right', marginBottom: 6 },
  typeBadge: { backgroundColor: 'rgba(30,64,175,0.06)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-end' },
  typeText: { fontSize: 11, color: '#1E40AF', fontWeight: '600' },
});