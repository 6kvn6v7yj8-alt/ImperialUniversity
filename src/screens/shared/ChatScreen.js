import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

export default function ChatScreen({ navigation }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    fetchUserData();
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // تحديث كل 5 ثواني
    return () => clearInterval(interval);
  }, []);

  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) setUserData(docSnap.data());
    }
  };

  const fetchMessages = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, 'support_chats'),
        orderBy('timestamp', 'asc')
      );
      const snapshot = await getDocs(q);
      const allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // عرض رسائل هذا المستخدم + ردود الأدمن
      const myMessages = allMessages.filter(msg => 
        msg.studentId === user.uid || msg.replyTo === user.uid
      );
      
      setMessages(myMessages);
      setLoading(false);
    } catch (error) {
      console.log('Error:', error);
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(db, 'support_chats'), {
        studentId: user.uid,
        studentName: userData?.name || 'طالب',
        studentEmail: user.email,
        message: message.trim(),
        sender: 'student',
        replyTo: null,
        replied: false,
        timestamp: new Date().toISOString(),
      });

      setMessage('');
      fetchMessages();
    } catch (error) {
      console.log('Error sending:', error);
    }
  };

  const renderMessage = ({ item }) => {
    const isStudent = item.sender === 'student';
    return (
      <View style={[styles.bubble, isStudent ? styles.myBubble : styles.supportBubble]}>
        {!isStudent && (
          <Text style={styles.senderName}>🎓 الدعم الفني</Text>
        )}
        <Text style={[styles.bubbleText, isStudent ? styles.myText : styles.supportText]}>
          {item.message}
        </Text>
        <Text style={styles.bubbleTime}>
          {new Date(item.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💬 الدعم الفني</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>متصل الآن</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chatList}
        renderItem={renderMessage}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>ابدأ محادثة مع الدعم الفني</Text>
            <Text style={styles.emptyHint}>سنرد عليك في أقرب وقت</Text>
          </View>
        }
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="اكتب رسالتك..."
          value={message}
          onChangeText={setMessage}
          placeholderTextColor="#94A3B8"
          textAlign="right"
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} activeOpacity={0.8}>
          <Text style={styles.sendIcon}>📤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  header: { backgroundColor: '#1E40AF', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 50, left: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)' },
  backText: { fontSize: 14, color: '#FFF', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  statusText: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  chatList: { padding: 16, flexGrow: 1 },
  emptyChat: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  emptyHint: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#1E40AF', borderBottomRightRadius: 4 },
  supportBubble: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  senderName: { fontSize: 11, color: '#1E40AF', fontWeight: '600', marginBottom: 4, textAlign: 'right' },
  myText: { color: '#FFF', fontSize: 14 },
  supportText: { color: '#1E293B', fontSize: 14, textAlign: 'right' },
  bubbleTime: { fontSize: 10, color: '#94A3B8', marginTop: 4, textAlign: 'right' },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1E293B', maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#1E40AF', justifyContent: 'center', alignItems: 'center' },
  sendIcon: { fontSize: 18 },
});