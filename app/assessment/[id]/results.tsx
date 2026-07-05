import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ColorValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  FlagBadge,
  FlagBadges,
  welfareLevelColors,
  withFlagGlyph,
} from '../../../components/questions/Badges';
import { psittawelContentPack } from '../../../content/psittawel';
import type { WelfareLevel } from '../../../content/schema';
import {
  getAnswers,
  getAssessment,
  mapAnswersByQuestion,
  parrotNameQuestionId,
} from '../../../lib/assessments';
import {
  isResultsReportSharingAvailable,
  shareResultsReport,
} from '../../../lib/exportReport';
import { t } from '../../../lib/i18n';
import {
  buildAssessmentResults,
  type AssessmentResults,
  type AttentionItem,
  type ObserveItem,
  type UrgentItem,
} from '../../../lib/results';
import { buildResultsReportHtml } from '../../../lib/resultsReport';
import { colors } from '../../../lib/theme';
import { AssessmentHeaderUpButton, navigateUpToAssessmentOverview } from '../../../components/AssessmentNavigation';

type ResultsState =
  | { status: 'loading' }
  | {
      status: 'ready';
      parrotName: string;
      results: AssessmentResults;
    }
  | { status: 'unavailable' };

type ReportShareStatus = 'idle' | 'sharing' | 'unavailable' | 'error';

const headerTitle = ({ children, tintColor }: { children: string; tintColor?: ColorValue }) => (
  <Text numberOfLines={1} style={[styles.navigationTitle, tintColor ? { color: tintColor } : null]}>
    {children}
  </Text>
);

