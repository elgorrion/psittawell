import { StyleSheet, Text, View } from 'react-native';

import type { IndicatorIcon, OptionFlag, WelfareLevel } from '../../content/schema';
import { t } from '../../lib/i18n';

type IndicatorBadgeProps = {
  welfareLevel: WelfareLevel | null;
  indicatorIcon: IndicatorIcon;
  reserveSpace?: boolean;
};

type FlagBadgesProps = {
  flags: OptionFlag[];
};

export function IndicatorBadge({
  welfareLevel,
  indicatorIcon,
  reserveSpace = true,
}: IndicatorBadgeProps) {
  if (welfareLevel === null) {
    return reserveSpace ? <View accessible={false} style={styles.indicatorSpacer} /> : null;
  }

  return (
    <View
      accessible
      accessibilityLabel={t(`assessment.welfareLevels.${welfareLevel}`)}
      accessibilityRole="image"
      style={[
        styles.indicator,
        indicatorShapes[indicatorIcon],
        {
          backgroundColor: welfareLevelColors[welfareLevel],
          borderColor: welfareLevelBorders[welfareLevel],
        },
      ]}
    />
  );
}

export function FlagBadges({ flags }: FlagBadgesProps) {
  if (flags.length === 0) {
    return null;
  }

  return (
    <View style={styles.flags}>
      {flags.map((flag) => (
        <FlagBadge flag={flag} key={flag} />
      ))}
    </View>
  );
}

export function FlagBadge({ flag }: { flag: OptionFlag }) {
  return (
    <View
      accessible
      accessibilityLabel={getFlagAccessibilityLabel(flag)}
      style={[styles.flag, flagStyles[flag]]}
    >
      {flag === 'dont_know' ? null : <View style={[styles.flagDot, flagDotStyles[flag]]} />}
      <Text numberOfLines={1} style={[styles.flagText, flagTextStyles[flag]]}>
        {t(`assessment.flags.${flag}.text`)}
      </Text>
    </View>
  );
}

export function getChoiceAccessibilityLabel(
  label: string | number,
  welfareLevel: WelfareLevel | null,
  flags: OptionFlag[],
  extraParts: string[] = [],
) {
  const parts = [String(label), ...extraParts.filter((part) => part.length > 0)];

  if (welfareLevel !== null) {
    parts.push(t(`assessment.welfareLevels.${welfareLevel}`));
  }

  for (const flag of flags) {
    parts.push(getFlagAccessibilityLabel(flag));
  }

  return parts.join(', ');
}

export function getFlagAccessibilityLabel(flag: OptionFlag) {
  return t(`assessment.flags.${flag}.accessibilityLabel`);
}

export const welfareLevelColors: Record<WelfareLevel, string> = {
  optimal: '#146C43',
  good: '#6FAF4F',
  moderate: '#C28A00',
  elevated_risk: '#C95D00',
  high_risk: '#A52714',
};

const welfareLevelBorders: Record<WelfareLevel, string> = {
  optimal: '#0F5132',
  good: '#3F7F2D',
  moderate: '#7A5600',
  elevated_risk: '#7A3800',
  high_risk: '#6F1A0E',
};

const indicatorShapes = StyleSheet.create({
  circle: {
    borderRadius: 8,
  },
  parrot: {
    borderRadius: 3,
  },
  house: {
    borderRadius: 3,
  },
  hand: {
    borderRadius: 3,
  },
});

const flagStyles = StyleSheet.create({
  dont_know: {
    backgroundColor: '#E7F0F4',
    borderColor: '#B7CCD6',
  },
  vet_concern: {
    backgroundColor: '#F6EEDC',
    borderColor: '#DFC894',
  },
  vet_urgent: {
    backgroundColor: '#FBE7E1',
    borderColor: '#E7B3A6',
  },
  behaviour_urgent: {
    backgroundColor: '#F1E9F6',
    borderColor: '#D0BEDE',
  },
  context_dependent: {
    backgroundColor: '#E7EFE9',
    borderColor: '#BAD1C1',
  },
});

const flagDotStyles = StyleSheet.create({
  dont_know: { backgroundColor: '#3F6474' },
  vet_concern: { backgroundColor: '#9A751F' },
  vet_urgent: { backgroundColor: '#B23A22' },
  behaviour_urgent: { backgroundColor: '#6A4A82' },
  context_dependent: { backgroundColor: '#43744F' },
});

const flagTextStyles = StyleSheet.create({
  dont_know: { color: '#274A57' },
  vet_concern: { color: '#6E5316' },
  vet_urgent: { color: '#8A2C18' },
  behaviour_urgent: { color: '#4E3562' },
  context_dependent: { color: '#2F5138' },
});

const styles = StyleSheet.create({
  indicator: {
    borderWidth: 1,
    height: 16,
    width: 16,
  },
  indicatorSpacer: {
    height: 16,
    width: 16,
  },
  flags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  flag: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  flagDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  flagText: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 16,
  },
});
