import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme';

const iconMap = {
  home: '⌂',
  calendar: '◷',
  book: '▣',
  chart: '◧',
  qr: '⊞',
  library: '⊟',
  payment: '◇',
  notification: '◎',
  chat: '◉',
  profile: '○',
  settings: '⚙',
  logout: '⇥',
  back: '←',
  next: '→',
  check: '✓',
  plus: '+',
  delete: '×',
  edit: '✎',
  search: '⌕',
  star: '★',
  heart: '♡',
};

export default function IconBox({ name, size = 24, style }) {
  return (
    <View style={[styles.box, style]}>
      <Text style={[styles.icon, { fontSize: size }]}>
        {iconMap[name] || '●'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    color: Colors.primary,
  },
});