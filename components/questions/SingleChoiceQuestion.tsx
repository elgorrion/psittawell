import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type {
  ChoiceQuestion,
  IndicatorIcon,
  Option,
  WelfareLevel,
} from '../../content/schema';

type SingleChoiceContent = ChoiceQuestion & {
  type: 'single_choice';
};

type Props = {
  question: SingleChoiceContent;
  indicatorIcon: IndicatorIcon;
  selectedOptionId: string | null;
  optionText: string;
  onSelectOption: (optionId: string) => void;
  onChangeOptionText: (value: string) => void;
};

const observeMoreIndicator = '\uD83D\uDD0D';

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
      <View style={styles.options}>
        {question.options.map((option) => {
          const selected = selectedOptionId === option.id;

          return (
            <View key={option.id} style={styles.optionBlock}>
              <Pressable
                accessibilityLabel={String(option.label)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onSelectOption(option.id)}
                style={styles.optionRow}
              >
                <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                {renderIndicator(option, indicatorIcon)}
                <Text style={styles.optionLabel}>{option.label}</Text>
                {option.flags.includes('dont_know') ? (
                  <Text accessible={false} style={styles.observeMore}>
                    {observeMoreIndicator}
                  </Text>
                ) : null}
              </Pressable>
              {selected && option.allow_text ? (
                <TextInput
                  accessibilityLabel={String(option.label)}
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

function renderIndicator(option: Option, indicatorIcon: IndicatorIcon) {
  if (option.welfare_level === null) {
    return null;
  }

  if (indicatorIcon !== 'circle') {
    return <View accessible={false} style={[styles.circle, getCircleStyle(option.welfare_level)]} />;
  }

  return <View accessible={false} style={[styles.circle, getCircleStyle(option.welfare_level)]} />;
}

function getCircleStyle(welfareLevel: WelfareLevel) {
  return {
    backgroundColor: welfareLevelColors[welfareLevel],
    borderColor: welfareLevelBorders[welfareLevel],
  };
}

const welfareLevelColors: Record<WelfareLevel, string> = {
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
  optionRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D2DDD8',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  radio: {
    alignItems: 'center',
    borderColor: '#536B63',
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
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
  circle: {
    borderRadius: 8,
    borderWidth: 1,
    height: 16,
    width: 16,
  },
  optionLabel: {
    color: '#17352F',
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  observeMore: {
    color: '#17352F',
    fontSize: 18,
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
