import { getLocales } from 'expo-localization';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SectionHeader } from '../components/SectionHeader';
import { psittawelContentPack } from '../content/psittawel';
import {
  createDraftAssessment,
  createFollowUpAssessment,
  deleteAssessment,
  getLatestCompletedAssessment,
  listAssessments,
  type AssessmentSummary,
} from '../lib/assessments';
import { getSchemaVersion } from '../lib/db';
import { t } from '../lib/i18n';
import { colors } from '../lib/theme';

type DatabaseState =
  | { status: 'opening' }
  | { status: 'ready' }
  | { status: 'unavailable' };

export default function HomeScreen() {
  const [databaseState, setDatabaseState] = useState<DatabaseState>({ status: 'opening' });
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [latestCompletedAssessment, setLatestCompletedAssessment] =
    useState<AssessmentSummary | null>(null);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(getDeviceLocale(), {
        dateStyle: 'medium',
      }),
    [],
  );

  const refreshAssessments = useCallback(() => {
    setAssessments(listAssessments());
    setLatestCompletedAssessment(getLatestCompletedAssessment());
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      Promise.resolve().then(() => {
        if (!isMounted) {
          return;
        }

        try {
          getSchemaVersion();
          refreshAssessments();
          setDatabaseState({ status: 'ready' });
        } catch {
          setAssessments([]);
          setLatestCompletedAssessment(null);
          setDatabaseState({ status: 'unavailable' });
        }
      });

      return () => {
        isMounted = false;
      };
    }, [refreshAssessments]),
  );

  const primaryCtaLabel =
    latestCompletedAssessment === null
      ? t('home.startAssessment')
      : getFollowUpCtaLabel(latestCompletedAssessment.parrotName);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          assessments.length === 0 ? styles.contentCentered : null,
        ]}
      >
        <SectionHeader description={t('home.description')} title={t('home.title')} />
        {databaseState.status === 'unavailable' ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Text style={styles.errorText}>{t('home.databaseUnavailable')}</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityLabel={primaryCtaLabel}
          accessibilityRole="button"
          disabled={databaseState.status !== 'ready'}
          onPress={() =>
            startPrimaryAssessment(latestCompletedAssessment, setDatabaseState)
          }
          style={[
            styles.startButton,
            databaseState.status !== 'ready' ? styles.startButtonDisabled : null,
          ]}
        >
          <Text style={styles.startButtonText}>{primaryCtaLabel}</Text>
        </Pressable>
        {latestCompletedAssessment !== null ? (
          <Pressable
            accessibilityLabel={t('home.startDifferentParrot')}
            accessibilityRole="button"
            disabled={databaseState.status !== 'ready'}
            onPress={() => startDraftAssessment(setDatabaseState)}
            style={[
              styles.secondaryButton,
              databaseState.status !== 'ready' ? styles.secondaryButtonDisabled : null,
            ]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                databaseState.status !== 'ready' ? styles.secondaryButtonTextDisabled : null,
              ]}
            >
              {t('home.startDifferentParrot')}
            </Text>
          </Pressable>
        ) : null}
        {assessments.length > 0 ? (
          <View style={styles.assessmentList}>
            <Text accessibilityRole="header" style={styles.assessmentListTitle}>
              {t('home.savedAssessments')}
            </Text>
            {assessments.map((assessment) => (
              <AssessmentRow
                assessment={assessment}
                dateFormatter={dateFormatter}
                key={assessment.id}
                onDeleted={refreshAssessments}
                onUnavailable={() => setDatabaseState({ status: 'unavailable' })}
              />
            ))}
          </View>
        ) : null}
        <Pressable
          accessibilityLabel={t('about.homeLinkAccessibility')}
          accessibilityRole="button"
          onPress={() => router.push('/about')}
          style={styles.aboutLink}
        >
          <Text style={styles.aboutLinkText}>{t('about.linkLabel')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function startPrimaryAssessment(
  latestCompletedAssessment: AssessmentSummary | null,
  setDatabaseState: (state: DatabaseState) => void,
) {
  if (latestCompletedAssessment === null) {
    startDraftAssessment(setDatabaseState);
    return;
  }

  try {
    const assessmentId = createFollowUpAssessment(
      latestCompletedAssessment.id,
      psittawelContentPack.sections,
    );

    navigateToAssessment(assessmentId);
  } catch {
    setDatabaseState({ status: 'unavailable' });
  }
}

function startDraftAssessment(setDatabaseState: (state: DatabaseState) => void) {
  try {
    const assessmentId = createDraftAssessment(psittawelContentPack.instrument_version);

    navigateToAssessment(assessmentId);
  } catch {
    setDatabaseState({ status: 'unavailable' });
  }
}

function navigateToAssessment(assessmentId: number) {
  router.push({
    pathname: '/assessment/[id]',
    params: { id: String(assessmentId) },
  });
}

export function getFollowUpCtaLabel(parrotName: string | null) {
  return parrotName
    ? t('home.startNextCheckNamed', { name: parrotName })
    : t('home.startNextCheckUnnamed');
}

type AssessmentRowProps = {
  assessment: AssessmentSummary;
  dateFormatter: Intl.DateTimeFormat;
  onDeleted: () => void;
  onUnavailable: () => void;
};

export function AssessmentRow({
  assessment,
  dateFormatter,
  onDeleted,
  onUnavailable,
}: AssessmentRowProps) {
  const name = assessment.parrotName ?? t('home.unnamedAssessment');
  const status = t(`home.assessmentStatus.${assessment.status}`);
  const startedDate = dateFormatter.format(parseSqliteTimestamp(assessment.startedAt));

  function handleDelete() {
    Alert.alert(getDeleteTitle(assessment), getDeleteMessage(assessment, name), [
      {
        text: t('home.deleteConfirmCancel'),
        style: 'cancel',
      },
      {
        text: t('home.deleteConfirmDelete'),
        style: 'destructive',
        onPress() {
          try {
            deleteAssessment(assessment.id);
            onDeleted();
          } catch {
            onUnavailable();
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.assessmentRow}>
      <Pressable
        accessibilityLabel={t('home.assessmentRowAccessibility', {
          name,
          status,
          date: startedDate,
        })}
        accessibilityRole="button"
        onPress={() => navigateToAssessment(assessment.id)}
        style={styles.assessmentRowOpenButton}
      >
        <View style={styles.assessmentRowText}>
          <Text numberOfLines={2} style={styles.assessmentName}>
            {name}
          </Text>
          <Text style={styles.assessmentDate}>
            {t('home.startedDate', { date: startedDate })}
          </Text>
        </View>
        <Text style={styles.assessmentStatus}>{status}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={t('home.deleteAssessmentAccessibility', {
          name,
          status,
        })}
        accessibilityRole="button"
        onPress={handleDelete}
        style={styles.deleteButton}
      >
        <Text style={styles.deleteButtonText}>{t('home.deleteAssessment')}</Text>
      </Pressable>
    </View>
  );
}

function getDeleteTitle(assessment: AssessmentSummary) {
  return assessment.status === 'completed'
    ? t('home.deleteCompletedTitle')
    : t('home.deleteDraftTitle');
}

function getDeleteMessage(assessment: AssessmentSummary, name: string) {
  if (assessment.status !== 'completed') {
    return t('home.deleteDraftMessage');
  }

  return assessment.parrotName
    ? t('home.deleteCompletedMessageNamed', { name })
    : t('home.deleteCompletedMessageUnnamed');
}

function getDeviceLocale() {
  const [locale] = getLocales();

  return locale?.languageTag ?? locale?.languageCode ?? undefined;
}

function parseSqliteTimestamp(value: string) {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.mintSoft,
  },
  content: {
    flexGrow: 1,
    gap: 20,
    padding: 20,
  },
  contentCentered: {
    justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: '#FBE7E1',
    borderColor: '#E7B3A6',
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  startButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.spruce,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
  },
  startButtonDisabled: {
    backgroundColor: '#7A8C85',
  },
  startButtonText: {
    color: colors.paper,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: colors.spruce,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonDisabled: {
    borderColor: colors.lineStrong,
  },
  secondaryButtonText: {
    color: colors.spruceDark,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  secondaryButtonTextDisabled: {
    color: colors.textMuted,
  },
  assessmentList: {
    gap: 10,
  },
  assessmentListTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  assessmentRow: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 68,
    padding: 10,
  },
  assessmentRowOpenButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    minWidth: 0,
  },
  assessmentRowText: {
    flex: 1,
    flexShrink: 1,
    gap: 3,
  },
  assessmentName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  assessmentDate: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  assessmentStatus: {
    color: colors.spruceDark,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  deleteButton: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: colors.dangerBorder,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 10,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  aboutLink: {
    alignSelf: 'center',
    borderColor: colors.lineStrong,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  aboutLinkText: {
    color: colors.spruceDark,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
});
