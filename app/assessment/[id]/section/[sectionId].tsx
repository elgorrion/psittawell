import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, CircleAlert } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  completeAssessment,
  countUnansweredVisibleQuestions,
  getAssessment,
  getGridGroupAnswerQuestionId,
  getGridRowAnswerQuestionId,
  getMatrixRowAnswerQuestionId,
  getAnswers,
  upsertAnswer,
  type Answer,
  type AnswerInput,
} from '../../../../lib/assessments';
import { isQuestionVisible } from '../../../../lib/conditionals';
import { t } from '../../../../lib/i18n';
import { colors } from '../../../../lib/theme';
import { getCompleteConfirmMessage } from '../../../../lib/completion';
import {
  AssessmentHeaderUpButton,
  assessmentResultsRoute,
  assessmentSectionRoute,
} from '../../../../components/AssessmentNavigation';
import { getSectionFooterState } from '../../../../lib/sectionNavigation';

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

  const screenOptions = {
    title,
    headerLeft: ({ tintColor }: { tintColor?: import('react-native').ColorValue }) => (
      <AssessmentHeaderUpButton assessmentId={assessmentId} tintColor={tintColor} />
    ),
  };

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
        <Stack.Screen options={screenOptions} />
        <View style={styles.emptyState}>
          <Text style={styles.statusText}>
            {isLoading ? t('assessment.loading') : t('assessment.unavailable')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isReadOnly = assessment.status === 'completed';
  const footerState = getSectionFooterState(
    psittawelContentPack.sections,
    section.id,
    assessment.status,
  );

  function handleFinishAssessment() {
    const unansweredCount = countUnansweredVisibleQuestions(
      psittawelContentPack.sections,
      answers,
    );

    Alert.alert(
      t('assessment.overview.confirmTitle'),
      getCompleteConfirmMessage(unansweredCount),
      [
        {
          text: t('assessment.overview.confirmCancel'),
          style: 'cancel',
        },
        {
          text: t('assessment.overview.confirmComplete'),
          onPress() {
            try {
              completeAssessment(assessmentId);
              router.replace(assessmentResultsRoute(assessmentId));
            } catch {
              setIsUnavailable(true);
            }
          },
        },
      ],
    );
  }

  function persistAnswer(
    answerQuestionId: string,
    nextAnswer: LocalAnswer,
    answerInput: AnswerInput,
  ) {
    const previousAnswer = answers[answerQuestionId];

    setAnswers((current) => ({ ...current, [answerQuestionId]: nextAnswer }));

    try {
      upsertAnswer(assessmentId, answerQuestionId, answerInput);
    } catch {
      setAnswers((current) => {
        const revertedAnswers = { ...current };

        if (previousAnswer === undefined) {
          delete revertedAnswers[answerQuestionId];
        } else {
          revertedAnswers[answerQuestionId] = previousAnswer;
        }

        return revertedAnswers;
      });
      setIsUnavailable(true);
    }
  }

  function handleFreeTextChange(question: FreeTextContent, value: string) {
    if (isReadOnly) {
      return;
    }

    const nextAnswer = { optionIds: [], freeText: value };

    persistAnswer(question.id, nextAnswer, {
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

    persistAnswer(question.id, nextAnswer, {
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

    persistAnswer(question.id, nextAnswer, {
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

    persistAnswer(question.id, nextAnswer, {
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

    persistAnswer(question.id, nextAnswer, {
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

    persistAnswer(answerQuestionId, nextAnswer, {
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

    persistAnswer(answerQuestionId, nextAnswer, {
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

    persistAnswer(answerQuestionId, nextAnswer, {
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

    persistAnswer(answerQuestionId, nextAnswer, {
      optionIds,
      freeText: value,
      welfareSnapshot: buildWelfareSnapshot(question, optionIds),
    });
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <Stack.Screen options={screenOptions} />
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
      <Footer
        assessmentId={assessmentId}
        forwardAction={footerState.forwardAction}
        onFinishAssessment={handleFinishAssessment}
        previousSectionId={footerState.previousSectionId}
      />
    </SafeAreaView>
  );
}

type FooterProps = {
  assessmentId?: number;
  forwardAction: ReturnType<typeof getSectionFooterState>['forwardAction'];
  onFinishAssessment: () => void;
  previousSectionId: string | null;
};

export function Footer({
  assessmentId,
  forwardAction,
  onFinishAssessment,
  previousSectionId,
}: FooterProps) {
  if (assessmentId === undefined) {
    return null;
  }

  return (
    <View style={styles.footer}>
      <View style={styles.consultRow}>
        <CircleAlert color={colors.textMuted} size={16} strokeWidth={2.1} />
        <Text numberOfLines={3} style={styles.consultNote}>
          {t('assessment.consultNote')}
        </Text>
      </View>
      <View style={styles.footerActions} testID="section-footer-actions">
        {previousSectionId ? (
          <Pressable
            accessibilityLabel={t('assessment.previousSection')}
            accessibilityRole="button"
            onPress={() =>
              router.replace(assessmentSectionRoute(assessmentId, previousSectionId))
            }
            style={[styles.footerButton, styles.secondaryButton]}
          >
            <ChevronLeft color={colors.spruceDark} size={18} strokeWidth={2.4} />
            <Text numberOfLines={1} style={styles.secondaryButtonText}>
              {t('assessment.previousSectionShort')}
            </Text>
          </Pressable>
        ) : null}
        {forwardAction.kind === 'next' ? (
          <Pressable
            accessibilityLabel={t('assessment.nextSection')}
            accessibilityRole="button"
            onPress={() =>
              router.replace(assessmentSectionRoute(assessmentId, forwardAction.sectionId))
            }
            style={[styles.footerButton, styles.primaryButton]}
          >
            <Text numberOfLines={1} style={styles.primaryButtonText}>
              {t('assessment.nextSectionShort')}
            </Text>
            <ChevronRight color={colors.paper} size={18} strokeWidth={2.4} />
          </Pressable>
        ) : null}
        {forwardAction.kind === 'finish' ? (
          <Pressable
            accessibilityLabel={t('assessment.finishAssessment')}
            accessibilityRole="button"
            onPress={onFinishAssessment}
            style={[styles.footerButton, styles.primaryButton]}
          >
            <Text numberOfLines={1} style={styles.primaryButtonText}>
              {t('assessment.finishAssessmentShort')}
            </Text>
          </Pressable>
        ) : null}
      </View>
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
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  consultRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 6,
  },
  consultNote: {
    color: colors.textMuted,
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    minHeight: 44,
  },
  footerButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButton: {
    backgroundColor: colors.spruce,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: colors.paper,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  secondaryButton: {
    backgroundColor: colors.paper,
    borderColor: colors.spruce,
    borderRadius: 8,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: colors.spruceDark,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
});
