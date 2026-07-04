import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { FreeTextQuestion as FreeTextQuestionContent } from '../../content/schema';
import { colors } from '../../lib/theme';

type Props = {
  question: FreeTextQuestionContent;
  value: string;
  onChangeText: (value: string) => void;
};

export function FreeTextQuestion({ question, value, onChangeText }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{question.prompt}</Text>
      {question.help ? <Text style={styles.help}>{question.help}</Text> : null}
      <TextInput
        accessibilityLabel={question.prompt}
        keyboardType={question.input.keyboard === 'numeric' ? 'numeric' : 'default'}
        multiline={question.input.multiline}
        onChangeText={onChangeText}
        style={[styles.input, question.input.multiline ? styles.multilineInput : null]}
        textAlignVertical={question.input.multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
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
  input: {
    backgroundColor: colors.paper,
    borderColor: colors.lineStrong,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  multilineInput: {
    minHeight: 104,
    paddingTop: 12,
  },
});
