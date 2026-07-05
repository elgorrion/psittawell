import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
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

import { FlagBadges, welfareLevelColors } from '../../../components/questions/Badges';
import { psittawelContentPack } from '../../../content/psittawel';
import type { OptionFlag, WelfareLevel } from '../../../content/schema';
import {
  getAnswers,
  getAssessment,
  listCompletedAssessmentsForParrot,
  mapAnswersByQuestion,
  parrotNameQuestionId,
} from '../../../lib/assessments';
import { getAppLocale, t } from '../../../lib/i18n';
import { buildAssessmentResults } from '../../../lib/results';
import {
  buildParrotTimeline,
  buildParrotTimelineDateLabels,
  type ParrotTimeline,
  type ParrotTimelineEntry,
  type ParrotTimelineIndicator,
} from '../../../lib/trends';
import { colors } from '../../../lib/theme';
import { AssessmentHeaderUpButton, navigateUpToAssessmentOverview } from '../../../components/AssessmentNavigation';

type TrendsState =
  | { status: 'loading' }
  | {
      status: 'ready';
      parrotName: string;
      timeline: ParrotTimeline;
    }
  | { status: 'unavailable' };

type IndicatorGroup = {
  sectionId: string;
  sectionTitle: string;
  indicators: ParrotTimelineIndicator[];
};

const dateCellWidth = 136;
const indicatorCellWidth = 220;

const headerTitle = ({ children, tintColor }: { children: string; tintColor?: ColorValue }) => (
  <Text numberOfLines={1} style={[styles.navigationTitle, tintColor ? { color: tintColor } : null]}>
    {children}
  </Text>
);

