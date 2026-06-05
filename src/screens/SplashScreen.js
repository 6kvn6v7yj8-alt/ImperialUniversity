import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';

export default function SplashScreen({ navigation }) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(progressWidth, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setTimeout(() => {
        navigation.replace('Onboarding');
      }, 300);
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View
        style={[
          styles.logoBox,
          {
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          },
        ]}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.Text style={[styles.title, { opacity: textOpacity }]}>
        IMPERIAL UNIVIRISTY COLLAGE
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, { opacity: textOpacity }]}>
        كلية امبريال الجامعية
      </Animated.Text>

      <View style={styles.progressBg}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.loading}>جاري التحميل...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 300,
    backgroundColor: 'rgba(30,64,175,0.2)',
    top: -100,
    right: -80,
  },
  bgCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 200,
    backgroundColor: 'rgba(30,64,175,0.1)',
    bottom: -50,
    left: -50,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    marginBottom: 28,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#93C5FD',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 36,
  },
  progressBg: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1E40AF',
    borderRadius: 2,
  },
  loading: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
  },
});
