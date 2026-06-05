import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Animated, Easing, Dimensions
} from 'react-native';
import { askGemini, getSuggestedQuestions } from '../../services/chatbotService';

const { width } = Dimensions.get('window');

export default function AIChatScreen({ navigation }) {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: '👋 مرحباً! أنا المساعد الذكي لجامعة إمبريال.\nاسألني عن حضورك، جدولك، نتائجك، دكاترتك!' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  // 🎬 Animations
  const headerSlide = useRef(new Animated.Value(-100)).current;
  const botPulse = useRef(new Animated.Value(1)).current;
  const botRotate = useRef(new Animated.Value(0)).current;
  const chatFade = useRef(new Animated.Value(0)).current;
  const inputSlide = useRef(new Animated.Value(50)).current;
  const sendBtnScale = useRef(new Animated.Value(0)).current;
  const typingDots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  const suggestions = getSuggestedQuestions();

  useEffect(() => {
    // 🎬 سلسلة أنيميشن قوية
    Animated.sequence([
      // الهيدر ينزلق من فوق
      Animated.spring(headerSlide, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      
      // ظهور متزامن
      Animated.parallel([
        Animated.timing(chatFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(inputSlide, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.spring(sendBtnScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]),
    ]).start();

    // نبض + دوران البوت
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(botPulse, { toValue: 1.2, duration: 1200, easing: Easing.bounce, useNativeDriver: true }),
          Animated.timing(botPulse, { toValue: 1, duration: 1200, easing: Easing.bounce, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(botRotate, { toValue: 1, duration: 3000, useNativeDriver: true }),
          Animated.timing(botRotate, { toValue: 0, duration: 3000, useNativeDriver: true }),
        ]),
      ])
    ).start();

    // نقاط الكتابة
    Animated.loop(
      Animated.stagger(200, [
        Animated.sequence([
          Animated.timing(typingDots[0], { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(typingDots[0], { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(typingDots[1], { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(typingDots[1], { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(typingDots[2], { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(typingDots[2], { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const sendMessage = async (text) => {
    const question = text || input.trim();
    if (!question || loading) return;

    // أنيميشن الضغط
    Animated.sequence([
      Animated.timing(sendBtnScale, { toValue: 0.7, duration: 80, useNativeDriver: true }),
      Animated.spring(sendBtnScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
    ]).start();

    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: question }]);
    setInput('');
    setLoading(true);

    const result = await askGemini(question);
    
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: result.reply || 'خطأ' }]);
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
  };

  const spin = botRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* 🌟 هيدر متحرك */}
      <Animated.View style={[styles.header, { transform: [{ translateY: headerSlide }] }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Animated.View style={[styles.botCircle, { 
            transform: [{ scale: botPulse }, { rotate: spin }] 
          }]}>
            <Text style={styles.botEmoji}>🤖</Text>
          </Animated.View>
          <View>
            <Text style={styles.headerTitle}>المساعد الذكي</Text>
            <Text style={styles.headerSub}>Gemini AI • متصل</Text>
          </View>
        </View>
      </Animated.View>

      {/* 💬 المحادثة */}
      <Animated.View style={[styles.chatContainer, { opacity: chatFade }]}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.chatList}
          renderItem={({ item, index }) => (
            <MessageBubble item={item} index={index} />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            messages.length === 1 ? (
              <View style={styles.suggestions}>
                <Text style={styles.suggestTitle}>💡 جرب تسأل:</Text>
                <View style={styles.suggestGrid}>
                  {suggestions.map((s, i) => (
                    <TouchableOpacity key={i} style={styles.suggestChip} onPress={() => sendMessage(s.text)} activeOpacity={0.7}>
                      <Text style={styles.suggestIcon}>{s.icon}</Text>
                      <Text style={styles.suggestText}>{s.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
          ListFooterComponent={
            loading ? (
              <View style={styles.typingRow}>
                <View style={styles.typingBubble}>
                  {typingDots.map((dot, i) => (
                    <Animated.View key={i} style={[styles.typingDot, { 
                      opacity: dot, 
                      transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }] 
                    }]} />
                  ))}
                </View>
              </View>
            ) : null
          }
        />
      </Animated.View>

      {/* 📝 شريط الإدخال */}
      <Animated.View style={[styles.inputBar, { transform: [{ translateY: inputSlide }] }]}>
        <TextInput
          style={styles.input}
          placeholder="اسألني أي سؤال..."
          value={input}
          onChangeText={setInput}
          placeholderTextColor="#94A3B8"
          textAlign="right"
          multiline
        />
        <Animated.View style={{ transform: [{ scale: sendBtnScale }] }}>
          <TouchableOpacity
            style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.sendIcon}>📤</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// 💬 مكون الرسالة مع أنيميشن
function MessageBubble({ item, index }) {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.bubble,
      item.sender === 'user' ? styles.userBubble : styles.botBubble,
      { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
    ]}>
      <View style={[
        styles.bubbleContent,
        item.sender === 'user' ? styles.userContent : styles.botContent,
      ]}>
        <Text style={item.sender === 'user' ? styles.userText : styles.botText}>
          {item.text}
        </Text>
        <Text style={styles.time}>
          {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  // هيدر
  header: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  backText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  botCircle: {
    width: 50, height: 50, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  botEmoji: { fontSize: 26 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },

  // محادثة
  chatContainer: { flex: 1 },
  chatList: { padding: 16, flexGrow: 1 },

  // فقاعة
  bubble: { marginBottom: 12, maxWidth: '82%' },
  userBubble: { alignSelf: 'flex-end' },
  botBubble: { alignSelf: 'flex-start' },
  bubbleContent: { padding: 14, borderRadius: 18 },
  userContent: { backgroundColor: '#1E40AF', borderBottomRightRadius: 4, shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  botContent: { backgroundColor: '#FFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  userText: { color: '#FFF', fontSize: 15, lineHeight: 22 },
  botText: { color: '#1E293B', fontSize: 15, lineHeight: 22, textAlign: 'right' },
  time: { fontSize: 9, color: '#94A3B8', textAlign: 'right', marginTop: 6 },

  // كتابة
  typingRow: { alignSelf: 'flex-start', marginBottom: 10, paddingLeft: 8 },
  typingBubble: {
    flexDirection: 'row', gap: 5,
    backgroundColor: '#FFF', padding: 14, borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E40AF' },

  // اقتراحات
  suggestions: { marginBottom: 20 },
  suggestTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 12 },
  suggestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  suggestIcon: { fontSize: 16 },
  suggestText: { fontSize: 13, color: '#1E293B', fontWeight: '600' },

  // إدخال
  inputBar: {
    flexDirection: 'row', padding: 12, backgroundColor: '#FFF',
    borderTopWidth: 1, borderTopColor: '#E2E8F0', alignItems: 'flex-end', gap: 8,
  },
  input: {
    flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#1E293B', maxHeight: 100,
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: '#1E40AF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  sendBtnDisabled: { backgroundColor: '#93C5FD' },
  sendIcon: { fontSize: 20 },
});