export default function AssessmentResultsScreen() {
  const params = useLocalSearchParams();
  const assessmentId = Number(firstParam(params.id));
  const [resultsState, setResultsState] = useState<ResultsState>({ status: 'loading' });
  const [isReportShareAvailable, setIsReportShareAvailable] = useState(false);
  const [reportShareStatus, setReportShareStatus] = useState<ReportShareStatus>('idle');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      Promise.resolve().then(() => {
        if (!isMounted) {
          return;
        }

        if (!Number.isFinite(assessmentId)) {
          setResultsState({ status: 'unavailable' });
          return;
        }

        try {
          const assessment = getAssessment(assessmentId);

          if (!assessment || assessment.status !== 'completed') {
            setResultsState({ status: 'unavailable' });
            return;
          }

          const answers = getAnswers(assessmentId);
          const answersByQuestion = mapAnswersByQuestion(answers);
          const parrotName = (answersByQuestion[parrotNameQuestionId]?.freeText ?? '').trim();

          setResultsState({
            status: 'ready',
            parrotName,
            results: buildAssessmentResults(psittawelContentPack.sections, answers),
          });
        } catch {
          setResultsState({ status: 'unavailable' });
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

      setReportShareStatus('idle');
      setIsReportShareAvailable(false);

      isResultsReportSharingAvailable()
        .then((isAvailable) => {
          if (isMounted) {
            setIsReportShareAvailable(isAvailable);
          }
        })
        .catch(() => {
          if (isMounted) {
            setIsReportShareAvailable(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }, []),
  );

  if (resultsState.status !== 'ready') {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
        <Stack.Screen
          options={{
            title: t('assessment.results.headerTitle'),
            headerTitle,
            headerLeft: ({ tintColor }: { tintColor?: ColorValue }) => (
              <AssessmentHeaderUpButton assessmentId={assessmentId} tintColor={tintColor} />
            ),
          }}
        />
        <View style={styles.emptyState}>
          <Text accessibilityRole="header" aria-level={1} style={styles.emptyTitle}>
            {resultsState.status === 'loading'
              ? t('assessment.results.headerTitle')
              : t('assessment.results.unavailableTitle')}
          </Text>
          <Text style={styles.statusText}>
            {resultsState.status === 'loading'
              ? t('assessment.results.loading')
              : t('assessment.results.unavailable')}
          </Text>
          {Number.isFinite(assessmentId) ? <BackToOverviewButton assessmentId={assessmentId} /> : null}
        </View>
      </SafeAreaView>
    );
  }

  const { parrotName, results } = resultsState;
  const title =
    parrotName.length > 0
      ? t('assessment.results.namedTitle', { name: parrotName })
      : t('assessment.results.title');
  const hasUrgentItems = results.urgent.length > 0;
  const shouldShowReportShareAction =
    isReportShareAvailable || reportShareStatus === 'unavailable' || reportShareStatus === 'error';

  const handleShareReport = async () => {
    if (reportShareStatus === 'sharing') {
      return;
    }

    setReportShareStatus('sharing');

    try {
      const html = buildResultsReportHtml({
        generatedAtLabel: formatGeneratedAtLabel(new Date()),
        parrotName,
        results,
      });
      const outcome = await shareResultsReport(html, { parrotName });

      if (outcome === 'unavailable') {
        setIsReportShareAvailable(false);
        setReportShareStatus('unavailable');
        return;
      }

      setReportShareStatus('idle');
    } catch (error) {
      setReportShareStatus(isShareCancellation(error) ? 'idle' : 'error');
    }
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          title: t('assessment.results.headerTitle'),
          headerTitle,
          headerLeft: ({ tintColor }: { tintColor?: ColorValue }) => (
            <AssessmentHeaderUpButton assessmentId={assessmentId} tintColor={tintColor} />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introPanel}>
          <Text accessibilityRole="header" aria-level={1} style={styles.introTitle}>
            {title}
          </Text>
          <Text style={styles.introText}>{t('assessment.results.disclaimer')}</Text>
        </View>

        <ConsultPanel prominent={hasUrgentItems} />

        {shouldShowReportShareAction ? (
          <ShareReportAction onPress={handleShareReport} status={reportShareStatus} />
        ) : null}

        <ChangeOverTimeAction assessmentId={assessmentId} />

        {hasUrgentItems ? (
          <View style={styles.panel}>
            <Text accessibilityRole="header" aria-level={2} style={styles.panelTitle}>
              {t('assessment.results.urgent.title')}
            </Text>
            <Text style={styles.panelDescription}>
              {t('assessment.results.urgent.description')}
            </Text>
            <View style={styles.itemList}>
              {results.urgent.map((item, index) => (
                <UrgentResultItem item={item} key={`${item.questionId}-${index}`} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text accessibilityRole="header" aria-level={2} style={styles.panelTitle}>
            {t('assessment.results.attention.title')}
          </Text>
          <Text style={styles.panelDescription}>
            {t('assessment.results.attention.description')}
          </Text>
          {results.attention.length > 0 ? (
            <View style={styles.sectionAttentionList}>
              {results.attention.map((section) => (
                <View key={section.sectionId} style={styles.sectionAttentionCard}>
                  <Text
                    accessibilityRole="header"
                    aria-level={2}
                    style={styles.sectionAttentionTitle}
                  >
                    {section.sectionTitle}
                  </Text>
                  <View style={styles.itemList}>
                    {section.items.map((item, index) => (
                      <AttentionResultItem item={item} key={`${item.questionId}-${index}`} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>{t('assessment.results.attention.empty')}</Text>
          )}
        </View>

        {results.observe.length > 0 ? (
          <View style={styles.panel}>
            <Text accessibilityRole="header" aria-level={2} style={styles.panelTitle}>
              {getObserveResultsTitle()}
            </Text>
            <Text style={styles.panelDescription}>
              {t('assessment.results.observe.description')}
            </Text>
            <View style={styles.itemList}>
              {results.observe.map((item, index) => (
                <ObserveResultItem item={item} key={`${item.questionId}-${item.flag}-${index}`} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.reviewedPanel}>
          <Text accessibilityRole="header" aria-level={2} style={styles.reviewedTitle}>
            {t('assessment.results.reviewed.title')}
          </Text>
          <Text style={styles.reviewedDescription}>
            {t('assessment.results.reviewed.description')}
          </Text>
          {results.sectionsReviewed.length > 0 ? (
            <View style={styles.reviewedList}>
              {results.sectionsReviewed.map((section) => (
                <View key={section.sectionId} style={styles.reviewedChip}>
                  <Text style={styles.reviewedChipText}>{section.sectionTitle}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>{t('assessment.results.reviewed.empty')}</Text>
          )}
        </View>

        <View style={styles.notePanel}>
          <Text style={styles.noteText}>{t('assessment.results.monthlyNote')}</Text>
        </View>

        <ConsultPanel />
        <BackToOverviewButton assessmentId={assessmentId} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ChangeOverTimeAction({ assessmentId }: { assessmentId: number }) {
  return (
    <Pressable
      accessibilityLabel={t('assessment.trends.viewButton')}
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/assessment/[id]/trends',
          params: { id: String(assessmentId) },
        })
      }
      style={styles.trendsButton}
    >
      <Text style={styles.trendsButtonText}>{t('assessment.trends.viewButton')}</Text>
    </Pressable>
  );
}

function ShareReportAction({
  onPress,
  status,
}: {
  onPress: () => void;
  status: ReportShareStatus;
}) {
  const isDisabled = status === 'sharing' || status === 'unavailable';

  return (
    <View style={styles.sharePanel}>
      <Pressable
        accessibilityLabel={t('assessment.report.shareButton')}
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={onPress}
        style={[styles.shareButton, isDisabled ? styles.shareButtonDisabled : null]}
      >
        <Text style={styles.shareButtonText}>{t('assessment.report.shareButton')}</Text>
      </Pressable>
      {status === 'unavailable' ? (
        <Text style={styles.shareMessage}>{t('assessment.report.unavailable')}</Text>
      ) : null}
      {status === 'error' ? (
        <Text accessibilityRole="alert" style={styles.shareError}>
          {t('assessment.report.error')}
        </Text>
      ) : null}
    </View>
  );
}

function UrgentResultItem({ item }: { item: UrgentItem }) {
  return (
    <View style={styles.resultItem}>
      <ResultItemText
        optionLabel={item.optionLabel}
        questionPrompt={item.questionPrompt}
        rowLabel={item.rowLabel}
        sectionTitle={item.sectionTitle}
      />
      <FlagBadges flags={item.flags} />
    </View>
  );
}

function AttentionResultItem({ item }: { item: AttentionItem }) {
  return (
    <View style={styles.resultItem}>
      <ResultItemText
        optionLabel={item.optionLabel}
        questionPrompt={item.questionPrompt}
        rowLabel={item.rowLabel}
      />
      <WelfareMarker welfareLevel={item.welfareLevel} />
    </View>
  );
}

function ObserveResultItem({ item }: { item: ObserveItem }) {
  return (
    <View style={styles.resultItem}>
      <ResultItemText
        optionLabel={item.optionLabel}
        questionPrompt={item.questionPrompt}
        rowLabel={item.rowLabel}
        sectionTitle={item.sectionTitle}
      />
      <FlagBadge flag={item.flag} />
    </View>
  );
}

export function getObserveResultsTitle(): string {
  return withFlagGlyph('dont_know', t('assessment.results.observe.title'));
}

function ResultItemText({
  optionLabel,
  questionPrompt,
  rowLabel,
  sectionTitle,
}: {
  optionLabel: string;
  questionPrompt: string;
  rowLabel?: string;
  sectionTitle?: string;
}) {
  return (
    <View style={styles.resultTextBlock}>
      {sectionTitle ? <Text style={styles.itemSection}>{sectionTitle}</Text> : null}
      <Text style={styles.itemPrompt}>{questionPrompt}</Text>
      {rowLabel ? <Text style={styles.itemRow}>{rowLabel}</Text> : null}
      <Text style={styles.itemAnswer}>{optionLabel}</Text>
    </View>
  );
}

function WelfareMarker({ welfareLevel }: { welfareLevel: WelfareLevel }) {
  return (
    <View
      accessible
      accessibilityLabel={t(`assessment.welfareLevels.${welfareLevel}`)}
      accessibilityRole="image"
      style={styles.welfareMarker}
    >
      <View
        style={[
          styles.welfareDot,
          {
            backgroundColor: welfareLevelColors[welfareLevel],
          },
        ]}
      />
      <Text style={styles.welfareText}>
        {t(`assessment.welfareLevelShort.${welfareLevel}`)}
      </Text>
    </View>
  );
}

function ConsultPanel({ prominent = false }: { prominent?: boolean }) {
  return (
    <View style={[styles.consultPanel, prominent ? styles.consultPanelProminent : null]}>
      <Text accessibilityRole="header" aria-level={2} style={styles.consultTitle}>
        {t('assessment.results.consult.title')}
      </Text>
      <Text style={styles.consultText}>{t('assessment.consultNote')}</Text>
      <Text style={styles.consultText}>{t('assessment.results.consult.description')}</Text>
    </View>
  );
}

function BackToOverviewButton({ assessmentId }: { assessmentId: number }) {
  return (
    <Pressable
      accessibilityLabel={t('assessment.backToAssessment')}
      accessibilityRole="button"
      onPress={() => navigateUpToAssessmentOverview(assessmentId)}
      style={styles.backButton}
    >
      <Text style={styles.backButtonText}>{t('assessment.backToAssessment')}</Text>
    </Pressable>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatGeneratedAtLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function isShareCancellation(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');

  return /cancel|dismiss/i.test(message);
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
  navigationTitle: {
    color: colors.paper,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
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
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  introPanel: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  introTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  introText: {
    color: colors.slate,
    fontSize: 15,
    lineHeight: 21,
  },
  panel: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  panelDescription: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
  },
  consultPanel: {
    backgroundColor: colors.paper,
    borderColor: colors.lineStrong,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  consultPanelProminent: {
    backgroundColor: colors.help,
    borderColor: colors.spruce,
    borderWidth: 2,
  },
  consultTitle: {
    color: colors.spruceInk,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  consultText: {
    color: colors.slate,
    fontSize: 15,
    lineHeight: 21,
  },
  sharePanel: {
    gap: 8,
  },
  shareButton: {
    alignItems: 'center',
    backgroundColor: colors.spruce,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  shareButtonDisabled: {
    opacity: 0.55,
  },
  shareButtonText: {
    color: colors.paper,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  shareMessage: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  shareError: {
    color: '#8A2C18',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  trendsButton: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.spruce,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  trendsButtonText: {
    color: colors.spruceDark,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  itemList: {
    gap: 10,
  },
  sectionAttentionList: {
    gap: 12,
  },
  sectionAttentionCard: {
    backgroundColor: colors.mintSoft,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  sectionAttentionTitle: {
    color: colors.spruceInk,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  resultItem: {
    alignItems: 'flex-start',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  resultTextBlock: {
    gap: 5,
  },
  itemSection: {
    color: colors.spruceDark,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  itemPrompt: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  itemRow: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  itemAnswer: {
    color: colors.slate,
    fontSize: 14,
    lineHeight: 20,
  },
  welfareMarker: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.mint,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  welfareDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  welfareText: {
    color: colors.spruceInk,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
  },
  reviewedPanel: {
    gap: 12,
    paddingVertical: 4,
  },
  reviewedTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  reviewedDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  reviewedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reviewedChip: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reviewedChipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  notePanel: {
    backgroundColor: colors.mint,
    borderRadius: 8,
    padding: 14,
  },
  noteText: {
    color: colors.spruceInk,
    fontSize: 15,
    lineHeight: 21,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.spruce,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  backButtonText: {
    color: colors.paper,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
});
