import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image } from 'react-native';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: 'مرحباً بك في',
    subtitle: 'كلية إمبريال الجامعية',
    description: 'منصتك التعليمية المتكاملة لكل ما تحتاجه في حياتك الجامعية',
    icon: '🎓',
    color: '#1E40AF',
  },
  {
    id: 2,
    title: 'كل شيء في مكان واحد',
    subtitle: '',
    description: 'جدولك الدراسي، مكتبتك الرقمية، نتائجك، حضورك، والمزيد',
    icon: '📱',
    color: '#3B82F6',
  },
  {
    id: 3,
    title: 'تواصل وتفاعل',
    subtitle: '',
    description: 'تواصل مع دكاترتك وزملائك، استلم إشعارات فورية، وتابع كل جديد',
    icon: '💬',
    color: '#2563EB',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [currentIndex]);

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -30,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex(currentIndex + 1);
        slideAnim.setValue(30);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      navigation.replace('Login');
    }
  };

  const skipAll = () => {
    navigation.replace('Login');
  };

  const slide = slides[currentIndex];

  return (
    <View style={styles.container}>
      {/* الخلفية */}
      <View style={styles.background}>
        <View style={[styles.bgCircle, styles.bgCircle1]} />
        <View style={[styles.bgCircle, styles.bgCircle2]} />
        <View style={[styles.bgCircle, styles.bgCircle3]} />
      </View>

      {/* زر تخطي */}
      <TouchableOpacity style={styles.skipBtn} onPress={skipAll}>
        <Text style={styles.skipText}>تخطي ←</Text>
      </TouchableOpacity>

      {/* المحتوى */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* أيقونة كبيرة */}
        <View style={[styles.iconCircle, { backgroundColor: slide.color + '20' }]}>
          <Text style={styles.icon}>{slide.icon}</Text>
        </View>

        {/* العنوان */}
        <Text style={styles.title}>{slide.title}</Text>
        {slide.subtitle ? (
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        ) : null}
        <Text style={styles.description}>{slide.description}</Text>
      </Animated.View>

      {/* الجزء السفلي */}
      <View style={styles.bottom}>
        {/* نقاط التنقل */}
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setCurrentIndex(index);
                fadeAnim.setValue(0);
                slideAnim.setValue(30);
                Animated.parallel([
                  Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                  }),
                  Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                  }),
                ]).start();
              }}
            >
              <Animated.View
                style={[
                  styles.dot,
                  currentIndex === index && styles.dotActive,
                  currentIndex === index && {
                    transform: [
                      {
                        scale: dotAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.3],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* زر التالي */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: slide.color }]}
            onPress={goToNext}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {currentIndex === slides.length - 1 ? '🚀 ابدأ الآن' : 'التالي ←'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* لوجو صغير في الأسفل */}
      <View style={styles.footerLogo}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.footerLogoImg}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  background: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  bgCircle1: {
    width: 400,
    height: 400,
    backgroundColor: 'rgba(30, 64, 175, 0.06)',
    top: -150,
    right: -100,
  },
  bgCircle2: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(59, 130, 246, 0.04)',
    bottom: 100,
    left: -80,
  },
  bgCircle3: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    top: '35%',
    left: '50%',
  },

  skipBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 10,
  },
  skipText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '700',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -40,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    fontSize: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E40AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },

  bottom: {
    paddingHorizontal: 32,
    paddingBottom: 30,
    alignItems: 'center',
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    backgroundColor: '#1E40AF',
    width: 28,
  },
  button: {
    width: width - 64,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },

  footerLogo: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    opacity: 0.3,
  },
  footerLogoImg: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
});
