import { StyleSheet, Text, View } from 'react-native';

import { type OptionFlag, type Section, welfareLevels } from '../content/schema';
import { t } from '../lib/i18n';
import { colors } from '../lib/theme';
import { FlagBadge, welfareLevelColors } from './questions/Badges';

const legendFlagOrder: OptionFlag[] = [
  'dont_know',
  'vet_concern',
  'vet_urgent',
  'behaviour_urgent',
  'context_dependent',
];

type Props = {
  section: Section;
};

type DirectionRow = {
  id: string;
  good: string;
  risk: string;
};

export function SectionLegend({ section }: Props) {
  const flags = getSectionLegendFlags(section);
  const guidance = getSectionLegendGuidance(section.interpretation);
  const directionRows = getSectionLegendDirectionRows(section);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('assessment.legend.title')}</Text>
      <View style={styles.directionRows}>
        {directionRows.map((row) => (
          <View key={row.id} style={styles.directionRow}>
            <Text style={styles.goodDirection}>{row.good}</Text>
            <Text style={styles.riskDirection}>{row.risk}</Text>
          </View>
        ))}
      </View>
      <View
        accessible
        accessibilityLabel={t('assessment.legend.gradientAccessibility')}
        accessibilityRole="image"
        style={styles.gradientGroup}
      >
        <View style={styles.swatchRow}>
          {welfareLevels.map((level, index) => (
            <View
              key={level}
              style={[
                styles.swatch,
                { backgroundColor: welfareLevelColors[level] },
                index === 0 ? styles.firstSwatch : null,
                index === welfareLevels.length - 1 ? styles.lastSwatch : null,
              ]}
            />
          ))}
        </View>
        <View style={styles.swatchLabels}>
          {welfareLevels.map((level) => (
            <Text key={level} numberOfLines={2} style={styles.swatchLabel}>
              {t(`assessment.welfareLevelShort.${level}`)}
            </Text>
          ))}
        </View>
      </View>
      <Text style={styles.orderingNote}>{t('assessment.legend.orderingNote')}</Text>
      {flags.length > 0 ? (
        <View style={styles.markers}>
          <Text style={styles.markersTitle}>{t('assessment.legend.markersTitle')}</Text>
          {flags.map((flag) => (
            <View key={flag} style={styles.markerRow}>
              <View style={styles.markerBadgeColumn}>
                <FlagBadge flag={flag} />
              </View>
              <Text style={styles.markerDefinition}>
                {t(`assessment.flags.${flag}.definition`)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.guidance}>{guidance}</Text>
    </View>
  );
}

export function getSectionLegendFlags(section: Section): OptionFlag[] {
  const usedFlags = new Set<OptionFlag>();

  for (const question of section.questions) {
    for (const flag of question.flags ?? []) {
      usedFlags.add(flag);
    }

    if (question.type === 'free_text') {
      continue;
    }

    if (question.type === 'matrix') {
      for (const rowGroup of question.row_groups) {
        for (const column of rowGroup.columns) {
          for (const flag of column.flags) {
            usedFlags.add(flag);
          }
        }
      }

      continue;
    }

    if (question.type === 'grid') {
      for (const columnGroup of question.column_groups) {
        for (const column of columnGroup.columns) {
          for (const flag of column.flags) {
            usedFlags.add(flag);
          }
        }
      }

      for (const row of question.rows) {
        for (const flag of row.flags ?? []) {
          usedFlags.add(flag);
        }
      }

      continue;
    }

    for (const option of question.options) {
      for (const flag of option.flags) {
        usedFlags.add(flag);
      }
    }
  }

  return legendFlagOrder.filter((flag) => usedFlags.has(flag));
}

export function getSectionLegendDirectionRows(section: Section): DirectionRow[] {
  const welfareDirection = {
    id: 'welfare',
    good: t('assessment.legend.goodDirection'),
    risk: t('assessment.legend.riskDirection'),
  };
  const parrotDirection = {
    id: 'parrot',
    good: t('assessment.legend.goodWelfareIndicator'),
    risk: t('assessment.legend.compromisedWelfareIndicator'),
  };

  if (section.id === 's7_human') {
    return [
      {
        id: 'hand',
        good: t('assessment.legend.handGoodDirection'),
        risk: t('assessment.legend.handRiskDirection'),
      },
      parrotDirection,
    ];
  }

  if (section.indicator_icon === 'parrot') {
    return [parrotDirection];
  }

  return [welfareDirection];
}

export function getSectionLegendGuidance(interpretation: string): string {
  const sentences = interpretation
    .match(/[^.]+(?:\.|$)/g)
    ?.map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  if (!sentences || sentences.length === 0) {
    return interpretation;
  }

  return sentences[sentences.length - 1];
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.paper,
    borderColor: colors.spruce,
    borderRadius: 8,
    borderWidth: 2,
    gap: 14,
    padding: 14,
  },
  title: {
    color: colors.slate,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
  },
  directionRows: {
    gap: 8,
  },
  directionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  goodDirection: {
    color: welfareLevelColors.optimal,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  riskDirection: {
    color: welfareLevelColors.high_risk,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'right',
  },
  gradientGroup: {
    gap: 7,
  },
  swatchRow: {
    flexDirection: 'row',
    height: 14,
  },
  swatch: {
    flex: 1,
  },
  firstSwatch: {
    borderBottomLeftRadius: 7,
    borderTopLeftRadius: 7,
  },
  lastSwatch: {
    borderBottomRightRadius: 7,
    borderTopRightRadius: 7,
  },
  swatchLabels: {
    flexDirection: 'row',
    gap: 6,
  },
  swatchLabel: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  orderingNote: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  markers: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  markersTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  markerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  markerBadgeColumn: {
    width: 132,
  },
  markerDefinition: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  guidance: {
    backgroundColor: colors.mint,
    borderRadius: 8,
    color: colors.slate,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    padding: 12,
  },
});
