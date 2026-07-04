import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  IndicatorIcon,
  ScaleQuestion as ScaleQuestionContent,
} from '../../content/schema';
import { FlagBadges, getChoiceAccessibilityLabel, IndicatorBadge } from './Badges';
import { ImagePlaceholder } from './ImagePlaceholder';

type Props = {
  question: ScaleQuestionContent;
  indicatorIcon: IndicatorIcon;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
};

export function ScaleQuestion({
  question,
  indicatorIcon,
  selectedOptionId,
  onSelectOption,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{question.prompt}</Text>
      {question.help ? <Text style={styles.help}>{question.help}</Text> : null}
      {question.image_ref ? <ImagePlaceholder label={question.prompt} /> : null}
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
              accessibilityState={{ selected }}
              key={option.id}
              onPress={() => onSelectOption(option.id)}
              style={[styles.optionCard, selected ? styles.optionCardSelected : null]}
            >
              <View style={styles.optionRow}>
                <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <IndicatorBadge
                  indicatorIcon={indicatorIcon}
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
    color: '#17352F',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  help: {
    backgroundColor: '#E9EFEC',
    borderRadius: 8,
    color: '#3F5750',
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
  },
  options: {
    gap: 8,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2DDD8',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 54,
    padding: 12,
  },
  optionCardSelected: {
    borderColor: '#12312A',
  },
  optionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  radio: {
    alignItems: 'center',
    borderColor: '#536B63',
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
    marginTop: 2,
    width: 18,
  },
  radioSelected: {
    borderColor: '#12312A',
  },
  radioDot: {
    backgroundColor: '#12312A',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  optionContent: {
    flex: 1,
    flexShrink: 1,
  },
  optionLabel: {
    color: '#17352F',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
  },
  detail: {
    color: '#3F5750',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
