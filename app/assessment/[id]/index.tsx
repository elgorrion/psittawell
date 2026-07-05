import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import appConfig from '../../../app.json';
import { psittawelContentPack } from '../../../content/psittawel';
import {
  completeAssessment,
  createFollowUpAssessment,
  countAnsweredVisibleQuestions,
  countUnansweredVisibleQuestions,
  getAnswers,
  getAssessment,
  mapAnswersByQuestion,
  parrotNameQuestionId,
  parseSqliteTimestamp,
  type AnswerLookup,
  type Assessment,
  type SectionAnswerProgress,
} from '../../../lib/assessments';
import { buildAssessmentFormHtml } from '../../../lib/assessmentFormReport';
import { getAppLocale, t } from '../../../lib/i18n';
import { colors } from '../../../lib/theme';
import { getCompleteConfirmMessage } from '../../../lib/completion';
import {
  buildAssessmentFormReportFilename,
  isPdfReportSharingAvailable,
  sharePdfReport,
} from '../../../lib/exportReport';
import {
  assessmentOverviewRoute,
  assessmentResultsRoute,
  assessmentSectionRoute,
  HomeHeaderUpButton,
} from '../../../components/AssessmentNavigation';

const headerLeft = ({ tintColor }: { tintColor?: import('react-native').ColorValue }) => (
  <HomeHeaderUpButton tintColor={tintColor} />
);

type OverviewState =
  | { status: 'loading' }
  | {
      status: 'ready';
      assessment: Assessment;
      answers: AnswerLookup;
    }
  | { status: 'unavailable' };

type FormShareStatus = 'idle' | 'sharing' | 'unavailable' | 'error';

type SectionCardState = {
  sectionId: string;
  number: number;
  title: string;
  progress: SectionAnswerProgress;
  statusLabel: string;
};

