import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type {
  IndicatorIcon,
  SingleChoiceQuestion as SingleChoiceQuestionContent,
  YesNoQuestion,
} from '../../content/schema';
import { colors } from '../../lib/theme';
import { FlagBadges, getChoiceAccessibilityLabel, IndicatorBadge } from './Badges';
import { ImagePlaceholder } from './ImagePlaceholder';

type Props = {
  question: SingleChoiceQuestionContent | YesNoQuestion;
  indicatorIcon: IndicatorIcon;
  selectedOptionId: string | null;
  optionText: string;
  onSelectOption: (optionId: string) => void;
  onChangeOptionText: (value: string) => void;
  disabled?: boolean;
};

export function SingleChoiceQuestion({
  question,
  indicatorIcon,
  selectedOptionId,
  optionText,
  onSelectOption,
  onChangeOptionText,
  disabled = false,
}: Props) {
  const hasIndicators = question.options.some((option) => option.welfare_level !== null);
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{question.prompt}</Text>
      <FlagBadges flags={question.flags ?? []} />
      {question.help ? <Text style={styles.help}>{question.help}</Text> : null}
      {question.note ? <Text style={styles.note}>{question.note}</Text> : null}
      {question.image_ref ? <ImagePlaceholder /> : null}
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
                accessibilityState={{ disabled, selected }}
                disabled={disabled}
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
                    <FlagBadges flags={option.flags} />
                  </View>
                </View>
                {option.image_ref ? <ImagePlaceholder /> : null}
              </Pressable>
              {selected && option.allow_text ? (
                <TextInput
                  accessibilityLabel={getChoiceAccessibilityLabel(
                    option.label,
                    option.welfare_level,
                    option.flags,
                  )}
                  editable={!disabled}
                  onChangeText={onChangeOptionText}
                  style={[
                    styles.optionTextInput,
                    disabled ? styles.optionTextInputDisabled : null,
                  ]}
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
  optionBlock: {
    gap: 8,
  },
  optionCard: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 2,
    gap: 10,
    minHeight: 48,
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
    fontSize: 16,
    lineHeight: 22,
  },
  optionTextInput: {
    backgroundColor: colors.paper,
    borderColor: colors.lineStrong,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  optionTextInputDisabled: {
    backgroundColor: colors.mint,
    color: colors.textMuted,
  },
});
