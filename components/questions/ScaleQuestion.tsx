import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  IndicatorIcon,
  ScaleQuestion as ScaleQuestionContent,
} from '../../content/schema';
import { colors } from '../../lib/theme';
import { FlagBadges, getChoiceAccessibilityLabel, IndicatorBadge } from './Badges';
import { InstrumentImage } from './InstrumentImage';

type Props = {
  question: ScaleQuestionContent;
  indicatorIcon: IndicatorIcon;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  disabled?: boolean;
};

export function ScaleQuestion({
  question,
  indicatorIcon,
  selectedOptionId,
  onSelectOption,
  disabled = false,
}: Props) {
  const hasIndicators = question.options.some((option) => option.welfare_level !== null);
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{question.prompt}</Text>
      <FlagBadges flags={question.flags ?? []} />
      {question.help ? <Text style={styles.help}>{question.help}</Text> : null}
      {question.note ? <Text style={styles.note}>{question.note}</Text> : null}
      {question.image_ref ? <InstrumentImage imageRef={question.image_ref} /> : null}
      <View style={styles.options}>
        {question.options.map((option) => {
          const selected = selectedOptionId === option.id;
          const detail = option.detail ?? '';

          return (
            <Pressable
              accessibilityLabel={getChoiceAccessibilityLabel(
                option.label,
                option.welfare_level,
                option.flags,
                detail.length > 0 ? [detail] : [],
              )}
              accessibilityRole="radio"
              accessibilityState={{ disabled, selected }}
              disabled={disabled}
              key={option.id}
              onPress={() => onSelectOption(option.id)}
              style={[
                styles.optionCard,
                selected ? styles.optionCardSelected : null,
                disabled ? styles.optionCardDisabled : null,
              ]}
            >
              <View style={styles.optionRow}>
                <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <IndicatorBadge
                  indicatorIcon={indicatorIcon}
                  reserveSpace={hasIndicators}
                  welfareLevel={option.welfare_level}
                />
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {detail.length > 0 ? <Text style={styles.detail}>{detail}</Text> : null}
                  <FlagBadges flags={option.flags} />
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  prompt: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  help: {
    backgroundColor: colors.help,
    borderLeftColor: colors.spruce,
    borderLeftWidth: 3,
    borderRadius: 8,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
  },
  note: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  options: {
    gap: 8,
  },
  optionCard: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 2,
    minHeight: 54,
    padding: 12,
  },
  optionCardSelected: {
    borderColor: colors.spruce,
  },
  optionCardDisabled: {
    backgroundColor: colors.mint,
  },
  optionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  radio: {
    alignItems: 'center',
    borderColor: colors.textMuted,
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
    marginTop: 2,
    width: 18,
  },
  radioSelected: {
    borderColor: colors.spruce,
  },
  radioDot: {
    backgroundColor: colors.spruce,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  optionContent: {
    flex: 1,
    flexShrink: 1,
  },
  optionLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  detail: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