export default function AssessmentTrendsScreen() {
  const params = useLocalSearchParams();
  const assessmentId = Number(firstParam(params.id));
  const [trendsState, setTrendsState] = useState<TrendsState>({ status: 'loading' });

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      Promise.resolve().then(() => {
        if (!isMounted) {
          return;
        }

        if (!Number.isFinite(assessmentId)) {
          setTrendsState({ status: 'unavailable' });
          return;
        }

        try {
          const assessment = getAssessment(assessmentId);

          if (!assessment || assessment.status !== 'completed') {
            setTrendsState({ status: 'unavailable' });
            return;
          }

          const currentAnswers = getAnswers(assessmentId);
          const answersByQuestion = mapAnswersByQuestion(currentAnswers);
          const parrotName = (answersByQuestion[parrotNameQuestionId]?.freeText ?? '').trim();
          const lineageAssessments = listCompletedAssessmentsForParrot(assessment.parrotId);
          const resultsByAssessmentId = Object.fromEntries(
            lineageAssessments.map((lineageAssessment) => [
              lineageAssessment.id,
              buildAssessmentResults(
                psittawelContentPack.sections,
                getAnswers(lineageAssessment.id),
              ),
            ]),
          );

          setTrendsState({
            status: 'ready',
            parrotName,
            timeline: buildParrotTimeline(lineageAssessments, resultsByAssessmentId),
          });
        } catch {
          setTrendsState({ status: 'unavailable' });
        }
      });

      return () => {
        isMounted = false;
      };
    }, [assessmentId]),
  );

  if (trendsState.status !== 'ready') {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
        <Stack.Screen
          options={{
            title: t('assessment.trends.headerTitle'),
            headerTitle,
            headerLeft: ({ tintColor }: { tintColor?: ColorValue }) => (
              <AssessmentHeaderUpButton assessmentId={assessmentId} tintColor={tintColor} />
            ),
          }}
        />
        <View style={styles.emptyState}>
          <Text accessibilityRole="header" aria-level={1} style={styles.emptyTitle}>
            {t('assessment.trends.unavailableTitle')}
          </Text>
          <Text style={styles.statusText}>
            {trendsState.status === 'loading'
              ? t('assessment.trends.loading')
              : t('assessment.trends.unavailable')}
          </Text>
          {Number.isFinite(assessmentId) ? <BackToOverviewButton assessmentId={assessmentId} /> : null}
        </View>
      </SafeAreaView>
    );
  }

  const { parrotName, timeline } = trendsState;
  const title =
    parrotName.length > 0
      ? t('assessment.trends.namedTitle', { name: parrotName })
      : t('assessment.trends.title');
  const groups = groupIndicatorsBySection(timeline.indicators);
  const dateLabels = buildParrotTimelineDateLabels(timeline.dates, getAppLocale());

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          title: t('assessment.trends.headerTitle'),
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
          <Text style={styles.introText}>{t('assessment.trends.description')}</Text>
        </View>

        <View style={styles.consultPanel}>
          <Text accessibilityRole="header" aria-level={2} style={styles.consultTitle}>
            {t('assessment.results.consult.title')}
          </Text>
          <Text style={styles.consultText}>{t('assessment.consultNote')}</Text>
          <Text style={styles.consultText}>{t('assessment.trends.consultDescription')}</Text>
        </View>

        {timeline.dates.length < 2 || timeline.indicators.length === 0 ? (
          <View style={styles.panel}>
            <Text accessibilityRole="header" aria-level={2} style={styles.panelTitle}>
              {t('assessment.trends.emptyTitle')}
            </Text>
            <Text style={styles.panelDescription}>
              {t('assessment.trends.emptyDescription')}
            </Text>
          </View>
        ) : (
          <View style={styles.groupList}>
            {groups.map((group) => (
              <View key={group.sectionId} style={styles.panel}>
                <Text accessibilityRole="header" aria-level={2} style={styles.panelTitle}>
                  {group.sectionTitle}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View
                    style={[
                      styles.timelineTable,
                      {
                        width: indicatorCellWidth + dateCellWidth * timeline.dates.length,
                      },
                    ]}
                  >
                    <View style={styles.timelineHeaderRow}>
                      <View style={[styles.timelineHeaderCell, styles.indicatorHeaderCell]}>
                        <Text style={styles.timelineHeaderText}>
                          {t('assessment.trends.indicatorColumn')}
                        </Text>
                      </View>
                      {timeline.dates.map((date, index) => (
                        <View key={date.assessmentId} style={styles.timelineHeaderCell}>
                          <Text style={styles.timelineHeaderText}>
                            {dateLabels[index]?.label ?? ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {group.indicators.map((indicator) => (
                      <View key={indicator.indicatorId} style={styles.timelineRow}>
                        <View style={styles.indicatorCell}>
                          <Text style={styles.indicatorPrompt}>{indicator.questionPrompt}</Text>
                          {indicator.rowLabel ? (
                            <Text style={styles.indicatorRowLabel}>{indicator.rowLabel}</Text>
                          ) : null}
                        </View>
                        {indicator.entries.map((entry) => (
                          <TrendCell entry={entry} key={entry.assessmentId} />
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ))}
          </View>
        )}

        <BackToOverviewButton assessmentId={assessmentId} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TrendCell({ entry }: { entry: ParrotTimelineEntry }) {
  const welfareLevel =
    entry.state === 'welfare_level' || entry.state === 'flag' ? entry.welfareLevel : null;

  return (
    <View
      accessible
      accessibilityLabel={getEntryAccessibilityLabel(entry)}
      style={[
        styles.timelineCell,
        welfareLevel ? { backgroundColor: welfareLevelFills[welfareLevel] } : null,
      ]}
    >
      {entry.state === 'welfare_level' ? (
        <>
          <WelfareMarker welfareLevel={entry.welfareLevel} />
          <Text numberOfLines={3} style={styles.cellOptionText}>
            {entry.optionLabel}
          </Text>
        </>
      ) : null}
      {entry.state === 'flag' ? (
        <>
          {entry.welfareLevel ? <WelfareMarker welfareLevel={entry.welfareLevel} /> : null}
          <FlagBadges flags={entry.flags} />
          <Text numberOfLines={3} style={styles.cellOptionText}>
            {entry.optionLabel}
          </Text>
        </>
      ) : null}
      {entry.state === 'not_flagged' ? (
        <>
          <Text style={styles.emptyCellText}>{t('assessment.trends.notFlagged')}</Text>
          {entry.optionLabel ? (
            <Text numberOfLines={3} style={styles.cellOptionText}>
              {entry.optionLabel}
            </Text>
          ) : null}
        </>
      ) : null}
      {entry.state === 'not_answered' ? (
        <Text style={styles.emptyCellText}>{t('assessment.trends.notAnswered')}</Text>
      ) : null}
    </View>
  );
}

function WelfareMarker({ welfareLevel }: { welfareLevel: WelfareLevel }) {
  return (
    <View style={styles.welfareMarker}>
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

function groupIndicatorsBySection(indicators: readonly ParrotTimelineIndicator[]): IndicatorGroup[] {
  const groups: IndicatorGroup[] = [];

  for (const indicator of indicators) {
    let group = groups.find((candidate) => candidate.sectionId === indicator.sectionId);

    if (!group) {
      group = {
        sectionId: indicator.sectionId,
        sectionTitle: indicator.sectionTitle,
        indicators: [],
      };
      groups.push(group);
    }

    group.indicators.push(indicator);
  }

  return groups;
}

function getEntryAccessibilityLabel(entry: ParrotTimelineEntry): string {
  if (entry.state === 'not_answered') {
    return t('assessment.trends.notAnswered');
  }

  if (entry.state === 'not_flagged') {
    return entry.optionLabel
      ? t('assessment.trends.cellAccessibilityWithAnswer', {
          state: t('assessment.trends.notFlagged'),
          answer: entry.optionLabel,
        })
      : t('assessment.trends.notFlagged');
  }

  const state =
    entry.state === 'welfare_level' && entry.welfareLevel
      ? t(`assessment.welfareLevels.${entry.welfareLevel}`)
      : flagsToAccessibilityText(entry.flags);

  return t('assessment.trends.cellAccessibilityWithAnswer', {
    state,
    answer: entry.optionLabel,
  });
}

function flagsToAccessibilityText(flags: readonly OptionFlag[]): string {
  return flags.map((flag) => t(`assessment.flags.${flag}.accessibilityLabel`)).join(', ');
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const welfareLevelFills: Record<WelfareLevel, string> = {
  optimal: '#E6F4ED',
  good: '#EEF6E8',
  moderate: '#FFF4D8',
  elevated_risk: '#FBE7D4',
  high_risk: '#FBE1DB',
};

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
  consultPanel: {
    backgroundColor: colors.paper,
    borderColor: colors.lineStrong,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
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
  groupList: {
    gap: 14,
  },
  timelineTable: {
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  timelineHeaderRow: {
    backgroundColor: colors.mint,
    flexDirection: 'row',
  },
  timelineHeaderCell: {
    borderColor: colors.line,
    borderRightWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    padding: 10,
    width: dateCellWidth,
  },
  indicatorHeaderCell: {
    width: indicatorCellWidth,
  },
  timelineHeaderText: {
    color: colors.spruceInk,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  timelineRow: {
    borderColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  indicatorCell: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRightWidth: 1,
    gap: 5,
    minHeight: 116,
    padding: 12,
    width: indicatorCellWidth,
  },
  indicatorPrompt: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  indicatorRowLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  timelineCell: {
    borderColor: colors.line,
    borderRightWidth: 1,
    gap: 7,
    justifyContent: 'center',
    minHeight: 116,
    padding: 10,
    width: dateCellWidth,
  },
  welfareMarker: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  cellOptionText: {
    color: colors.slate,
    fontSize: 12,
    lineHeight: 17,
  },
  emptyCellText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
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
