import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image } from 'react-native';

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const bgCircle1 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      Animated.timing(contentFade, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bgCircle1, { toValue: 1, duration: 4000, useNativeDriver: false }),
        Animated.timing(bgCircle1, { toValue: 0, duration: 4000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const circleMove = bgCircle1.interpolate({ inputRange: [0, 1], outputRange: [0, 25] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bgCircle, { transform: [{ translateY: circleMove }, { translateX: circleMove }] }]} />
      <Animated.View style={[styles.bgCircle2, { transform: [{ translateY: bgCircle1.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }] }]} />

      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
          <Image 
            source={require('../../../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={[styles.textBox, { opacity: contentFade }]}>
          <Text style={styles.title}>جامعة إمبريال</Text>
          <Text style={styles.subtitle}>Imperial University</Text>
          <Text style={styles.desc}>التميز في التعليم - مستقبلك يبدأ من هنا</Text>
        </Animated.View>

        <Animated.View style={{ opacity: contentFade, width: '100%', transform: [{ translateY: contentFade.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
            <Text style={styles.buttonText}>ابدأ رحلتك</Text>
            <Text style={styles.buttonArrow}>→</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bgCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: 'rgba(30, 64, 175, 0.08)',
    top: -100,
    right: -80,
  },
  bgCircle2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: 'rgba(30, 64, 175, 0.05)',
    bottom: -60,
    left: -60,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
    zIndex: 1,
  },
  logoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(30, 64, 175, 0.1)',
  },
  logo: {
    width: 160,
    height: 160,
    borderRadius: 12,
  },
  textBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 28,
    marginBottom: 36,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#1E40AF',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  desc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1E40AF',
    paddingVertical: 17,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
  buttonArrow: {
    color: '#FFF',
    fontSize: 20,
  },
});
