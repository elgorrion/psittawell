import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type {
  IndicatorIcon,
  SingleChoiceQuestion as SingleChoiceQuestionContent,
  YesNoQuestion,
} from '../../content/schema';
import { FlagBadges, getChoiceAccessibilityLabel, IndicatorBadge } from './Badges';
import { ImagePlaceholder } from './ImagePlaceholder';

type Props = {
  question: SingleChoiceQuestionContent | YesNoQuestion;
  indicatorIcon: IndicatorIcon;
  selectedOptionId: string | null;
  optionText: string;
  onSelectOption: (optionId: string) => void;
  onChangeOptionText: (value: string) => void;
};

export function SingleChoiceQuestion({
  question,
  indicatorIcon,
  selectedOptionId,
  optionText,
  onSelectOption,
  onChangeOptionText,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{question.prompt}</Text>
      {question.help ? <Text style={styles.help}>{question.help}</Text> : null}
      {question.image_ref ? <ImagePlaceholder label={question.prompt} /> : null}
      <View style={styles.options}>
        {question.options.map((option) => {
          const selected = selectedOptionId === option.id;

          return (
            <View key={option.id} style={styles.optionBlock}>
              <Pressable
                accessibilityLabel={getChoiceAccessibilityLabel(
                  option.label,
                  option.welfare_level,
                  option.flags,
                )}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
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
                    <FlagBadges flags={option.flags} />
                  </View>
                </View>
                {option.image_ref ? <ImagePlaceholder label={String(option.label)} /> : null}
              </Pressable>
              {selected && option.allow_text ? (
                <TextInput
                  accessibilityLabel={getChoiceAccessibilityLabel(
                    option.label,
                    option.welfare_level,
                    option.flags,
                  )}
                  onChangeText={onChangeOptionText}
                  style={styles.optionTextInput}
                  value={optionText}
                />
              ) : null}
            </View>
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
  optionBlock: {
    gap: 8,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2DDD8',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    minHeight: 48,
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
    fontSize: 16,
    lineHeight: 22,
  },
  optionTextInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#AEBDB7',
    borderRadius: 8,
    borderWidth: 1,
    color: '#132D28',
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12,
  },
});
