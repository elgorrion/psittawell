import { StyleSheet, Text, View } from 'react-native';

import { t } from '../../lib/i18n';

type Props = {
  label: string;
};

export function ImagePlaceholder({ label }: Props) {
  return (
    <View
      accessibilityLabel={t('assessment.imagePlaceholderAccessibility', { label })}
      accessibilityRole="image"
      style={styles.placeholder}
    >
      <Text style={styles.title}>{t('assessment.imagePlaceholder')}</Text>
      <Text numberOfLines={2} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#F1F5F3',
    borderColor: '#C8D5CF',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 4,
    minHeight: 72,
    padding: 10,
  },
  title: {
    color: '#536B63',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  label: {
    color: '#2F4C44',
    fontSize: 13,
    lineHeight: 18,
  },
});
