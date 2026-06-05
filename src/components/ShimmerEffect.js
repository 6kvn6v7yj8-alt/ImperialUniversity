import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export default function ShimmerEffect({ width = 200, height = 20, style }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});