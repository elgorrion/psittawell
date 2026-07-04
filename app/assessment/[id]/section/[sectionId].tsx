import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SectionLegend } from '../../../../components/SectionLegend';
import { FreeTextQuestion } from '../../../../components/questions/FreeTextQuestion';
import { GridQuestion } from '../../../../components/questions/GridQuestion';
import { MatrixQuestion } from '../../../../components/questions/MatrixQuestion';
import { MultiChoiceQuestion } from '../../../../components/questions/MultiChoiceQuestion';
import { ScaleQuestion } from '../../../../components/questions/ScaleQuestion';
import { SingleChoiceQuestion } from '../../../../components/questions/SingleChoiceQuestion';
import { psittawelContentPack } from '../../../../content/psittawel';
import type {
  FreeTextQuestion as FreeTextContent,
  GridQuestion as GridQuestionContent,
  MatrixQuestion as MatrixQuestionContent,
  MultiChoiceQuestion as MultiChoiceContent,
  ScaleQuestion as ScaleQuestionContent,
  SingleChoiceQuestion as SingleChoiceContent,
  YesNoQuestion,
} from '../../../../content/schema';
import {
  type Assessment,
  buildWelfareSnapshot,
  getAssessment,
  getGridGroupAnswerQuestionId,
  getGridRowAnswerQuestionId,
  getMatrixRowAnswerQuestionId,
  getAnswers,
  upsertAnswer,
  type Answer,
} from '../../../../lib/assessments';
import { isQuestionVisible } from '../../../../lib/conditionals';
import { t } from '../../../../lib/i18n';
import { colors } from '../../../../lib/theme';

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
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loadedAssessmentId, setLoadedAssessmentId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const nextSection = useMemo(() => {
    if (!section) {
      return null;
    }

    const sectionIndex = psittawelContentPack.sections.findIndex(
      (candidate) => candidate.id === section.id,
    );

    return psittawelContentPack.sections[sectionIndex + 1] ?? null;
  }, [section]);

  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(() => {
      if (!isMounted) {
        return;
      }

      setIsLoading(true);

      if (!Number.isFinite(assessmentId)) {
        setLoadedAssessmentId(null);
        setIsUnavailable(true);
        setIsLoading(false);
        return;
      }

      try {
        const nextAssessment = getAssessment(assessmentId);

        if (!nextAssessment) {
          setLoadedAssessmentId(null);
          setIsUnavailable(true);
          setIsLoading(false);
          return;
        }

        setAssessment(nextAssessment);
        setLoadedAssessmentId(assessmentId);
        setAnswers(mapAnswersByQuestion(getAnswers(assessmentId)));
        setIsUnavailable(false);
      } catch {
        setLoadedAssessmentId(null);
        setIsUnavailable(true);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [assessmentId]);

  const title = useMemo(() => {
    if (!section) {
      return isLoading ? t('assessment.loading') : t('assessment.sectionUnavailable');
    }

    return t('assessment.sectionTitle', { number: section.number, title: section.title });
  }, [section, isLoading]);

  const visibleQuestions = useMemo(() => {
    if (!section) {
      return [];
    }

    return section.questions.filter((question) => isQuestionVisible(question, answers));
  }, [answers, section]);

  if (
    !section ||
    !Number.isFinite(assessmentId) ||
    isUnavailable ||
    isLoading ||
    loadedAssessmentId !== assessmentId ||
    !assessment
  ) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
        <Stack.Screen options={{ title }} />
        <View style={styles.emptyState}>
          <Text style={styles.statusText}>
            {isLoading ? t('assessment.loading') : t('assessment.unavailable')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isReadOnly = assessment.status === 'completed';

  function handleFreeTextChange(question: FreeTextContent, value: string) {
    if (isReadOnly) {
      return;
    }

    const nextAnswer = { optionIds: [], freeText: value };

    setAnswers((current) => ({ ...current, [question.id]: nextAnswer }));
    upsertAnswer(assessmentId, question.id, {
      freeText: value,
      optionIds: null,
      welfareSnapshot: {},
    });
  }

  function handleChoiceSelect(
    question: SingleChoiceContent | YesNoQuestion | ScaleQuestionContent,
    optionId: string,
  ) {
    if (isReadOnly) {
      return;
    }

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

  function handleChoiceTextChange(question: SingleChoiceContent | YesNoQuestion, value: string) {
    if (isReadOnly) {
      return;
    }

    const optionIds = answers[question.id]?.optionIds ?? [];
    const nextAnswer = { optionIds, freeText: value };

    setAnswers((current) => ({ ...current, [question.id]: nextAnswer }));
    upsertAnswer(assessmentId, question.id, {
      optionIds,
      freeText: value,
      welfareSnapshot: buildWelfareSnapshot(question, optionIds),
    });
  }

  function handleMultiChoiceToggle(question: MultiChoiceContent, optionId: string) {
    if (isReadOnly) {
      return;
    }

    const currentOptionIds = answers[question.id]?.optionIds ?? [];
    const wasSelected = currentOptionIds.includes(optionId);
    const selectedOption = question.options.find((option) => option.id === optionId);
    const optionIds = wasSelected
      ? currentOptionIds.filter((currentOptionId) => currentOptionId !== optionId)
      : question.options
          .filter(
            (option) => option.id === optionId || currentOptionIds.includes(option.id),
          )
          .map((option) => option.id);
    const keepsText =
      selectedOption?.allow_text !== true ||
      (!wasSelected && optionIds.includes(selectedOption.id));
    const nextFreeText = keepsText ? answers[question.id]?.freeText ?? '' : '';
    const nextAnswer = { optionIds, freeText: nextFreeText };

    setAnswers((current) => ({ ...current, [question.id]: nextAnswer }));
    upsertAnswer(assessmentId, question.id, {
      optionIds,
      freeText: nextFreeText.length > 0 ? nextFreeText : null,
      welfareSnapshot: buildWelfareSnapshot(question, optionIds),
    });
  }

  function handleMultiChoiceTextChange(question: MultiChoiceContent, value: string) {
    if (isReadOnly) {
      return;
    }

    const optionIds = answers[question.id]?.optionIds ?? [];
    const nextAnswer = { optionIds, freeText: value };

    setAnswers((current) => ({ ...current, [question.id]: nextAnswer }));
    upsertAnswer(assessmentId, question.id, {
      optionIds,
      freeText: value,
      welfareSnapshot: buildWelfareSnapshot(question, optionIds),
    });
  }

  function handleMatrixSelect(question: MatrixQuestionContent, rowId: string, columnId: string) {
    if (isReadOnly) {
      return;
    }

    const answerQuestionId = getMatrixRowAnswerQuestionId(question.id, rowId);
    const optionIds = [columnId];
    const nextAnswer = { optionIds, freeText: '' };

    setAnswers((current) => ({ ...current, [answerQuestionId]: nextAnswer }));
    upsertAnswer(assessmentId, answerQuestionId, {
      optionIds,
      freeText: null,
      welfareSnapshot: buildWelfareSnapshot(question, optionIds),
    });
  }

  function handleGridMultiToggle(question: GridQuestionContent, rowId: string, columnId: string) {
    if (isReadOnly || question.selection !== 'multi') {
      return;
    }

    const answerQuestionId = getGridRowAnswerQuestionId(question.id, rowId);
    const row = question.rows.find((candidate) => candidate.id === rowId);
    const currentOptionIds = answers[answerQuestionId]?.optionIds ?? [];
    const optionIds = currentOptionIds.includes(columnId)
      ? currentOptionIds.filter((currentOptionId) => currentOptionId !== columnId)
      : question.column_groups
          .flatMap((columnGroup) => columnGroup.columns)
          .filter(
            (column) => column.id === columnId || currentOptionIds.includes(column.id),
          )
          .map((column) => column.id);
    const nextFreeText =
      row?.allow_text === true && optionIds.length > 0
        ? answers[answerQuestionId]?.freeText ?? ''
        : '';
    const nextAnswer = { optionIds, freeText: nextFreeText };

    setAnswers((current) => ({ ...current, [answerQuestionId]: nextAnswer }));
    upsertAnswer(assessmentId, answerQuestionId, {
      optionIds,
      freeText: nextFreeText.length > 0 ? nextFreeText : null,
      welfareSnapshot: buildWelfareSnapshot(question, optionIds),
    });
  }

  function handleGridSingleSelect(
    question: GridQuestionContent,
    rowId: string,
    groupId: string,
    columnId: string,
  ) {
    if (isReadOnly || question.selection !== 'single_per_group') {
      return;
    }

    const answerQuestionId = getGridGroupAnswerQuestionId(question.id, rowId, groupId);
    const optionIds = [columnId];
    const nextAnswer = { optionIds, freeText: '' };

    setAnswers((current) => ({ ...current, [answerQuestionId]: nextAnswer }));
    upsertAnswer(assessmentId, answerQuestionId, {
      optionIds,
      freeText: null,
      welfareSnapshot: buildWelfareSnapshot(question, optionIds),
    });
  }

  function handleGridRowTextChange(
    question: GridQuestionContent,
    rowId: string,
    value: string,
  ) {
    if (isReadOnly) {
      return;
    }

    const answerQuestionId = getGridRowAnswerQuestionId(question.id, rowId);
    const optionIds = answers[answerQuestionId]?.optionIds ?? [];
    const nextAnswer = { optionIds, freeText: value };

    setAnswers((current) => ({ ...current, [answerQuestionId]: nextAnswer }));
    upsertAnswer(assessmentId, answerQuestionId, {
      optionIds,
      freeText: value,
      welfareSnapshot: buildWelfareSnapshot(question, optionIds),
    });
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionLegend section={section} />
        {isReadOnly ? (
          <View accessibilityRole="text" style={styles.readOnlyNotice}>
            <Text style={styles.readOnlyNoticeText}>{t('assessment.readOnlyNotice')}</Text>
          </View>
        ) : null}
        {visibleQuestions.map((question, index) => {
          const answer = answers[question.id] ?? { optionIds: [], freeText: '' };

          return (
            <View key={question.id} style={styles.questionBlock}>
              <Text style={styles.progress}>
                {t('assessment.questionProgress', {
                  current: index + 1,
                  total: visibleQuestions.length,
                })}
              </Text>
              {question.type === 'free_text' ? (
                <FreeTextQuestion
                  disabled={isReadOnly}
                  onChangeText={(value) => handleFreeTextChange(question, value)}
                  question={question}
                  value={answer.freeText}
                />
              ) : null}
              {question.type === 'single_choice' || question.type === 'yes_no' ? (
                <SingleChoiceQuestion
                  disabled={isReadOnly}
                  indicatorIcon={question.indicator_icon ?? section.indicator_icon}
                  onChangeOptionText={(value) => handleChoiceTextChange(question, value)}
                  onSelectOption={(optionId) => handleChoiceSelect(question, optionId)}
                  optionText={answer.freeText}
                  question={question}
                  selectedOptionId={answer.optionIds[0] ?? null}
                />
              ) : null}
              {question.type === 'multi_choice' ? (
                <MultiChoiceQuestion
                  disabled={isReadOnly}
                  indicatorIcon={question.indicator_icon ?? section.indicator_icon}
                  onChangeOptionText={(value) => handleMultiChoiceTextChange(question, value)}
                  onToggleOption={(optionId) => handleMultiChoiceToggle(question, optionId)}
                  optionText={answer.freeText}
                  question={question}
                  selectedOptionIds={answer.optionIds}
                />
              ) : null}
              {question.type === 'scale' ? (
                <ScaleQuestion
                  disabled={isReadOnly}
                  indicatorIcon={question.indicator_icon ?? section.indicator_icon}
                  onSelectOption={(optionId) => handleChoiceSelect(question, optionId)}
                  question={question}
                  selectedOptionId={answer.optionIds[0] ?? null}
                />
              ) : null}
              {question.type === 'matrix' ? (
                <MatrixQuestion
                  disabled={isReadOnly}
                  indicatorIcon={question.indicator_icon ?? section.indicator_icon}
                  onSelectColumn={(rowId, columnId) =>
                    handleMatrixSelect(question, rowId, columnId)
                  }
                  question={question}
                  selectedColumnIdForRow={(rowId) =>
                    answers[getMatrixRowAnswerQuestionId(question.id, rowId)]?.optionIds[0] ??
                    null
                  }
                />
              ) : null}
              {question.type === 'grid' ? (
                <GridQuestion
                  disabled={isReadOnly}
                  indicatorIcon={question.indicator_icon ?? section.indicator_icon}
                  onChangeRowText={(rowId, value) =>
                    handleGridRowTextChange(question, rowId, value)
                  }
                  onSelectColumn={(rowId, groupId, columnId) =>
                    handleGridSingleSelect(question, rowId, groupId, columnId)
                  }
                  onToggleColumn={(rowId, columnId) =>
                    handleGridMultiToggle(question, rowId, columnId)
                  }
                  question={question}
                  rowTextForRow={(rowId) =>
                    answers[getGridRowAnswerQuestionId(question.id, rowId)]?.freeText ?? ''
                  }
                  selectedColumnIdForGroup={(rowId, groupId) =>
                    answers[getGridGroupAnswerQuestionId(question.id, rowId, groupId)]
                      ?.optionIds[0] ?? null
                  }
                  selectedColumnIdsForRow={(rowId) =>
                    answers[getGridRowAnswerQuestionId(question.id, rowId)]?.optionIds ?? []
                  }
                />
              ) : null}
            </View>
          );
        })}
      </ScrollView>
      <Footer assessmentId={assessmentId} nextSectionId={nextSection?.id ?? null} />
    </SafeAreaView>
  );
}

type FooterProps = {
  assessmentId?: number;
  nextSectionId?: string | null;
};

function Footer({ assessmentId, nextSectionId = null }: FooterProps) {
  if (assessmentId === undefined) {
    return null;
  }

  const backToOverview = () =>
    router.push({
      pathname: '/assessment/[id]',
      params: { id: String(assessmentId) },
    });

  return (
    <View style={styles.footer}>
      <Text style={styles.consultNote}>{t('assessment.consultNote')}</Text>
      {nextSectionId ? (
        <Pressable
          accessibilityLabel={t('assessment.nextSection')}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/assessment/[id]/section/[sectionId]',
              params: { id: String(assessmentId), sectionId: nextSectionId },
            })
          }
          style={styles.nextButton}
        >
          <Text style={styles.nextButtonText}>{t('assessment.nextSection')}</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityLabel={t('assessment.backToOverview')}
        accessibilityRole="button"
        onPress={backToOverview}
        style={nextSectionId ? styles.overviewButton : styles.nextButton}
      >
        <Text style={nextSectionId ? styles.overviewButtonText : styles.nextButtonText}>
          {t('assessment.backToOverview')}
        </Text>
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
    backgroundColor: colors.mintSoft,
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
  statusText: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
  },
  questionBlock: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  progress: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  readOnlyNotice: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  readOnlyNoticeText: {
    color: colors.spruceInk,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  footer: {
    backgroundColor: colors.mint,
    borderColor: colors.line,
    borderTopWidth: 1,
    gap: 12,
    padding: 16,
  },
  consultNote: {
    color: colors.slate,
    fontSize: 14,
    lineHeight: 20,
  },
  nextButton: {
    alignItems: 'center',
    backgroundColor: colors.spruce,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  nextButtonText: {
    color: colors.paper,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  overviewButton: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.spruce,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  overviewButtonText: {
    color: colors.spruceDark,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
});
