import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FreeTextQuestion } from '../../../../components/questions/FreeTextQuestion';
import { SingleChoiceQuestion } from '../../../../components/questions/SingleChoiceQuestion';
import { psittawelContentPack } from '../../../../content/psittawel';
import type { ChoiceQuestion, FreeTextQuestion as FreeTextContent } from '../../../../content/schema';
import {
  buildWelfareSnapshot,
  getAnswers,
  upsertAnswer,
  type Answer,
} from '../../../../lib/assessments';
import { t } from '../../../../lib/i18n';

type LocalAnswer = {
  optionIds: string[];
  freeText: string;
};

type AnswerState = Record<string, LocalAnswer>;

export default function AssessmentSectionScreen() {
  const params = useLocalSearchParams();
  const assessmentId = Number(firstParam(params.id));
  const sectionId = firstParam(params.sectionId);
  const section = psittawelContentPack.sections.find((candidate) => candidate.id === sectionId);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(() => {
      if (!isMounted) {
        return;
      }

      if (!Number.isFinite(assessmentId)) {
        setIsUnavailable(true);
        return;
      }

      try {
        setAnswers(mapAnswersByQuestion(getAnswers(assessmentId)));
        setIsUnavailable(false);
      } catch {
        setIsUnavailable(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [assessmentId]);

  const title = useMemo(() => {
    if (!section) {
      return t('assessment.sectionUnavailable');
    }

    return t('assessment.sectionTitle', { number: section.number, title: section.title });
  }, [section]);

  if (!section || !Number.isFinite(assessmentId) || isUnavailable) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.emptyState}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.statusText}>{t('assessment.unavailable')}</Text>
          <Footer />
        </View>
      </SafeAreaView>
    );
  }

  function handleFreeTextChange(question: FreeTextContent, value: string) {
    const nextAnswer = { optionIds: [], freeText: value };

    setAnswers((current) => ({ ...current, [question.id]: nextAnswer }));
    upsertAnswer(assessmentId, question.id, {
      freeText: value,
      optionIds: null,
      welfareSnapshot: {},
    });
  }

  function handleSingleChoiceSelect(question: ChoiceQuestion & { type: 'single_choice' }, optionId: string) {
    const selectedOption = question.options.find((option) => option.id === optionId);
    const previousFreeText = answers[question.id]?.freeText ?? '';
    const nextFreeText = selectedOption?.allow_text ? previousFreeText : '';
    const optionIds = [optionId];
    const nextAnswer = { optionIds, freeText: nextFreeText };

    setAnswers((current) => ({ ...current, [question.id]: nextAnswer }));
    upsertAnswer(assessmentId, question.id, {
      optionIds,
      freeText: nextFreeText.length > 0 ? nextFreeText : null,
      welfareSnapshot: buildWelfareSnapshot(question, optionIds),
    });
  }

  function handleSingleChoiceTextChange(question: ChoiceQuestion & { type: 'single_choice' }, value: string) {
    const optionIds = answers[question.id]?.optionIds ?? [];
    const nextAnswer = { optionIds, freeText: value };

    setAnswers((current) => ({ ...current, [question.id]: nextAnswer }));
    upsertAnswer(assessmentId, question.id, {
      optionIds,
      freeText: value,
      welfareSnapshot: buildWelfareSnapshot(question, optionIds),
    });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.interpretation}>{section.interpretation}</Text>
        {section.questions.map((question, index) => {
          const answer = answers[question.id] ?? { optionIds: [], freeText: '' };

          return (
            <View key={question.id} style={styles.questionBlock}>
              <Text style={styles.progress}>
                {t('assessment.questionProgress', {
                  current: index + 1,
                  total: section.questions.length,
                })}
              </Text>
              {question.type === 'free_text' ? (
                <FreeTextQuestion
                  onChangeText={(value) => handleFreeTextChange(question, value)}
                  question={question}
                  value={answer.freeText}
                />
              ) : null}
              {question.type === 'single_choice' ? (
                <SingleChoiceQuestion
                  indicatorIcon={question.indicator_icon ?? section.indicator_icon}
                  onChangeOptionText={(value) => handleSingleChoiceTextChange(question, value)}
                  onSelectOption={(optionId) => handleSingleChoiceSelect(question, optionId)}
                  optionText={answer.freeText}
                  question={question}
                  selectedOptionId={answer.optionIds[0] ?? null}
                />
              ) : null}
            </View>
          );
        })}
      </ScrollView>
      <Footer />
    </SafeAreaView>
  );
}

function Footer() {
  return (
    <View style={styles.footer}>
      <Text style={styles.consultNote}>{t('assessment.consultNote')}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/')}
        style={styles.doneButton}
      >
        <Text style={styles.doneButtonText}>{t('assessment.doneForNow')}</Text>
      </Pressable>
    </View>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function mapAnswersByQuestion(rows: Answer[]): AnswerState {
  return rows.reduce<AnswerState>((nextAnswers, answer) => {
    nextAnswers[answer.questionId] = {
      optionIds: answer.optionIds,
      freeText: answer.freeText ?? '',
    };

    return nextAnswers;
  }, {});
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F7FAF9',
    flex: 1,
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 28,
  },
  emptyState: {
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#12312A',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  statusText: {
    color: '#3F5750',
    fontSize: 16,
    lineHeight: 22,
  },
  interpretation: {
    backgroundColor: '#E9EFEC',
    borderRadius: 8,
    color: '#354F48',
    fontSize: 14,
    lineHeight: 21,
    padding: 14,
  },
  questionBlock: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9E4DF',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  progress: {
    color: '#536B63',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  footer: {
    backgroundColor: '#EFF5F2',
    borderColor: '#D2DDD8',
    borderTopWidth: 1,
    gap: 12,
    padding: 16,
  },
  consultNote: {
    color: '#2F4C44',
    fontSize: 14,
    lineHeight: 20,
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: '#12312A',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
});
