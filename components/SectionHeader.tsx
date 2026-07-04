import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../lib/theme';

type Props = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function SectionHeader({ title, description, children }: Props) {
  return (
    <View style={styles.band}>
      <View style={styles.accent} />
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    backgroundColor: colors.spruce,
    borderRadius: 8,
    gap: 10,
    padding: 18,
  },
  accent: {
    backgroundColor: colors.mint,
    borderRadius: 2,
    height: 4,
    width: 68,
  },
  title: {
    color: colors.paper,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  description: {
    color: colors.mint,
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 560,
  },
});
