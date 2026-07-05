import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../lib/theme';

type Props = {
  title: string;
  description?: string;
};

export function SectionHeader({ title, description }: Props) {
  return (
    <View style={styles.band}>
      <View style={styles.accent} />
      <Text accessibilityRole="header" aria-level={1} style={styles.title}>
        {title}
      </Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    backgroundColor: colors.spruce,
    borderRadius: 8,
    gap: 8,
    padding: 14,
  },
  accent: {
    backgroundColor: colors.mint,
    borderRadius: 2,
    height: 4,
    width: 58,
  },
  title: {
    color: colors.paper,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  description: {
    color: colors.mint,
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 560,
  },
});
