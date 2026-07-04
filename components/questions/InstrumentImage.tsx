import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { getInstrumentImage, getInstrumentImageCredit } from '../../lib/instrumentImages';
import { t } from '../../lib/i18n';
import { colors } from '../../lib/theme';

type Props = {
  imageRef: string;
};

const thumbnailMaxHeight = 200;

export function InstrumentImage({ imageRef }: Props) {
  const imageSource = getInstrumentImage(imageRef);
  const [expanded, setExpanded] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  if (imageSource === null) {
    return <ImagePlaceholder />;
  }

  const credit = getInstrumentImageCredit(imageRef);
  const resolvedSource =
    typeof Image.resolveAssetSource === 'function' ? Image.resolveAssetSource(imageSource) : null;
  const aspectRatio =
    resolvedSource?.width && resolvedSource.height
      ? resolvedSource.width / resolvedSource.height
      : 1;
  const thumbnailHeight =
    containerWidth === null
      ? thumbnailMaxHeight
      : Math.min(thumbnailMaxHeight, Math.round(containerWidth / aspectRatio));
  const accessibilityLabel = credit
    ? t('assessment.instrumentImageAccessibilityWithCredit', { credit })
    : t('assessment.instrumentImageAccessibility');

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityHint={t('assessment.instrumentImageExpandHint')}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="imagebutton"
        onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
        onPress={() => setExpanded(true)}
      >
        <Image
          resizeMode="contain"
          source={imageSource}
          style={[styles.image, { height: thumbnailHeight }]}
        />
      </Pressable>
      <View style={styles.captionRow}>
        {credit ? <Text style={styles.credit}>{credit}</Text> : <View style={styles.creditSpacer} />}
        <Text style={styles.expandHint}>{t('assessment.instrumentImageExpandHint')}</Text>
      </View>
      <Modal
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
        transparent
        visible={expanded}
      >
        <View style={styles.viewerBackdrop}>
          <Pressable
            accessibilityLabel={t('assessment.instrumentImageCloseLabel')}
            accessibilityRole="button"
            onPress={() => setExpanded(false)}
            style={styles.viewerCloseButton}
          >
            <Text style={styles.viewerCloseText}>✕</Text>
          </Pressable>
          <Pressable onPress={() => setExpanded(false)} style={styles.viewerImageArea}>
            <Image
              accessibilityLabel={accessibilityLabel}
              accessibilityRole="image"
              resizeMode="contain"
              source={imageSource}
              style={styles.viewerImage}
            />
          </Pressable>
          {credit ? <Text style={styles.viewerCredit}>{credit}</Text> : null}
        </View>
      </Modal>
    </View>
  );
}

function ImagePlaceholder() {
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
  container: {
    gap: 6,
  },
  image: {
    backgroundColor: '#F8FAF9',
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
  },
  captionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  credit: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  creditSpacer: {
    flex: 1,
  },
  expandHint: {
    color: colors.spruceDark,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  viewerBackdrop: {
    backgroundColor: 'rgba(8, 20, 16, 0.96)',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  viewerCloseButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    height: 44,
    justifyContent: 'center',
    marginTop: 28,
    width: 44,
  },
  viewerCloseText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  viewerImageArea: {
    flex: 1,
    justifyContent: 'center',
  },
  viewerImage: {
    height: '100%',
    width: '100%',
  },
  viewerCredit: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
    paddingBottom: 20,
    textAlign: 'center',
  },
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
