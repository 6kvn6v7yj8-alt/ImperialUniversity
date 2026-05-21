import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Shadows, Radius } from '../theme';

export default function GlassCard({ children, style, blur = 10 }) {
  return (
    <View style={[styles.card, Shadows.glass, style]}>
      <View style={styles.glass}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backdropFilter: 'blur(10px)',
  },
  glass: {
    backgroundColor: Colors.glass,
    padding: 18,
  },
});