export default function AssessmentOverviewScreen() {
  const params = useLocalSearchParams();
  const assessmentId = Number(firstParam(params.id));
  const [overviewState, setOverviewState] = useState<OverviewState>({ status: 'loading' });
  const [isFormShareAvailable, setIsFormShareAvailable] = useState(false);
  const [formShareStatus, setFormShareStatus] = useState<FormShareStatus>('idle');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      Promise.resolve().then(() => {
        if (!isMounted) {
          return;
        }

        if (!Number.isFinite(assessmentId)) {
          setOverviewState({ status: 'unavailable' });
          return;
        }

        try {
          const assessment = getAssessment(assessmentId);

          if (!assessment) {
            setOverviewState({ status: 'unavailable' });
            return;
          }

          setOverviewState({
            status: 'ready',
            assessment,
            answers: mapAnswersByQuestion(getAnswers(assessmentId)),
          });
        } catch {
          setOverviewState({ status: 'unavailable' });
        }
      });

      return () => {
        isMounted = false;
      };
    }, [assessmentId]),
  );

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      setFormShareStatus('idle');
      setIsFormShareAvailable(false);

      isPdfReportSharingAvailable()
        .then((isAvailable) => {
          if (!isMounted) {
            return;
          }

          setIsFormShareAvailable(isAvailable);
          setFormShareStatus(isAvailable ? 'idle' : 'unavailable');
        })
        .catch(() => {
          if (isMounted) {
            setIsFormShareAvailable(false);
            setFormShareStatus('unavailable');
          }
        });

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const sectionCards = useMemo<SectionCardState[]>(() => {
    if (overviewState.status !== 'ready') {
      return [];
    }

    const completed = overviewState.assessment.status === 'completed';

    return psittawelContentPack.sections.map((section) => {
      const progress = countAnsweredVisibleQuestions(section, overviewState.answers);

      return {
        sectionId: section.id,
        number: section.number,
        title: section.title,
        progress,
        statusLabel: getSectionStatusLabel(progress, completed),
      };
    });
  }, [overviewState]);

  if (overviewState.status !== 'ready') {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
        <Stack.Screen options={{ title: t('assessment.overview.title'), headerLeft }} />
        <View style={styles.emptyState}>
          <Text style={styles.statusText}>
            {overviewState.status === 'loading'
              ? t('assessment.overview.loading')
              : t('assessment.overview.unavailable')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { assessment, answers } = overviewState;
  const parrotName = (answers[parrotNameQuestionId]?.freeText ?? '').trim();
  const isCompleted = assessment.status === 'completed';
  const title =
    parrotName.length > 0
      ? t('assessment.overview.namedTitle', { name: parrotName })
      : t('assessment.overview.title');
  const shouldShowFormExportAction =
    isCompleted &&
    (isFormShareAvailable ||
      formShareStatus === 'sharing' ||
      formShareStatus === 'unavailable' ||
      formShareStatus === 'error');

  function handleCompleteAssessment() {
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
              const completedAssessment = getAssessment(assessmentId);

              if (!completedAssessment) {
                setOverviewState({ status: 'unavailable' });
                return;
              }

              setOverviewState((current) =>
                current.status === 'ready'
                  ? {
                      ...current,
                      assessment: completedAssessment,
                    }
                  : current,
              );
              router.push(assessmentResultsRoute(assessmentId));
            } catch {
              setOverviewState({ status: 'unavailable' });
            }
          },
        },
      ],
    );
  }

  function handleStartFollowUpAssessment() {
    try {
      const followUpAssessmentId = createFollowUpAssessment(
        assessmentId,
        psittawelContentPack.sections,
      );

      router.push(assessmentOverviewRoute(followUpAssessmentId));
    } catch {
      setOverviewState({ status: 'unavailable' });
    }
  }

  async function handleShareFilledForm() {
    if (formShareStatus === 'sharing') {
      return;
    }

    setFormShareStatus('sharing');

    try {
      const completedDate = parseSqliteTimestamp(assessment.completedAt ?? assessment.startedAt);
      const html = buildAssessmentFormHtml({
        answers,
        appName: appConfig.expo.name,
        appVersion: appConfig.expo.version,
        completedAtLabel: formatCompletedAtLabel(completedDate),
        parrotName,
      });
      const outcome = await sharePdfReport(html, {
        dialogTitle: t('assessment.formReport.shareDialogTitle'),
        filename: buildAssessmentFormReportFilename(parrotName, completedDate),
      });

      if (outcome === 'unavailable') {
        setIsFormShareAvailable(false);
        setFormShareStatus('unavailable');
        return;
      }

      setFormShareStatus('idle');
    } catch (error) {
      setFormShareStatus(isShareCancellation(error) ? 'idle' : 'error');
    }
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <Stack.Screen options={{ title, headerLeft }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introPanel}>
          {isCompleted ? (
            <View accessibilityRole="text" style={styles.readOnlyBadge}>
              <Text style={styles.readOnlyBadgeText}>{t('assessment.overview.readOnlyBadge')}</Text>
            </View>
          ) : (
            <Text style={styles.introText}>{t('assessment.overview.description')}</Text>
          )}
        </View>

        {isCompleted ? (
          <View style={styles.completedPanel}>
            <Text accessibilityRole="header" aria-level={2} style={styles.completedTitle}>
              {t('assessment.overview.completedTitle')}
            </Text>
            <Text style={styles.completedText}>{t('assessment.overview.completedMessage')}</Text>
            <Text style={styles.consultNote}>{t('assessment.consultNote')}</Text>
            <View style={styles.completedActions}>
              <Pressable
                accessibilityLabel={t('assessment.results.viewButton')}
                accessibilityRole="button"
                onPress={() =>
                  router.push(assessmentResultsRoute(assessment.id))
                }
                style={styles.resultsButton}
              >
                <Text style={styles.resultsButtonText}>
                  {t('assessment.results.viewButton')}
                </Text>
              </Pressable>
              {shouldShowFormExportAction ? (
                <ExportFilledFormAction
                  onPress={handleShareFilledForm}
                  status={formShareStatus}
                />
              ) : null}
              <Pressable
                accessibilityLabel={t('assessment.trends.viewButton')}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/assessment/[id]/trends',
                    params: { id: String(assessment.id) },
                  })
                }
                style={styles.followUpButton}
              >
                <Text style={styles.followUpButtonText}>
                  {t('assessment.trends.viewButton')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={t('assessment.overview.followUpAccessibilityLabel')}
                accessibilityRole="button"
                onPress={handleStartFollowUpAssessment}
                style={styles.followUpButton}
              >
                <Text style={styles.followUpButtonText}>
                  {t('assessment.overview.followUpButton')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionList}>
          {sectionCards.map((section) => (
            <Pressable
              accessibilityLabel={t('assessment.overview.sectionAccessibility', {
                number: section.number,
                title: section.title,
                status: section.statusLabel,
                progress: t('assessment.overview.sectionProgress', section.progress),
              })}
              accessibilityRole="button"
              key={section.sectionId}
              onPress={() =>
                router.push(assessmentSectionRoute(assessment.id, section.sectionId))
              }
              style={styles.sectionCard}
            >
              <Text style={styles.sectionNumber}>
                {t('assessment.overview.sectionNumber', { number: section.number })}
              </Text>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionMeta}>
                {section.statusLabel.length > 0 ? (
                  <Text style={styles.sectionStatus}>{section.statusLabel}</Text>
                ) : null}
                <Text style={styles.sectionProgress}>
                  {t('assessment.overview.sectionProgress', section.progress)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {!isCompleted ? (
          <Pressable
            accessibilityLabel={t('assessment.overview.completeButton')}
            accessibilityRole="button"
            onPress={handleCompleteAssessment}
            style={styles.completeButton}
          >
            <Text style={styles.completeButtonText}>
              {t('assessment.overview.completeButton')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatCompletedAtLabel(date: Date) {
  return new Intl.DateTimeFormat(getAppLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function isShareCancellation(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');

  return /cancel|dismiss/i.test(message);
}

function getSectionStatusLabel(progress: SectionAnswerProgress, completed: boolean): string {
  if (completed) {
    return '';
  }

  if (progress.answered === 0) {
    return t('assessment.overview.status.notStarted');
  }

  if (progress.answered >= progress.total) {
    return t('assessment.overview.status.answered');
  }

  return t('assessment.overview.status.inProgress');
}

function ExportFilledFormAction({
  onPress,
  status,
}: {
  onPress: () => void;
  status: FormShareStatus;
}) {
  const isDisabled = status === 'sharing' || status === 'unavailable';

  return (
    <View style={styles.formExportPanel}>
      <Pressable
        accessibilityLabel={t('assessment.formReport.shareButton')}
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={onPress}
        style={[styles.followUpButton, isDisabled ? styles.actionButtonDisabled : null]}
      >
        <Text style={styles.followUpButtonText}>
          {status === 'sharing'
            ? t('assessment.formReport.sharing')
            : t('assessment.formReport.shareButton')}
        </Text>
      </Pressable>
      {status === 'unavailable' ? (
        <Text style={styles.actionMessage}>{t('assessment.formReport.unavailable')}</Text>
      ) : null}
      {status === 'error' ? (
        <Text accessibilityRole="alert" style={styles.actionError}>
          {t('assessment.formReport.error')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.mintSoft,
    flex: 1,
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 32,
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
  introPanel: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  introText: {
    color: colors.slate,
    fontSize: 15,
    lineHeight: 21,
  },
  readOnlyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.mint,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  readOnlyBadgeText: {
    color: colors.spruceInk,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  completedPanel: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  completedTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  completedText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
  },
  consultNote: {
    color: colors.slate,
    fontSize: 14,
    lineHeight: 20,
  },
  completedActions: {
    gap: 10,
    paddingTop: 4,
  },
  formExportPanel: {
    gap: 8,
  },
  resultsButton: {
    alignItems: 'center',
    backgroundColor: colors.spruce,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  resultsButtonText: {
    color: colors.paper,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  followUpButton: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.spruce,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  followUpButtonText: {
    color: colors.spruceDark,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionMessage: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  actionError: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  sectionList: {
    gap: 10,
  },
  sectionCard: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  sectionNumber: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
  },
  sectionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionStatus: {
    color: colors.spruceDark,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  sectionProgress: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  completeButton: {
    alignItems: 'center',
    backgroundColor: colors.spruce,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  completeButtonText: {
    color: colors.paper,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
});
