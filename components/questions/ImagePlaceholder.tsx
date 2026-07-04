import { StyleSheet, Text, View } from 'react-native';

import { t } from '../../lib/i18n';
import { colors } from '../../lib/theme';

export function ImagePlaceholder() {
  return (
    <View
      accessible
      accessibilityLabel={t('assessment.imageReferenceAccessibility')}
      accessibilityRole="image"
      style={styles.placeholder}
    >
      <View style={styles.marker}>
        <View style={styles.markerSun} />
        <View style={styles.markerPerch} />
        <View style={styles.markerBody} />
      </View>
      <Text style={styles.caption}>{t('assessment.imageReferenceCaption')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 54,
    padding: 10,
  },
  marker: {
    backgroundColor: colors.mint,
    borderColor: colors.lineStrong,
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    overflow: 'hidden',
    position: 'relative',
    width: 42,
  },
  markerSun: {
    backgroundColor: '#F3C84B',
    borderRadius: 5,
    height: 10,
    left: 7,
    position: 'absolute',
    top: 7,
    width: 10,
  },
  markerPerch: {
    backgroundColor: colors.lineStrong,
    bottom: 8,
    height: 2,
    left: 7,
    position: 'absolute',
    right: 7,
  },
  markerBody: {
    backgroundColor: colors.spruce,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 5,
    bottom: 10,
    height: 14,
    position: 'absolute',
    right: 9,
    width: 12,
  },
  caption: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
