import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type {
  IndicatorIcon,
  MultiChoiceQuestion as MultiChoiceQuestionContent,
} from '../../content/schema';
import { colors } from '../../lib/theme';
import { FlagBadges, getChoiceAccessibilityLabel, IndicatorBadge } from './Badges';
import { ImagePlaceholder } from './ImagePlaceholder';

type Props = {
  question: MultiChoiceQuestionContent;
  indicatorIcon: IndicatorIcon;
  selectedOptionIds: string[];
  optionText: string;
  onToggleOption: (optionId: string) => void;
  onChangeOptionText: (value: string) => void;
  disabled?: boolean;
};

export function MultiChoiceQuestion({
  question,
  indicatorIcon,
  selectedOptionIds,
  optionText,
  onToggleOption,
  onChangeOptionText,
  disabled = false,
}: Props) {
  const hasIndicators = question.options.some((option) => option.welfare_level !== null);
  const selectedOptions = new Set(selectedOptionIds);

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{question.prompt}</Text>
      {question.help ? <Text style={styles.help}>{question.help}</Text> : null}
      {question.note ? <Text style={styles.note}>{question.note}</Text> : null}
      {question.image_ref ? <ImagePlaceholder /> : null}
      <View style={styles.options}>
        {question.options.map((option) => {
          const checked = selectedOptions.has(option.id);

          return (
            <View key={option.id} style={styles.optionBlock}>
              <Pressable
                accessibilityLabel={getChoiceAccessibilityLabel(
                  option.label,
                  option.welfare_level,
                  option.flags,
                )}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled }}
                disabled={disabled}
                onPress={() => onToggleOption(option.id)}
                style={[
                  styles.optionCard,
                  checked ? styles.optionCardSelected : null,
                  disabled ? styles.optionCardDisabled : null,
                ]}
              >
                <View style={styles.optionRow}>
                  <View style={[styles.checkbox, checked ? styles.checkboxSelected : null]}>
                    {checked ? <View style={styles.checkboxMark} /> : null}
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
              {checked && option.allow_text ? (
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
  checkbox: {
    alignItems: 'center',
    borderColor: colors.textMuted,
    borderRadius: 3,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
    marginTop: 2,
    width: 18,
  },
  checkboxSelected: {
    borderColor: colors.spruce,
  },
  checkboxMark: {
    backgroundColor: colors.spruce,
    borderRadius: 2,
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
